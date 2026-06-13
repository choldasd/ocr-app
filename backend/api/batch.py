"""
batch.py  —  /ocr/batches  API router
──────────────────────────────────────
REST endpoints:
  POST   /ocr/batches                          Create a new batch
  POST   /ocr/batches/{batch_uuid}/upload      Upload a chunk of files (≤20)
  GET    /ocr/batches                          List batches (paginated)
  GET    /ocr/batches/analytics                Aggregated stats
  GET    /ocr/batches/{batch_uuid}             Batch detail + jobs
  POST   /ocr/batches/{batch_uuid}/retry       Retry failed jobs
  POST   /ocr/batches/{batch_uuid}/cancel      Cancel pending/processing jobs
  GET    /ocr/batches/{batch_uuid}/export      Export results (json/csv/excel/pdf)

WebSocket:
  WS     /ocr/batches/{batch_uuid}/ws          Real-time progress stream
"""

import os
import uuid
import logging
import asyncio
import json
from pathlib import Path
from datetime import datetime
from typing import List

from fastapi import (
    APIRouter, UploadFile, File, Depends, HTTPException, Query, WebSocket,
    WebSocketDisconnect
)
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..core.database import get_db
from ..core.config import settings
from ..models.batch import Batch, Job
from ..core.celery_app import dispatch_ocr_job
from ..services.export import export_json, export_csv, export_excel, export_pdf
from ..schemas.batch import (
    BatchCreate, BatchResponse, BatchDetailResponse,
    BatchListResponse, AnalyticsResponse, JobResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ocr/batches", tags=["Batch"])

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".webp", ".pdf"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
MAX_CHUNK_SIZE = 20  # files per upload request

# ─── WebSocket connection manager ─────────────────────────────────────────────

class _ConnectionManager:
    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, batch_uuid: str, ws: WebSocket):
        await ws.accept()
        self._connections.setdefault(batch_uuid, []).append(ws)

    def disconnect(self, batch_uuid: str, ws: WebSocket):
        conns = self._connections.get(batch_uuid, [])
        if ws in conns:
            conns.remove(ws)

    async def broadcast(self, batch_uuid: str, data: dict):
        conns = self._connections.get(batch_uuid, [])
        dead = []
        for ws in conns:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(batch_uuid, ws)


_manager = _ConnectionManager()


# ─── Helper ───────────────────────────────────────────────────────────────────

def _batch_progress_payload(batch: Batch) -> dict:
    return {
        "batch_uuid": batch.batch_uuid,
        "status": batch.status,
        "total_files": batch.total_files,
        "completed_files": batch.completed_files,
        "failed_files": batch.failed_files,
        "pending_files": batch.pending_files,
        "processing_files": batch.processing_files,
        "progress": round(
            ((batch.completed_files + batch.failed_files) / max(batch.total_files, 1)) * 100, 1
        ),
    }


