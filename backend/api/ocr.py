import os
import gc
import time
import uuid
import shutil
import logging
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.config import settings
from ..models.document import Document, Page, OCRResult
from ..services.ocr import get_ocr_service
from ..services.pdf import PDFService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ocr", tags=["OCR"])

ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".webp"}
ALLOWED_PDF_EXTENSIONS = {".pdf"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_PDF_EXTENSIONS
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("/extract")
async def extract_text(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload an image or PDF and extract text using OCR.
    Processing is sequential to limit memory usage.
    """
    start_time = time.time()

    # --- Validate file ---
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Supported: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # --- Save uploaded file ---
    unique_id = uuid.uuid4().hex[:8]
    safe_filename = f"{unique_id}_{file.filename}"
    upload_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

    try:
        with open(upload_path, "wb") as buffer:
            # Read in chunks to avoid loading entire file into RAM
            while chunk := await file.read(1024 * 1024):  # 1 MB chunks
                buffer.write(chunk)
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.")

    file_size = os.path.getsize(upload_path)
    if file_size > MAX_FILE_SIZE:
        os.remove(upload_path)
        raise HTTPException(status_code=400, detail=f"File too large. Max size is {MAX_FILE_SIZE // (1024*1024)} MB.")

    # --- Create Document record ---
    doc = Document(
        filename=file.filename,
        file_type=ext.replace(".", ""),
        status="processing",
        total_pages=0,
        processing_time_ms=0
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # --- Get OCR service (singleton) ---
    ocr_service = get_ocr_service(languages=settings.OCR_LANGUAGES)

    pages_result = []

    try:
        if ext in ALLOWED_PDF_EXTENSIONS:
            # --- PDF: sequential page-by-page processing ---
            logger.info(f"Processing PDF: {file.filename}")
            image_paths = PDFService.extract_images_from_pdf(
                pdf_path=upload_path,
                output_dir=settings.PROCESSED_DIR,
                base_filename=unique_id
            )
            doc.total_pages = len(image_paths)

            for idx, img_path in enumerate(image_paths):
                page_num = idx + 1
                logger.info(f"OCR on page {page_num}/{len(image_paths)}")

                # Create Page record
                page = Page(
                    document_id=doc.id,
                    page_number=page_num,
                    image_path=img_path
                )
                db.add(page)
                db.commit()
                db.refresh(page)

                # Run OCR sequentially
                result = ocr_service.extract_text(img_path)

                # Store result
                ocr_result = OCRResult(
                    page_id=page.id,
                    text_content=result["text"],
                    confidence=result["confidence"],
                    language=settings.OCR_LANGUAGES,
                    engine_used=result["engine"]
                )
                db.add(ocr_result)
                db.commit()

                pages_result.append({
                    "page": page_num,
                    "text": result["text"],
                    "confidence": result["confidence"],
                    "engine": result["engine"]
                })

                # Free memory between pages
                gc.collect()

        else:
            # --- Single image processing ---
            logger.info(f"Processing image: {file.filename}")
            doc.total_pages = 1

            # Copy to processed dir
            processed_path = os.path.join(settings.PROCESSED_DIR, safe_filename)
            shutil.copy2(upload_path, processed_path)

            page = Page(
                document_id=doc.id,
                page_number=1,
                image_path=processed_path
            )
            db.add(page)
            db.commit()
            db.refresh(page)

            result = ocr_service.extract_text(processed_path)

            ocr_result = OCRResult(
                page_id=page.id,
                text_content=result["text"],
                confidence=result["confidence"],
                language=settings.OCR_LANGUAGES,
                engine_used=result["engine"]
            )
            db.add(ocr_result)
            db.commit()

            pages_result.append({
                "page": 1,
                "text": result["text"],
                "confidence": result["confidence"],
                "engine": result["engine"]
            })

        # --- Mark document complete ---
        elapsed = time.time() - start_time
        doc.status = "completed"
        doc.processing_time_ms = round(elapsed * 1000, 2)
        db.commit()

        processing_time_str = f"{elapsed:.1f} sec"

        return {
            "success": True,
            "document_id": doc.id,
            "filename": file.filename,
            "processing_time": processing_time_str,
            "total_pages": doc.total_pages,
            "pages": pages_result
        }

    except Exception as e:
        logger.error(f"OCR processing failed: {e}")
        doc.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@router.get("/documents")
def list_documents(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    """List all processed documents with pagination."""
    documents = db.query(Document).order_by(Document.created_at.desc()).offset(skip).limit(limit).all()
    total = db.query(Document).count()

    return {
        "total": total,
        "documents": [
            {
                "id": d.id,
                "filename": d.filename,
                "file_type": d.file_type,
                "status": d.status,
                "total_pages": d.total_pages,
                "processing_time_ms": d.processing_time_ms,
                "created_at": d.created_at.isoformat() if d.created_at else None
            }
            for d in documents
        ]
    }


@router.get("/documents/{document_id}")
def get_document(document_id: int, db: Session = Depends(get_db)):
    """Get full OCR results for a specific document."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    pages_data = []
    for page in doc.pages:
        results = []
        for r in page.results:
            results.append({
                "text": r.text_content,
                "confidence": r.confidence,
                "language": r.language,
                "engine": r.engine_used
            })
        pages_data.append({
            "page": page.page_number,
            "results": results
        })

    elapsed_sec = (doc.processing_time_ms or 0) / 1000.0

    return {
        "success": True,
        "document_id": doc.id,
        "filename": doc.filename,
        "file_type": doc.file_type,
        "status": doc.status,
        "total_pages": doc.total_pages,
        "processing_time": f"{elapsed_sec:.1f} sec",
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "pages": pages_data
    }
