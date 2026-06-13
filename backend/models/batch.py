from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, BigInteger
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class Batch(Base):
    __tablename__ = "ocr_batches"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    batch_uuid = Column(String(100), unique=True, index=True)
    total_files = Column(Integer, default=0)
    completed_files = Column(Integer, default=0)
    failed_files = Column(Integer, default=0)
    pending_files = Column(Integer, default=0)
    processing_files = Column(Integer, default=0)
    status = Column(String(30), default="PENDING")  # PENDING, PROCESSING, COMPLETED, FAILED, PARTIAL SUCCESS
    created_by = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    jobs = relationship("Job", back_populates="batch", cascade="all, delete-orphan")


class Job(Base):
    __tablename__ = "ocr_jobs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    batch_id = Column(BigInteger, ForeignKey("ocr_batches.id"))
    file_name = Column(String(500))
    file_path = Column(Text)
    status = Column(String(30), default="PENDING")  # PENDING, PROCESSING, COMPLETED, FAILED
    retry_count = Column(Integer, default=0)
    processing_started_at = Column(DateTime, nullable=True)
    processing_completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    celery_task_id = Column(String(255), nullable=True)
    ocr_result = Column(JSON, nullable=True)
    plain_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    batch = relationship("Batch", back_populates="jobs")