async def _push_progress(batch: Batch):
    await _manager.broadcast(batch.batch_uuid, _batch_progress_payload(batch))


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("", response_model=BatchResponse, status_code=201)
def create_batch(payload: BatchCreate, db: Session = Depends(get_db)):
    """Create a new batch record. Returns the batch UUID for subsequent uploads."""
    batch = Batch(
        batch_uuid=str(uuid.uuid4()),
        total_files=payload.total_files,
        pending_files=payload.total_files,
        status="PENDING",
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    logger.info(f"Batch {batch.batch_uuid} created with {batch.total_files} files.")
    return batch


@router.post("/{batch_uuid}/upload")
async def upload_chunk(
    batch_uuid: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a chunk of files (up to 20) for the given batch.
    Saves files to disk, creates Job records, and dispatches OCR tasks.
    """
    if len(files) > MAX_CHUNK_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_CHUNK_SIZE} files per chunk upload."
        )

    batch = db.query(Batch).filter(Batch.batch_uuid == batch_uuid).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found.")
    if batch.status in ("COMPLETED", "FAILED"):
        raise HTTPException(status_code=400, detail="Batch is already finished.")

    dispatched_jobs = []

    for file in files:
        if not file.filename:
            continue
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            logger.warning(f"Skipping unsupported file type: {file.filename}")
            continue

        unique_id = uuid.uuid4().hex[:8]
        safe_filename = f"{unique_id}_{file.filename}"
        upload_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

        try:
            with open(upload_path, "wb") as buf:
                while chunk := await file.read(1024 * 1024):
                    buf.write(chunk)
        except Exception as e:
            logger.error(f"Failed to save {file.filename}: {e}")
            continue

        if os.path.getsize(upload_path) > MAX_FILE_SIZE:
            os.remove(upload_path)
            logger.warning(f"File too large, skipped: {file.filename}")
            continue

        job = Job(
            batch_id=batch.id,
            file_name=file.filename,
            file_path=upload_path,
            status="PENDING",
            retry_count=0,
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        task_id = dispatch_ocr_job(job.id)
        job.celery_task_id = task_id
        db.commit()

        dispatched_jobs.append({"job_id": job.id, "file_name": file.filename, "task_id": task_id})

    await _push_progress(batch)

    return {
        "batch_uuid": batch_uuid,
        "chunk_size": len(dispatched_jobs),
        "dispatched_jobs": dispatched_jobs,
    }


@router.get("", response_model=BatchListResponse)
def list_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Paginated list of all batches, newest first."""
    total = db.query(Batch).count()
    batches = db.query(Batch).order_by(Batch.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "batches": batches}


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db)):
    """Aggregate stats across all batches."""
    total_batches = db.query(Batch).count()
    total_completed = db.query(func.coalesce(func.sum(Batch.completed_files), 0)).scalar() or 0
    total_failed = db.query(func.coalesce(func.sum(Batch.failed_files), 0)).scalar() or 0
    total_files = total_completed + total_failed

    # Avg processing time from jobs
    from ..models.batch import Job
    completed_jobs = db.query(Job).filter(
        Job.status == "COMPLETED",
        Job.processing_started_at.isnot(None),
        Job.processing_completed_at.isnot(None),
    ).all()

    if completed_jobs:
        durations = [
            (j.processing_completed_at - j.processing_started_at).total_seconds()
            for j in completed_jobs
        ]
        avg_time = sum(durations) / len(durations)
    else:
        avg_time = 0.0

    success_rate = round((total_completed / total_files * 100) if total_files > 0 else 0.0, 1)
    failure_rate = round((total_failed / total_files * 100) if total_files > 0 else 0.0, 1)

    return {
        "total_batches": total_batches,
        "total_files_processed": total_completed,
        "total_files_failed": total_failed,
        "avg_processing_time_sec": round(avg_time, 2),
        "success_rate_percent": success_rate,
        "failure_rate_percent": failure_rate,
    }


@router.get("/{batch_uuid}", response_model=BatchDetailResponse)
def get_batch(batch_uuid: str, db: Session = Depends(get_db)):
    """Get batch detail including all job statuses."""
    batch = db.query(Batch).filter(Batch.batch_uuid == batch_uuid).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found.")
    return batch


@router.post("/{batch_uuid}/retry")
async def retry_failed_jobs(batch_uuid: str, db: Session = Depends(get_db)):
    """Re-queue all FAILED jobs in the batch."""
    batch = db.query(Batch).filter(Batch.batch_uuid == batch_uuid).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found.")

    failed_jobs = [j for j in batch.jobs if j.status == "FAILED"]
    if not failed_jobs:
        return {"message": "No failed jobs to retry.", "retried": 0}

    retried = 0
    for job in failed_jobs:
        job.status = "PENDING"
        job.retry_count = (job.retry_count or 0) + 1
        job.error_message = None
        job.processing_started_at = None
        job.processing_completed_at = None
        db.commit()
        task_id = dispatch_ocr_job(job.id)
        job.celery_task_id = task_id
        batch.pending_files = (batch.pending_files or 0) + 1
        batch.failed_files = max(0, (batch.failed_files or 0) - 1)
        db.commit()
        retried += 1

    batch.status = "PROCESSING"
    db.commit()
    await _push_progress(batch)

    return {"message": f"Retrying {retried} failed jobs.", "retried": retried}


