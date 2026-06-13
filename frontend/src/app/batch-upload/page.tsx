"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, X, AlertCircle, CheckCircle2,
  Loader2, FolderOpen, Layers
} from "lucide-react";
import Header from "@/components/Header";
import { createBatch, uploadBatchChunk } from "@/services/api";

const ALLOWED_TYPES = [
  "image/png", "image/jpeg", "image/jpg", "image/bmp",
  "image/tiff", "image/webp", "application/pdf",
];
const CHUNK_SIZE = 20;
const MAX_FILE_SIZE_MB = 50;

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

type UploadState = "idle" | "uploading" | "done" | "error";

export default function BatchUploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0); // 0–100 overall
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File handling ──────────────────────────────────────────────────────────

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming).filter(
      (f) => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE_MB * 1024 * 1024
    );
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...arr.filter((f) => !names.has(f.name + f.size))];
    });
  }, []);

  const removeFile = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const clearAll = () => setFiles([]);

  // ── Drag & Drop ────────────────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  // ── Upload ─────────────────────────────────────────────────────────────────

  const handleStart = async () => {
    if (files.length === 0) return;
    setUploadState("uploading");
    setProgress(0);
    setErrorMsg("");

    try {
      setStatusMsg("Creating batch…");
      const batch = await createBatch(files.length);
      const batchUuid: string = batch.batch_uuid;

      const chunks: File[][] = [];
      for (let i = 0; i < files.length; i += CHUNK_SIZE)
        chunks.push(files.slice(i, i + CHUNK_SIZE));

      let uploaded = 0;
      for (let ci = 0; ci < chunks.length; ci++) {
        setStatusMsg(`Uploading chunk ${ci + 1} / ${chunks.length}…`);
        const res = await uploadBatchChunk(batchUuid, chunks[ci], (pct) => {
          const base = (uploaded / files.length) * 100;
          const chunkContrib = (chunks[ci].length / files.length) * pct;
          setProgress(Math.round(base + chunkContrib));
        });
        if (!res.ok) throw new Error(`Chunk ${ci + 1} upload failed.`);
        uploaded += chunks[ci].length;
        setProgress(Math.round((uploaded / files.length) * 100));
      }

      setUploadState("done");
      setStatusMsg("All files uploaded! Redirecting to progress tracker…");
      setTimeout(() => router.push(`/batch/${batchUuid}`), 1200);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed.");
      setUploadState("error");
    }
  };

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const isUploading = uploadState === "uploading";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
            style={{
              background: "oklch(0.68 0.17 145 / 0.1)",
              color: "oklch(0.68 0.17 145)",
              border: "1px solid oklch(0.68 0.17 145 / 0.25)",
            }}>
            <Layers className="w-3 h-3" /> Batch Processing Mode
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3"
            style={{ color: "var(--text-primary)" }}>
            Batch Upload Queue
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Upload hundreds of files at once. They are processed asynchronously in the background —
            you can monitor progress in real time.
          </p>
        </motion.div>

        {/* Drop Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className="rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center py-14 px-6 mb-6 select-none"
          style={{
            borderColor: isDragging ? "oklch(0.55 0.19 250)" : "var(--border-strong)",
            background: isDragging ? "oklch(0.55 0.19 250 / 0.06)" : "var(--bg-card)",
            boxShadow: isDragging ? "0 0 0 4px oklch(0.55 0.19 250 / 0.12)" : "var(--shadow-sm)",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.bmp,.tiff,.webp,.pdf"
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          <motion.div animate={{ scale: isDragging ? 1.12 : 1 }} transition={{ type: "spring", stiffness: 300 }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "oklch(0.55 0.19 250 / 0.12)" }}>
              <Upload className="w-7 h-7" style={{ color: "oklch(0.55 0.19 250)" }} />
            </div>
          </motion.div>
          <p className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            {isDragging ? "Drop files here" : "Drag & drop files here"}
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            or click to browse — PNG, JPG, BMP, TIFF, WEBP, PDF · max 50 MB each
          </p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white"
              style={{ background: "var(--gradient-hero)" }}
            >
              <FolderOpen className="w-3.5 h-3.5" /> Select Files
            </button>
          </div>
        </motion.div>

        {/* File summary bar */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 mb-4"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}
            >
              <div className="flex items-center gap-4 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" style={{ color: "oklch(0.55 0.19 250)" }} />
                  {files.length} {files.length === 1 ? "file" : "files"} selected
                </span>
                <span style={{ color: "var(--text-muted)" }}>{formatBytes(totalSize)}</span>
                <span style={{ color: "var(--text-muted)" }}>
                  ~{Math.ceil(files.length / CHUNK_SIZE)} upload chunk{Math.ceil(files.length / CHUNK_SIZE) !== 1 ? "s" : ""}
                </span>
              </div>
              <button onClick={clearAll} className="text-xs flex items-center gap-1 cursor-pointer"
                style={{ color: "oklch(0.60 0.20 25)" }}>
                <X className="w-3.5 h-3.5" /> Clear all
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* File list */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-xl border overflow-hidden mb-6"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}
            >
              <div className="max-h-56 overflow-y-auto divide-y divide-[var(--border-default)]">
                {files.map((file, idx) => (
                  <motion.div
                    key={file.name + idx}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "oklch(0.55 0.19 250 / 0.1)" }}>
                        <FileText className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.19 250)" }} />
                      </div>
                      <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                        {file.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {formatBytes(file.size)}
                      </span>
                      {!isUploading && (
                        <button onClick={() => removeFile(idx)} className="cursor-pointer"
                          style={{ color: "var(--text-muted)" }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload progress */}
        <AnimatePresence>
          {isUploading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl border p-6 mb-6 text-center"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}
            >
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: "oklch(0.55 0.19 250)" }} />
              <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{statusMsg}</p>
              <div className="w-full rounded-full h-2.5 overflow-hidden" style={{ background: "var(--bg-input)" }}>
                <motion.div
                  className="h-2.5 rounded-full"
                  style={{ background: "var(--gradient-hero)" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>{progress}%</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success */}
        <AnimatePresence>
          {uploadState === "done" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border p-6 mb-6 flex items-center gap-3"
              style={{ background: "oklch(0.68 0.17 145 / 0.08)", borderColor: "oklch(0.68 0.17 145 / 0.3)" }}
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "oklch(0.68 0.17 145)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{statusMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {uploadState === "error" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border p-6 mb-6 flex items-center gap-3"
              style={{ background: "oklch(0.60 0.20 25 / 0.08)", borderColor: "oklch(0.60 0.20 25 / 0.3)" }}
            >
              <AlertCircle className="w-5 h-5 shrink-0" style={{ color: "oklch(0.60 0.20 25)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{errorMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start button */}
        <AnimatePresence>
          {files.length > 0 && !isUploading && uploadState !== "done" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0 8px 30px -4px oklch(0.55 0.19 250 / 0.5)" }}
                whileTap={{ scale: 0.97 }}
                onClick={handleStart}
                className="px-8 py-3.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2.5 cursor-pointer"
                style={{ background: "var(--gradient-hero)", boxShadow: "0 4px 20px -4px oklch(0.55 0.19 250 / 0.4)" }}
              >
                <Upload className="w-4.5 h-4.5" />
                Start Processing — {files.length} {files.length === 1 ? "file" : "files"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
