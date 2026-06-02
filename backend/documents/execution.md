# Backend Execution Guide

This document provides instructions on how to set up and run the FastAPI backend for the OCR AI Platform.

## System Prerequisites

- **Python 3.10+**
- **MySQL Server 8.0+**
- **Tesseract OCR Binary**: Must be installed on the system path for fallback OCR support.
  - Windows: [Tesseract installer for Windows](https://github.com/UB-Mannheim/tesseract/wiki)
- **C++ Build Tools**: Required for compiling some Python dependencies (like PaddleOCR).
- **Virtual Environment**: Located at `ocr-venv` in the root.

## Local Environment

### 1. Environment Activation

Activate the virtual environment from the project root:

```powershell
# Windows PowerShell
.\ocr-venv\Scripts\activate
```

### 2. Install Dependencies

Ensure all backend dependencies are installed:

```powershell
pip install fastapi uvicorn pydantic-settings sqlalchemy pymysql cryptography python-multipart opencv-python numpy pytesseract paddleocr pymupdf paddlepaddle
```

_(Note: Use `paddlepaddle-gpu` if you have a compatible NVIDIA GPU, otherwise `paddlepaddle` for CPU.)_

### 3. Database Setup

1. Create a MySQL database named `ocr_app`.
2. Ensure you have a user with appropriate permissions.
3. The tables will be automatically created on the first run.

### 4. Configuration

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=mysql+pymysql://root:password@localhost/ocr_app
PROJECT_NAME="OCR AI Platform"
```

### 5. Running the Development Server

From the project root:

```powershell
uvicorn backend.main:app --reload
```

- Access API: `http://127.0.0.1:8000`
- API Docs: `http://127.0.0.1:8000/docs`

---

## Production Environment

### 1. Process Management

Use **Gunicorn** with Uvicorn workers for production stability:

```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app --bind 0.0.0.0:8000
```

### 2. Environment Variables

Inject configuration via environment variables or a secure `.env` file. Do not commit secrets to version control.

### 3. File Storage

The application stores files in `data/uploads` and `data/processed`. Ensure these directories are persistent (e.g., using Docker volumes or cloud storage).

### 4. Logging

Logs are saved to `data/logs/ocr_app.log`. Monitor this file for errors.

## Summary of what's happening:

### 1. Virtual Environment:

The project uses ocr-venv located in the root to manage Python dependencies (like FastAPI, PaddleOCR, etc.).

### 3. Uvicorn:

This is the ASGI server that runs your FastAPI application.
backend.main:app: This tells uvicorn to look in the backend folder, find main.py, and use the app instance defined there.
--reload: This enables auto-reload so the server restarts whenever you save changes to your code.
