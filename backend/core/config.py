import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "OCR AI Platform"
    # MySQL Database connection (root:root)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "mysql+pymysql://root:root@localhost/ocr-app")
    
    # Upload limits and paths
    UPLOAD_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/uploads"))
    PROCESSED_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/processed"))
    LOGS_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/logs"))
    
    # OCR Settings
    MAX_IMAGE_WIDTH: int = 1600
    OCR_LANGUAGES: str = "en,hi,mr"
    
    model_config = ConfigDict(env_file=".env")

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.PROCESSED_DIR, exist_ok=True)
os.makedirs(settings.LOGS_DIR, exist_ok=True)