@router.post("/{batch_uuid}/cancel")
async def cancel_batch(batch_uuid: str, db: Session = Depends(get_db)):
    """Cancel all pending and processing jobs in the batch."""
    batch = db.query(Batch).filter(Batch.batch_uuid == batch_uuid).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found.")
    if batch.status in ("COMPLETED", "FAILED"):
        raise HTTPException(status_code=400, detail="Batch is already finished.")

    cancelled = 0
    for job in batch.jobs:
        if job.status in ("PENDING", "PROCESSING"):
            # Revoke Celery task if possible
            if job.celery_task_id and job.celery_task_id != "threadpool":
                try:
                    from ..core.celery_app import celery_app
                    if celery_app:
                        celery_app.control.revoke(job.celery_task_id, terminate=True)
                except Exception:
                    pass
            job.status = "FAILED"
            job.error_message = "Cancelled by user."
            batch.failed_files = (batch.failed_files or 0) + 1
            if job.status == "PROCESSING":
                batch.processing_files = max(0, (batch.processing_files or 0) - 1)
            else:
                batch.pending_files = max(0, (batch.pending_files or 0) - 1)
            cancelled += 1

    batch.status = "FAILED"
    db.commit()
    await _push_progress(batch)

    return {"message": f"Cancelled {cancelled} jobs.", "cancelled": cancelled}


@router.get("/{batch_uuid}/export")
def export_batch(
    batch_uuid: str,
    format: str = Query("json", regex="^(json|csv|excel|pdf)$"),
    db: Session = Depends(get_db),
):
    """Download batch OCR results in json / csv / excel / pdf format."""
    batch = db.query(Batch).filter(Batch.batch_uuid == batch_uuid).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found.")

    jobs = batch.jobs

    if format == "json":
        content = export_json(batch, jobs)
        return Response(
            content=content,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="batch_{batch_uuid}.json"'},
        )
    elif format == "csv":
        content = export_csv(batch, jobs)
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="batch_{batch_uuid}.csv"'},
        )
    elif format == "excel":
        content = export_excel(batch, jobs)
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="batch_{batch_uuid}.xlsx"'},
        )
    elif format == "pdf":
        content = export_pdf(batch, jobs)
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="batch_{batch_uuid}.pdf"'},
        )


# ─── WebSocket ────────────────────────────────────────────────────────────────

@router.websocket("/{batch_uuid}/ws")
async def batch_progress_ws(batch_uuid: str, websocket: WebSocket, db: Session = Depends(get_db)):
    """
    Real-time progress WebSocket.
    Sends a progress event immediately on connect, then on every update broadcast.
    Also polls every 5 seconds as a fallback heartbeat.
    """
    batch = db.query(Batch).filter(Batch.batch_uuid == batch_uuid).first()
    if not batch:
        await websocket.close(code=4004)
        return

    await _manager.connect(batch_uuid, websocket)
    try:
        # Send current state on connect
        await websocket.send_text(json.dumps(_batch_progress_payload(batch)))

        # Keep connection alive with 5-second polling heartbeat
        while True:
            await asyncio.sleep(5)
            db.refresh(batch)
            await websocket.send_text(json.dumps(_batch_progress_payload(batch)))
            if batch.status in ("COMPLETED", "FAILED", "PARTIAL SUCCESS"):
                break

    except WebSocketDisconnect:
        pass
    finally:
        _manager.disconnect(batch_uuid, websocket)
