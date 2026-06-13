import os
import socket
from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "OCR AI Platform"
    DATABASE_URL: str = ""
    
    # Upload limits and paths
    UPLOAD_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/uploads"))
    PROCESSED_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/processed"))
    LOGS_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/logs"))
    
    # OCR Settings
    MAX_IMAGE_WIDTH: int = 1600
    OCR_LANGUAGES: str = "en,hi,mr"
    
    model_config = ConfigDict(env_file=".env")

settings = Settings()

# Check if DATABASE_URL was set via env or .env file.
# If not, probe if local MySQL is running; if not, fallback to SQLite.
if not settings.DATABASE_URL:
    env_db_url = os.getenv("DATABASE_URL")
    if env_db_url:
        settings.DATABASE_URL = env_db_url
    else:
        mysql_url = "mysql+pymysql://root:root@localhost/ocr-app"
        mysql_alive = False
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5)
            s.connect(("localhost", 3306))
            s.close()
            mysql_alive = True
        except Exception:
            mysql_alive = False

        if mysql_alive:
            settings.DATABASE_URL = mysql_url
        else:
            db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/ocr_app.db"))
            # Ensure the directory for the SQLite db exists
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
            settings.DATABASE_URL = f"sqlite:///{db_path}"

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.PROCESSED_DIR, exist_ok=True)
os.makedirs(settings.LOGS_DIR, exist_ok=True)

