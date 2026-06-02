# Frontend Execution Guide

This document provides instructions on how to set up and run the Next.js frontend for the OCR AI Platform.

## System Prerequisites
- **Node.js 18.17.0+**
- **npm** (comes with Node.js)

## Local Environment

### 1. Install Dependencies
Navigate to the `frontend` directory and install packages:
```bash
cd frontend
npm install
```

### 2. Configuration
Create a `.env.local` file in the `frontend/` directory:
```env
# URL of the FastAPI backend
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### 3. Running the Development Server
Run the following command:
```bash
npm run dev
```
- Access the App: `http://localhost:3000`

---

## Production Environment

### 1. Build the Application
Create an optimized production build:
```bash
npm run build
```

### 2. Start the Production Server
```bash
npm run start
```

### 3. Deployment Options
- **Vercel**: Push your code to GitHub and connect it to Vercel for automatic deployment.
- **Docker**: Use a `Dockerfile` for multi-stage builds (install -> build -> run).
- **Static Hosting**: If no server-side features are used, generate a static site with `npm run build` (configured for export) and host on Nginx/Apache.

### 4. Performance & SEO
- The app uses `next/font` for optimized typography.
- Images are automatically optimized if using the `<Image />` component.
- Ensure `NEXT_PUBLIC_API_URL` is correctly set to your production API endpoint.
