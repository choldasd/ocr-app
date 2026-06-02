"use client";

import { useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  AlertCircle,
} from "lucide-react";

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/bmp",
  "image/tiff",
  "image/webp",
  "application/pdf",
];

const MAX_SIZE_MB = 50;

export default function FileUploader({ onFileSelect, disabled }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Unsupported file type. Accepted: PNG, JPG, BMP, TIFF, WebP, PDF`;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File too large. Maximum size is ${MAX_SIZE_MB} MB.`;
    }
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const err = validateFile(file);
      if (err) {
        setError(err);
        return;
      }
      setSelectedFile(file);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isPDF = selectedFile?.type === "application/pdf";

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.bmp,.tiff,.tif,.webp,.pdf"
        onChange={handleInputChange}
        className="hidden"
        id="ocr-file-input"
        aria-label="Select file for OCR"
      />

      <AnimatePresence mode="wait">
        {!selectedFile ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleClick}
            className="relative cursor-pointer rounded-2xl border-2 border-dashed p-12 transition-all duration-300 text-center group"
            style={{
              borderColor: isDragging
                ? "oklch(0.55 0.19 250)"
                : "var(--border-default)",
              background: isDragging
                ? "oklch(0.55 0.19 250 / 0.06)"
                : "var(--bg-card)",
              boxShadow: isDragging
                ? "0 0 40px -8px oklch(0.55 0.19 250 / 0.25)"
                : "var(--shadow-sm)",
            }}
            role="button"
            aria-label="Drop zone for file upload"
            tabIndex={0}
          >
            {/* Floating icon */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{
                background: "var(--gradient-hero)",
                boxShadow: "0 8px 32px -4px oklch(0.55 0.19 250 / 0.3)",
              }}
            >
              <Upload className="w-7 h-7 text-white" />
            </motion.div>

            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {isDragging ? "Drop your file here" : "Upload Document"}
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              Drag & drop or click to browse
            </p>
            <div
              className="flex flex-wrap items-center justify-center gap-2 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              <span className="px-2 py-1 rounded-md" style={{ background: "var(--bg-input)" }}>
                PNG
              </span>
              <span className="px-2 py-1 rounded-md" style={{ background: "var(--bg-input)" }}>
                JPG
              </span>
              <span className="px-2 py-1 rounded-md" style={{ background: "var(--bg-input)" }}>
                PDF
              </span>
              <span className="px-2 py-1 rounded-md" style={{ background: "var(--bg-input)" }}>
                TIFF
              </span>
              <span className="px-2 py-1 rounded-md" style={{ background: "var(--bg-input)" }}>
                BMP
              </span>
              <span className="px-2 py-1 rounded-md" style={{ background: "var(--bg-input)" }}>
                WebP
              </span>
            </div>
            <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
              Max file size: {MAX_SIZE_MB} MB
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="selected"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border p-6"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border-default)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: isPDF
                    ? "oklch(0.60 0.20 25 / 0.12)"
                    : "oklch(0.55 0.19 250 / 0.12)",
                }}
              >
                {isPDF ? (
                  <FileText
                    className="w-6 h-6"
                    style={{ color: "oklch(0.60 0.20 25)" }}
                  />
                ) : (
                  <ImageIcon
                    className="w-6 h-6"
                    style={{ color: "oklch(0.55 0.19 250)" }}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className="font-medium truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {selectedFile.name}
                </p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {formatSize(selectedFile.size)} •{" "}
                  {selectedFile.type.split("/")[1]?.toUpperCase()}
                </p>
              </div>

              {!disabled && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
                  style={{
                    background: "var(--bg-input)",
                    color: "var(--text-muted)",
                  }}
                  aria-label="Remove selected file"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-2 mt-3 px-4 py-2.5 rounded-xl text-sm"
            style={{
              background: "oklch(0.60 0.20 25 / 0.1)",
              color: "oklch(0.60 0.20 25)",
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
