import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.database import engine, Base
from .api.ocr import router as ocr_router
from .api.batch import router as batch_router
from .models import Batch, Job  # ensure tables are registered with Base

# --- Logging setup ---
log_file = os.path.join(settings.LOGS_DIR, "ocr_app.log")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    handlers=[
        logging.FileHandler(log_file, encoding="utf-8"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# --- Create all DB tables ---
Base.metadata.create_all(bind=engine)

# --- FastAPI App ---
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="CPU-optimized OCR AI platform for extracting text from images and PDFs.",
    version="1.0.0"
)

# --- CORS middleware (allow Next.js frontend) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Register routers ---
app.include_router(ocr_router)
app.include_router(batch_router)


@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
