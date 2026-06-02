"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Languages,
  Shield,
  Zap,
  FileText,
  ScanText,
  Sparkles,
} from "lucide-react";

import Header from "@/components/Header";
import FileUploader from "@/components/FileUploader";
import ProcessingView from "@/components/ProcessingView";
import ResultsViewer from "@/components/ResultsViewer";
import { extractOCR } from "@/services/api";
import type { OCRResponse, UploadStatus } from "@/types";

export default function HomePage() {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<OCRResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
  }, []);

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setStatus("uploading");
    setUploadProgress(0);
    setError(null);

    try {
      const response = await extractOCR(selectedFile, (percent) => {
        setUploadProgress(percent);
        if (percent >= 100) {
          setStatus("processing");
        }
      });

      const responseText = await response.text();
      const data = JSON.parse(responseText);

      if (!response.ok) {
        throw new Error(data.detail || "OCR extraction failed");
      }

      setResult(data as OCRResponse);
      setStatus("completed");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setStatus("error");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setUploadProgress(0);
  };

  const isIdle = status === "idle";
  const isWorking = status === "uploading" || status === "processing";
  const isCompleted = status === "completed" && result;
  const isError = status === "error";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          {/* ======= IDLE STATE ======= */}
          {isIdle && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/* Hero section */}
              <div className="text-center mb-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-5"
                    style={{
                      background: "oklch(0.55 0.19 250 / 0.1)",
                      color: "oklch(0.55 0.19 250)",
                      border: "1px solid oklch(0.55 0.19 250 / 0.2)",
                    }}
                  >
                    <Sparkles className="w-3 h-3" />
                    CPU-Optimized • PaddleOCR + Tesseract
                  </div>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4"
                  style={{ color: "var(--text-primary)" }}
                >
                  Extract Text from{" "}
                  <span
                    style={{
                      background: "var(--gradient-hero)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Any Document
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-base sm:text-lg max-w-2xl mx-auto"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Upload images or scanned PDFs and get structured text with
                  confidence scores. Supports English, Hindi, and Marathi.
                </motion.p>
              </div>

              {/* Upload area */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-6"
              >
                <FileUploader
                  onFileSelect={handleFileSelect}
                  disabled={false}
                />
              </motion.div>

              {/* Submit button */}
              <AnimatePresence>
                {selectedFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex justify-center mb-10"
                  >
                    <motion.button
                      whileHover={{ scale: 1.03, boxShadow: "0 8px 30px -4px oklch(0.55 0.19 250 / 0.5)" }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSubmit}
                      className="px-8 py-3.5 rounded-xl text-sm font-semibold text-white cursor-pointer flex items-center gap-2.5"
                      style={{
                        background: "var(--gradient-hero)",
                        boxShadow: "0 4px 20px -4px oklch(0.55 0.19 250 / 0.4)",
                      }}
                    >
                      <ScanText className="w-4.5 h-4.5" />
                      Start OCR Extraction
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Feature cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                {[
                  {
                    icon: Languages,
                    title: "Multilingual",
                    desc: "English, Hindi & Marathi OCR support",
                    iconColor: "oklch(0.55 0.19 250)",
                    iconBg: "oklch(0.55 0.19 250 / 0.1)",
                  },
                  {
                    icon: Shield,
                    title: "Local Processing",
                    desc: "100% offline — your data never leaves your machine",
                    iconColor: "oklch(0.68 0.17 145)",
                    iconBg: "oklch(0.68 0.17 145 / 0.1)",
                  },
                  {
                    icon: Zap,
                    title: "Smart Engine",
                    desc: "PaddleOCR primary with Tesseract fallback",
                    iconColor: "oklch(0.78 0.15 75)",
                    iconBg: "oklch(0.78 0.15 75 / 0.1)",
                  },
                ].map((feature) => (
                  <motion.div
                    key={feature.title}
                    whileHover={{ y: -2, boxShadow: "var(--shadow-lg)" }}
                    className="rounded-2xl border p-5 transition-all"
                    style={{
                      background: "var(--bg-card)",
                      borderColor: "var(--border-default)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: feature.iconBg }}
                    >
                      <feature.icon
                        className="w-5 h-5"
                        style={{ color: feature.iconColor }}
                      />
                    </div>
                    <h3
                      className="font-semibold text-sm mb-1"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {feature.title}
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      {feature.desc}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* ======= PROCESSING STATE ======= */}
          {isWorking && selectedFile && (
            <motion.div
              key="working"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <ProcessingView
                filename={selectedFile.name}
                uploadProgress={uploadProgress}
                isProcessing={status === "processing"}
              />
            </motion.div>
          )}

          {/* ======= RESULTS STATE ======= */}
          {isCompleted && result && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <ResultsViewer data={result} onReset={handleReset} />
            </motion.div>
          )}

          {/* ======= ERROR STATE ======= */}
          {isError && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <div
                className="rounded-2xl border p-8 max-w-lg mx-auto"
                style={{
                  background: "var(--bg-card)",
                  borderColor: "oklch(0.60 0.20 25 / 0.3)",
                  boxShadow: "var(--shadow-md)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "oklch(0.60 0.20 25 / 0.1)" }}
                >
                  <FileText
                    className="w-7 h-7"
                    style={{ color: "oklch(0.60 0.20 25)" }}
                  />
                </div>
                <h2
                  className="text-lg font-bold mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  Extraction Failed
                </h2>
                <p
                  className="text-sm mb-6"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {error}
                </p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
                  style={{
                    background: "var(--gradient-hero)",
                    boxShadow: "0 4px 14px -3px oklch(0.55 0.19 250 / 0.4)",
                  }}
                >
                  Try Again
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer
        className="border-t py-6 text-center text-xs"
        style={{
          borderColor: "var(--border-default)",
          color: "var(--text-muted)",
        }}
      >
        <p>
          OCR.ai — Local Document Intelligence •
          PaddleOCR + Tesseract • CPU Optimized
        </p>
      </footer>
    </div>
  );
}
