# OCR AI Platform Frontend

This is the web frontend client for the **OCR AI Platform**. It is a modern, responsive web application built with **Next.js 16** and **React 19**, styled using **Tailwind CSS 4.x**, and animated with **Framer Motion**.

---

## 🛠️ Tech Stack & Versions

- **Framework**: Next.js `16.2.6` (App Router)
- **Library**: React `19.2.4` & React-DOM `19.2.4`
- **Language**: TypeScript `5.x`
- **Styling**: Tailwind CSS `4.x` (with `@tailwindcss/postcss`)
- **Animations**: Framer Motion `12.38.0`
- **Icons**: Lucide React `1.16.0`
- **Utility Libraries**: `clsx ^2.1.1` & `tailwind-merge ^3.6.0`

---

## 📋 Prerequisites

Before running the frontend, ensure you have:
- **Node.js**: Version `18.x` or `20.x` (or newer) installed.
- **npm**: (Default node package manager) or alternative managers such as `pnpm`, `yarn`, or `bun`.

---

## 🚀 Setup & Execution

Follow these step-by-step instructions to run the frontend client:

### Step 1: Navigate to the frontend directory
```bash
cd frontend
```

### Step 2: Install dependencies
Install the node packages configured in `package.json`:
```bash
npm install
# or
pnpm install
# or
yarn install
```

### Step 3: Configure Environment Variables
Create a file named `.env.local` in the `frontend/` directory to specify the backend API endpoint URL:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```
> **Note**: If you change the FastAPI backend's port or host, update this file accordingly.

### Step 4: Run the Development Server
Launch the development server:
```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```
The client will start running locally at **[http://localhost:3000](http://localhost:3000)**. Open this link in your browser to view the application.

### Step 5: Build and Run for Production (Optional)
If you want to build the production bundle:
```bash
# Build the application
npm run build

# Start the built application
npm run start
```

---

## 💻 Key Features Implemented

1. **Modern Premium UI**: Built with rich aesthetics (OKLCH gradients, dark-card layouts, clean glassmorphic borders) keeping layout responsive across desktop, tablet, and mobile displays.
2. **Drag & Drop Uploader**: Fully custom uploader that handles both drag-and-drop actions and click-to-select, enforcing file type validations (`.png`, `.jpg`, `.jpeg`, `.bmp`, `.tiff`, `.webp`, `.pdf`).
3. **Upload Progress Indicator**: Leverages `XMLHttpRequest` to track upload progress byte-by-byte and updates the UI progress ring in real-time.
4. **Interactive Processing States**: Visual loading indicators that transition dynamically as the file transfers and runs through the OCR pipeline.
5. **Interactive Page-by-Page Viewer**: For multi-page PDF documents, results are split by pages. Users can click through tabs to inspect page text transcripts, confidence percentages, and the engine (PaddleOCR vs. Tesseract) used for each page.
6. **One-click Copy**: Built-in functionality to quickly copy extracted text to the clipboard.
7. **Framer Motion Micro-animations**: Sleek CSS/JS transitions and exit-entry animations between `idle`, `uploading`, `processing`, `completed`, and `error` states.

---

## 📁 Directory Structure

```
frontend/
├── public/                    # Static assets
├── src/
│   ├── app/
│   │   ├── favicon.ico
│   │   ├── globals.css        # Base stylesheet & CSS variables (OKLCH)
│   │   ├── layout.tsx         # Main layout wrapper
│   │   └── page.tsx           # Home page client-side logic and main layout
│   ├── components/
│   │   ├── Header.tsx         # Header component with branding
│   │   ├── FileUploader.tsx   # Drag and drop file select UI
│   │   ├── ProcessingView.tsx # Progress bar and state indicator
│   │   └── ResultsViewer.tsx  # Document results, text viewer, copy actions
│   ├── hooks/                 # Reusable React hooks
│   ├── services/
│   │   └── api.ts             # API fetches (extractOCR, getDocuments, health)
│   └── types/
│       └── index.ts           # TypeScript interfaces (OCRResponse, OCRPageResult)
├── next.config.ts             # Next.js configurations
├── tailwind.config.ts         # Tailwind styling variables (if applicable)
├── tsconfig.json              # TypeScript compiler configs
└── package.json               # Node packages and scripts
```
