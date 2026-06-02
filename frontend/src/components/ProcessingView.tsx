"use client";

import { motion } from "framer-motion";
import { Loader2, ScanText, FileText } from "lucide-react";

interface ProcessingViewProps {
  filename: string;
  uploadProgress: number;
  isProcessing: boolean;
}

export default function ProcessingView({
  filename,
  uploadProgress,
  isProcessing,
}: ProcessingViewProps) {
  const isUploading = uploadProgress < 100;
  const progressPercent = isUploading ? uploadProgress : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border overflow-hidden"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border-default)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {/* Scanning animation area */}
      <div
        className="relative h-48 flex items-center justify-center overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.55 0.19 250 / 0.08) 0%, oklch(0.65 0.17 180 / 0.08) 100%)",
        }}
      >
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(var(--border-default) 1px, transparent 1px), linear-gradient(90deg, var(--border-default) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Scan line */}
        {isProcessing && (
          <motion.div
            className="absolute left-4 right-4 h-0.5 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.55 0.19 250), oklch(0.65 0.17 180), transparent)",
              boxShadow: "0 0 20px 2px oklch(0.55 0.19 250 / 0.4)",
            }}
            animate={{ top: ["8%", "92%", "8%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Center icon */}
        <motion.div
          animate={
            isProcessing
              ? { scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10"
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: "var(--bg-card)",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid var(--border-default)",
            }}
          >
            {isProcessing ? (
              <ScanText
                className="w-9 h-9"
                style={{ color: "oklch(0.55 0.19 250)" }}
              />
            ) : (
              <FileText
                className="w-9 h-9"
                style={{ color: "oklch(0.65 0.17 180)" }}
              />
            )}
          </div>

          {/* Pulse rings */}
          {isProcessing && (
            <>
              <motion.div
                className="absolute inset-0 rounded-2xl border"
                style={{ borderColor: "oklch(0.55 0.19 250 / 0.3)" }}
                animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-2xl border"
                style={{ borderColor: "oklch(0.65 0.17 180 / 0.2)" }}
                animate={{ scale: [1, 1.9], opacity: [0.4, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.5,
                }}
              />
            </>
          )}
        </motion.div>
      </div>

      {/* Info section */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          {(isUploading || isProcessing) && (
            <Loader2
              className="w-5 h-5 animate-spin"
              style={{ color: "oklch(0.55 0.19 250)" }}
            />
          )}
          <div>
            <p
              className="font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {isUploading
                ? "Uploading file..."
                : isProcessing
                ? "Running OCR extraction..."
                : "Preparing..."}
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {filename}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--text-secondary)" }}>
              {isUploading ? "Upload" : "OCR Processing"}
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              {isUploading ? `${progressPercent}%` : "Analyzing..."}
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: "var(--bg-input)" }}
          >
            {isUploading ? (
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, oklch(0.55 0.19 250), oklch(0.65 0.17 180))",
                }}
                initial={{ width: "0%" }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, oklch(0.55 0.19 250), oklch(0.65 0.17 180))",
                }}
                animate={{
                  width: ["20%", "60%", "85%", "95%"],
                }}
                transition={{
                  duration: 8,
                  ease: "easeInOut",
                }}
              />
            )}
          </div>
        </div>

        {/* Status messages */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 flex flex-col gap-1"
          >
            {[
              "Preprocessing image with OpenCV...",
              "Applying adaptive thresholding...",
              "Running PaddleOCR engine...",
            ].map((msg, i) => (
              <motion.p
                key={msg}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 1.5 }}
                className="text-xs flex items-center gap-2"
                style={{ color: "var(--text-muted)" }}
              >
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ background: "oklch(0.65 0.17 180)" }}
                />
                {msg}
              </motion.p>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
