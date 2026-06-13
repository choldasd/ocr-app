from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime


# ─── Job Schemas ──────────────────────────────────────────────────────────────

class JobResponse(BaseModel):
    id: int
    batch_id: int
    file_name: str
    status: str
    retry_count: int
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    celery_task_id: Optional[str] = None
    ocr_result: Optional[Any] = None
    plain_text: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Batch Schemas ─────────────────────────────────────────────────────────────

class BatchCreate(BaseModel):
    total_files: int


class BatchResponse(BaseModel):
    id: int
    batch_uuid: str
    total_files: int
    completed_files: int
    failed_files: int
    pending_files: int
    processing_files: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BatchDetailResponse(BatchResponse):
    jobs: List[JobResponse] = []


class BatchListResponse(BaseModel):
    total: int
    batches: List[BatchResponse]


# ─── Analytics Schemas ─────────────────────────────────────────────────────────

class AnalyticsResponse(BaseModel):
    total_batches: int
    total_files_processed: int
    total_files_failed: int
    avg_processing_time_sec: float
    success_rate_percent: float
    failure_rate_percent: float
