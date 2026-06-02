# Multilingual OCR AI Platform

An end-to-end, CPU-optimized document intelligence solution. This system allows users to upload images and multi-page PDFs to extract high-accuracy structured text. It features automated image preprocessing (deskewing, binarization, downscaling) and runs a robust **dual-engine OCR pipeline** (PaddleOCR primary with Tesseract OCR fallback), supporting **English, Hindi, and Marathi**.

---

## 📐 System Architecture

```mermaid
graph TD
    User([User]) -->|Uploads Image or PDF| FE[Next.js Frontend]
    FE -->|POST /ocr/extract| BE[FastAPI Backend]
    BE -->|1. Validate & Save Upload| Disk[(Disk Store: /uploads)]
    BE -->|2. Split Pages if PDF| PyMu[PyMuPDF Page Splitter]
    BE -->|3. Clean & Auto-Deskew| CV2[OpenCV Preprocessing]
    PyMu -->|Sequential Images| Disk2[(Disk Store: /processed)]
    Disk2 -->|Page-by-page OCR| OCRPipeline{OCR Pipeline}
    CV2 -->|Single Image OCR| OCRPipeline
    OCRPipeline -->|Primary| Paddle[PaddleOCR Engine]
    OCRPipeline -.->|Fallback on error| Tess[Tesseract Engine]
    Paddle -->|Extracted Text & Confidence| DB[(MySQL Database)]
    Tess -->|Extracted Text & Confidence| DB
    BE -->|JSON API Response| FE
    FE -->|Render Page-by-Page results| User
```

---

## 🛠️ Technology Stack & Requirements

### Tech Stack Summary
| Layer | Technology | Primary Version | Key Libraries |
| :--- | :--- | :--- | :--- |
| **Backend** | Python & FastAPI | `Python 3.11.7` / `FastAPI 0.136` | PaddleOCR, PyMuPDF, OpenCV, SQLAlchemy, PyMySQL |
| **Frontend** | Next.js (App Router) | `Next.js 16.2.6` / `React 19.2.4` | TypeScript, Tailwind CSS 4.x, Framer Motion, Lucide React |
| **Database** | MySQL Server | `MySQL 8.x` | Used for historical OCR results and file metadata |

### Prerequisites Overview
- **Python 3.11.x** installed.
- **Node.js 18.x or 20.x+** installed.
- **MySQL Database Server** installed and running locally.
- **Tesseract OCR Binary** installed on the host system:
  - Must include trained language files: `eng.traineddata` (English), `hin.traineddata` (Hindi), and `mar.traineddata` (Marathi) placed in the Tesseract `tessdata` folder.

---

## 📁 Repository Structure

```
ocr-app/
├── backend/                  # FastAPI Application
│   ├── api/                  # API routers (endpoints)
│   ├── core/                 # App configurations and database connection
│   ├── models/               # SQLAlchemy DB models
│   ├── schemas/              # Pydantic schemas
│   ├── services/             # Preprocessing, PDF extraction, OCR service
│   ├── main.py               # Main entrypoint
│   └── requirements.txt      # Python dependencies
├── frontend/                 # Next.js Web App
│   ├── src/                  # App components, pages, hooks, services, types
│   ├── package.json          # Node dependencies & scripts
│   └── .env.local            # Frontend environment configuration
├── data/                     # Local file storage (Gitignored)
│   ├── logs/                 # System log files
│   ├── processed/            # Extracted/Processed page images
│   └── uploads/              # Raw uploaded documents
└── README.md                 # Project root overview
```

---

## 🚀 Project Execution (Step-by-Step)

To run the application locally on your machine, follow these steps to start both the backend server and frontend client.

### Step 1: Start the Backend Server
1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv ocr-venv
   # On Windows (PowerShell):
   .\ocr-venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source ocr-venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` directory and configure your MySQL connection details:
   ```env
   DATABASE_URL=mysql+pymysql://root:root@localhost/ocr-app
   ```
5. Run the FastAPI development server:
   ```bash
   python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```
   *The Swagger API documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs).*

### Step 2: Start the Frontend Client
1. Open a new terminal session and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install the node packages:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the `frontend/` directory pointing to the backend server:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)** to use the platform.

---

## ✨ Features Implemented

- **Multilingual Support**: High-accuracy recognition of English, Hindi, and Marathi texts.
- **Dual-Engine Pipeline**: PaddleOCR acts as the fast and accurate primary reader, falling back automatically to Tesseract OCR if dependencies or models fail.
- **Adaptive Preprocessing**: OpenCV resizing (max 1600px width), grayscale conversion, Gaussian denoising, and min-area bounding box deskewing (up to 15 degrees) to improve recognition.
- **RAM Optimization**: Splitting multi-page PDFs page-by-page via PyMuPDF. Clean sequential processing with explicit garbage collection between pages to prevent system RAM spikes.
- **Progress Tracking**: XMLHttpRequest-driven upload progress ring in the UI.
- **Results Explorer**: A multi-tab page-by-page client viewer containing confidence scores, metadata, engine labels, and raw text transcripts with one-click copy.
- **Auto Database Schemas**: Automated SQL table creation (via SQLAlchemy) on backend server boot.

---

## 🔮 Upcoming Features (Roadmap)

1. **Batch Uploading Queue**: Process multiple files sequentially via a background queue (e.g., Celery + Redis).
2. **Searchable PDF Export**: Compile extracted text back into a searchable sandwich PDF format for downstream usage.
3. **Interactive Bounding Box (BBox) Annotation**: Render bounding boxes on top of the original document image in the frontend, enabling users to highlight/hover and select specific paragraphs to copy.
4. **Historical Document Explorer**: Implement a dashboard in the frontend to search, filter, view, and delete previous OCR runs stored in the MySQL database (exposing endpoints already available in the API).
5. **Dynamic OCR Options**: Allow users to select languages, toggle preprocessing steps (like deskewing), or choose a specific engine (PaddleOCR vs. Tesseract) directly from the UI settings.

---

## 💡 Suggested Feature Enhancements

If you are looking to take the OCR app to the next level, here are a few premium additions:

- **Local LLM Integration (RAG)**: Connect the MySQL database of extracted text to a local Large Language Model (using Ollama or Llama.cpp) so users can chat with their documents (e.g., "What was the total invoice amount in the uploaded PDF?").
- **Language Detection Model**: Integrate a fast text classifier (like fastText or langdetect) to automatically detect document languages instead of querying all three (`en,hi,mr`) sequentially.
- **Machine Translation Service**: Add one-click translation of extracted Marathi/Hindi text to English and vice-versa using a lightweight local MarianMT model or Google Translate API.
- **Layout Parser & Table Extractor**: Use specialized layout models (like LayoutLM or PaddleStructure) to recognize tables, column layouts, and bullet points, converting them to clean Markdown tables or CSV documents rather than raw paragraphs.
- **Text-to-Speech (TTS) Integration**: Incorporate a local TTS utility (such as pyttsx3 or a browser Web Speech API) to read out the extracted text, providing accessibility benefits.
