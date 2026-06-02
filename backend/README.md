# OCR AI Platform Backend

This is the backend server for the **OCR AI Platform**, a CPU-optimized document intelligence solution. It is built using **FastAPI** and leverages **PaddleOCR** (with **Tesseract OCR** as a fallback) to extract multilingual text from images and PDF files.

---

## 🛠️ Tech Stack & Versions

- **Python**: `3.11.7`
- **Web Framework**: FastAPI `0.136.1`
- **ASGI Server**: Uvicorn `0.46.0`
- **OCR Engine (Primary)**: PaddleOCR `3.5.0` (PaddlePaddle `3.3.1` CPU edition)
- **OCR Engine (Fallback)**: Tesseract OCR via `pytesseract 0.3.13`
- **PDF Processor**: PyMuPDF (fitz) `1.27.2.3`
- **Image Preprocessing**: OpenCV-Python `4.13.0.92`
- **Database ORM**: SQLAlchemy `2.0.49`
- **Database Driver**: PyMySQL `1.1.3`
- **Validation**: Pydantic `2.13.4`

---

## 📋 Prerequisites

Before running the backend, ensure you have the following installed on your system:

### 1. Python 3.11.7
Make sure Python is installed and added to your system's PATH.

### 2. Tesseract OCR Engine (System Package)
Tesseract is required as the fallback OCR engine.
- **Windows**: Download the installer from [UB-Mannheim Tesseract](https://github.com/UB-Mannheim/tesseract/wiki) and run it. Add the Tesseract directory (e.g., `C:\Program Files\Tesseract-OCR`) to your system environment variables `PATH`.
- **macOS**: Install via Homebrew: `brew install tesseract`
- **Linux (Ubuntu/Debian)**: Install via apt: `sudo apt-get install tesseract-ocr`
- **Language Data**: Download language training data (`.traineddata` files) for Hindi (`hin.traineddata`) and Marathi (`mar.traineddata`) from the [tessdata repository](https://github.com/tesseract-ocr/tessdata) and place them inside the `tessdata/` directory of your Tesseract installation folder.

### 3. MySQL Server
A running MySQL server instance is needed to store processed document metadata and OCR results.
- Create a database schema named `ocr-app` on your MySQL server.
- The default credentials configured are `root:root` (can be updated in configuration).

---

## 🚀 Setup & Execution

Follow these step-by-step instructions to get the backend running:

### Step 1: Navigate to the backend directory
```bash
cd backend
```

### Step 2: Set up a Python Virtual Environment
It is highly recommended to run this inside a virtual environment to manage dependencies:
```powershell
# Create virtual environment
python -m venv ocr-venv

# Activate virtual environment
# On Windows (PowerShell):
.\ocr-venv\Scripts\Activate.ps1
# On Windows (CMD):
.\ocr-venv\Scripts\activate.bat
# On macOS / Linux:
source ocr-venv/bin/activate
```

### Step 3: Install Dependencies
Install all the required Python libraries using `requirements.txt`:
```bash
pip install -r requirements.txt
```

### Step 4: Environment Variables (`.env`)
Create a `.env` file in the `backend/` directory to configure the server settings. You can copy and customize the following environment variables:
```env
# Database URI (MySQL Example)
DATABASE_URL=mysql+pymysql://root:root@localhost/ocr-app

# Project Settings
PROJECT_NAME="OCR AI Platform"

# OCR Configurations
OCR_LANGUAGES="en,hi,mr"
MAX_IMAGE_WIDTH=1600
```
> **Note**: The backend automatically reads this file on startup. If no `.env` is present, it will fallback to defaults (MySQL URL: `mysql+pymysql://root:root@localhost/ocr-app`).

### Step 5: Start the Backend Server
Run the FastAPI application with reload enabled for development:
```bash
# If running inside the "backend" directory:
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

# If running from the root "ocr-app" directory:
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

The server will start, and the database tables (`documents`, `pages`, `ocr_results`) will be auto-generated in your MySQL database schema on startup.

Access the interactive API documentation (Swagger UI) at: **[http://localhost:8000/docs](http://localhost:8000/docs)**.

---

## 📡 API Endpoints

### OCR Actions
* **`POST /ocr/extract`**
  - **Description**: Upload a single image or PDF file.
  - **Payload**: `multipart/form-data` with key `file`.
  - **Output**: JSON payload with extraction status, elapsed time, total pages, and extracted text for each page along with confidence scores and the engine used.

### Document Retrieval
* **`GET /ocr/documents`**
  - **Description**: Paginated list of all uploaded and processed documents.
  - **Query Params**: `skip` (default 0), `limit` (default 20).
* **`GET /ocr/documents/{document_id}`**
  - **Description**: Details of a specific document, including page-by-page OCR transcriptions and confidence values.

### Health Check
* **`GET /health`**
  - **Description**: Check if backend service is running normally. Returns `{"status": "healthy"}`.

---

## 📁 Directory Structure

```
backend/
├── api/
│   ├── __init__.py
│   └── ocr.py                 # OCR routes (upload, list, detail)
├── core/
│   ├── __init__.py
│   ├── config.py              # Configuration loading and path setups
│   └── database.py            # SQLAlchemy engine, session, Base connection
├── models/
│   ├── __init__.py
│   └── document.py            # SQLAlchemy Database Models (Doc, Page, OCRResult)
├── schemas/
│   ├── __init__.py
│   └── document.py            # Pydantic schemas (Request/Response validation)
├── services/
│   ├── __init__.py
│   ├── ocr.py                 # Core OCR logic (PaddleOCR + Tesseract Fallback)
│   ├── pdf.py                 # PyMuPDF processing for sequential PDF parsing
│   └── preprocessing.py       # OpenCV preprocessing (Grayscale, Resize, Deskew)
├── main.py                    # Application entry point & FastAPI setup
└── requirements.txt           # Python dependency file
```

---

## ⚙️ Optimization Features Included

- **Memory Optimization**: PDFs are processed page-by-page by rendering them into temporary images sequentially. After processing each page, memory garbage collection is explicitly triggered (`gc.collect()`).
- **OpenCV Deskew & Resize**: Images are auto-rotated (up to 15 degrees) if they are crooked and downscaled to a max width of 1600px to avoid GPU/CPU memory spikes.
- **Engine Fallback**: If the local machine fails to load PaddleOCR models due to binary dependencies or compatibility issues, the request falls back seamlessly to PyTesseract.
