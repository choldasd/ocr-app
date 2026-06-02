from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class OCRResultBase(BaseModel):
    text_content: str
    confidence: float
    language: str
    engine_used: str

class OCRResultCreate(OCRResultBase):
    pass

class OCRResultResponse(OCRResultBase):
    id: int
    page_id: int

    class Config:
        from_attributes = True

class PageBase(BaseModel):
    page_number: int
    image_path: str

class PageCreate(PageBase):
    pass

class PageResponse(PageBase):
    id: int
    document_id: int
    results: List[OCRResultResponse] = []

    class Config:
        from_attributes = True

class DocumentBase(BaseModel):
    filename: str
    file_type: str
    total_pages: int = 0
    status: str = "pending"
    processing_time_ms: float = 0.0

class DocumentCreate(DocumentBase):
    pass

class DocumentResponse(DocumentBase):
    id: int
    created_at: datetime
    pages: List[PageResponse] = []

    class Config:
        from_attributes = True
