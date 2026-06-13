"""
celery_app.py
─────────────
Celery configuration with an in-process ThreadPool fallback.

How it works
────────────
• On startup we try to ping Redis. If it responds we configure a real Celery
  app and all batch jobs are dispatched to it.
• If Redis is unavailable (no Redis installed yet) we fall back to a simple
  concurrent.futures.ThreadPoolExecutor that runs the same OCR logic inside
  the FastAPI process. This lets the API remain fully functional without any
  external services.

The public API consumed by the rest of the codebase is:
    dispatch_ocr_job(job_id: int) -> str | AsyncResult
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ─── try to connect to Redis ──────────────────────────────────────────────────

REDIS_URL = "redis://localhost:6379/0"
_redis_available = False

try:
    import redis as _redis_lib
    _r = _redis_lib.Redis.from_url(REDIS_URL, socket_connect_timeout=1)
    _r.ping()
    _redis_available = True
    logger.info("Redis is available — using Celery task queue.")
except Exception:
    logger.warning(
        "Redis is NOT available — falling back to in-process ThreadPool worker."
    )

# ─── Celery setup (only when Redis is alive) ──────────────────────────────────

celery_app: Optional[object] = None

if _redis_available:
    from celery import Celery

    celery_app = Celery(
        "ocr_tasks",
        broker=REDIS_URL,
        backend=REDIS_URL,
    )
    celery_app.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        task_acks_late=True,
        worker_prefetch_multiplier=1,
        task_max_retries=3,
        task_default_retry_delay=60,
    )

# ─── In-process fallback worker ───────────────────────────────────────────────

import concurrent.futures as _cf

_thread_pool = _cf.ThreadPoolExecutor(max_workers=4, thread_name_prefix="ocr-worker")


# ─── Shared OCR job logic (runs in either mode) ───────────────────────────────

def _run_ocr_job(job_id: int) -> None:
    """
    Core processing logic.  Runs inside a Celery worker or a thread-pool thread.
    Opens its own DB session (safe to call from any thread/process).
    """
    import gc
    import shutil
    from datetime import datetime
    from pathlib import Path
    from sqlalchemy.orm import Session

    from .database import SessionLocal
    from ..models.batch import Job, Batch
    from ..services.ocr import get_ocr_service
    from ..services.pdf import PDFService
    from .config import settings

    db: Session = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found.")
            return

        # Mark as processing
        job.status = "PROCESSING"
        job.processing_started_at = datetime.utcnow()
        job.retry_count = (job.retry_count or 0)
        db.commit()

        # Update batch counter
        batch = db.query(Batch).filter(Batch.id == job.batch_id).first()
        if batch:
            batch.processing_files = (batch.processing_files or 0) + 1
            batch.pending_files = max(0, (batch.pending_files or 0) - 1)
            if batch.status == "PENDING":
                batch.status = "PROCESSING"
            db.commit()

        # ── Run OCR ──────────────────────────────────────────────────────────
        file_path = job.file_path
        ext = Path(file_path).suffix.lower()
        ocr_service = get_ocr_service(languages=settings.OCR_LANGUAGES)
        pages_result = []

        try:
            if ext == ".pdf":
                unique_id = f"job{job_id}"
                image_paths = PDFService.extract_images_from_pdf(
                    pdf_path=file_path,
                    output_dir=settings.PROCESSED_DIR,
                    base_filename=unique_id,
                )
                for idx, img_path in enumerate(image_paths):
                    result = ocr_service.extract_text(img_path)
                    pages_result.append({
                        "page": idx + 1,
                        "text": result["text"],
                        "confidence": result["confidence"],
                        "engine": result["engine"],
                    })
                    gc.collect()
            else:
                processed_path = file_path.replace(
                    settings.UPLOAD_DIR, settings.PROCESSED_DIR
                )
                shutil.copy2(file_path, processed_path)
                result = ocr_service.extract_text(processed_path)
                pages_result.append({
                    "page": 1,
                    "text": result["text"],
                    "confidence": result["confidence"],
                    "engine": result["engine"],
                })

            plain_text = "\n\n".join(p["text"] for p in pages_result)
            ocr_result_json = {
                "pages": pages_result,
                "metadata": {
                    "language": settings.OCR_LANGUAGES,
                    "total_pages": len(pages_result),
                },
            }

            job.status = "COMPLETED"
            job.ocr_result = ocr_result_json
            job.plain_text = plain_text
            job.processing_completed_at = datetime.utcnow()

            if batch:
                batch.completed_files = (batch.completed_files or 0) + 1
                batch.processing_files = max(0, (batch.processing_files or 0) - 1)

        except Exception as exc:
            logger.error(f"OCR failed for job {job_id}: {exc}")
            job.status = "FAILED"
            job.error_message = str(exc)
            job.processing_completed_at = datetime.utcnow()
            if batch:
                batch.failed_files = (batch.failed_files or 0) + 1
                batch.processing_files = max(0, (batch.processing_files or 0) - 1)

        db.commit()

        # ── Update batch overall status ───────────────────────────────────────
        if batch:
            db.refresh(batch)
            total_done = (batch.completed_files or 0) + (batch.failed_files or 0)
            if total_done >= (batch.total_files or 1):
                if batch.failed_files == 0:
                    batch.status = "COMPLETED"
                elif batch.completed_files == 0:
                    batch.status = "FAILED"
                else:
                    batch.status = "PARTIAL SUCCESS"
            db.commit()

    finally:
        db.close()
        gc.collect()


# ─── Celery task wrapper ───────────────────────────────────────────────────────

if _redis_available and celery_app:
    @celery_app.task(
        bind=True,
        max_retries=3,
        default_retry_delay=60,
        name="ocr_tasks.process_ocr_job",
    )
    def process_ocr_job_task(self, job_id: int):
        try:
            _run_ocr_job(job_id)
        except Exception as exc:
            raise self.retry(exc=exc)


# ─── Public dispatch function ─────────────────────────────────────────────────

def dispatch_ocr_job(job_id: int) -> str:
    """
    Dispatch a job to either Celery or the in-process thread pool.
    Returns a string task_id for tracking (or 'threadpool' as a sentinel).
    """
    if _redis_available and celery_app:
        result = process_ocr_job_task.delay(job_id)
        return result.id
    else:
        _thread_pool.submit(_run_ocr_job, job_id)
        return "threadpool"
