"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  BarChart3,
  Languages,
} from "lucide-react";
import type { OCRResponse } from "@/types";

interface ResultsViewerProps {
  data: OCRResponse;
  onReset: () => void;
}

function ConfidenceBadge({ score }: { score: number }) {
  let colorStyle: React.CSSProperties;
  let label: string;

  if (score >= 0.85) {
    colorStyle = { color: "oklch(0.68 0.17 145)", background: "oklch(0.68 0.17 145 / 0.1)" };
    label = "High";
  } else if (score >= 0.6) {
    colorStyle = { color: "oklch(0.78 0.15 75)", background: "oklch(0.78 0.15 75 / 0.1)" };
    label = "Medium";
  } else {
    colorStyle = { color: "oklch(0.60 0.20 25)", background: "oklch(0.60 0.20 25 / 0.1)" };
    label = "Low";
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={colorStyle}
    >
      <BarChart3 className="w-3 h-3" />
      {(score * 100).toFixed(1)}% — {label}
    </span>
  );
}

export default function ResultsViewer({ data, onReset }: ResultsViewerProps) {
  const [expandedPages, setExpandedPages] = useState<Set<number>>(
    new Set(data.pages.map((p) => p.page))
  );
  const [copiedPage, setCopiedPage] = useState<number | null>(null);
  const [showJSON, setShowJSON] = useState(false);

  const togglePage = (page: number) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(page)) {
        next.delete(page);
      } else {
        next.add(page);
      }
      return next;
    });
  };

  const copyText = async (text: string, pageNum: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedPage(pageNum);
    setTimeout(() => setCopiedPage(null), 2000);
  };

  const copyAll = async () => {
    const allText = data.pages.map((p) => p.text).join("\n\n---\n\n");
    await navigator.clipboard.writeText(allText);
    setCopiedPage(-1);
    setTimeout(() => setCopiedPage(null), 2000);
  };

  const avgConfidence =
    data.pages.length > 0
      ? data.pages.reduce((sum, p) => sum + p.confidence, 0) / data.pages.length
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Summary header */}
      <div
        className="rounded-2xl border p-6"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border-default)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: "oklch(0.68 0.17 145 / 0.12)",
              }}
            >
              <CheckCircle2
                className="w-6 h-6"
                style={{ color: "oklch(0.68 0.17 145)" }}
              />
            </div>
            <div>
              <h2
                className="text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Extraction Complete
              </h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {data.filename}
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onReset}
            className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors"
            style={{
              background: "var(--bg-input)",
              color: "var(--text-secondary)",
            }}
          >
            New Scan
          </motion.button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              icon: FileText,
              label: "Pages",
              value: data.total_pages.toString(),
              iconColor: "oklch(0.55 0.19 250)",
            },
            {
              icon: Clock,
              label: "Time",
              value: data.processing_time,
              iconColor: "oklch(0.65 0.17 180)",
            },
            {
              icon: BarChart3,
              label: "Confidence",
              value: `${(avgConfidence * 100).toFixed(1)}%`,
              iconColor: "oklch(0.68 0.17 145)",
            },
            {
              icon: Cpu,
              label: "Engine",
              value: data.pages[0]?.engine || "—",
              iconColor: "oklch(0.78 0.15 75)",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-3"
              style={{ background: "var(--bg-input)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon
                  className="w-3.5 h-3.5"
                  style={{ color: stat.iconColor }}
                />
                <span
                  className="text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  {stat.label}
                </span>
              </div>
              <p
                className="text-sm font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={copyAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
          style={{
            background: "var(--gradient-hero)",
            color: "white",
            boxShadow: "0 4px 14px -3px oklch(0.55 0.19 250 / 0.4)",
          }}
        >
          {copiedPage === -1 ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {copiedPage === -1 ? "Copied!" : "Copy All Text"}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowJSON((prev) => !prev)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer border"
          style={{
            background: "var(--bg-card)",
            color: "var(--text-secondary)",
            borderColor: "var(--border-default)",
          }}
        >
          {showJSON ? "Hide" : "View"} JSON
        </motion.button>
      </div>

      {/* JSON view */}
      <AnimatePresence>
        {showJSON && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <pre
              className="rounded-2xl border p-5 text-xs overflow-x-auto font-mono leading-relaxed"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--border-default)",
                color: "var(--text-secondary)",
                maxHeight: "400px",
              }}
            >
              {JSON.stringify(data, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page results */}
      <div className="space-y-3">
        {data.pages.map((page, idx) => (
          <motion.div
            key={page.page}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="rounded-2xl border overflow-hidden"
            style={{
              background: "var(--bg-card)",
              borderColor: "var(--border-default)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {/* Page header */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => togglePage(page.page)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  togglePage(page.page);
                }
              }}
              className="w-full flex items-center justify-between p-4 cursor-pointer transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{
                    background: "oklch(0.55 0.19 250 / 0.1)",
                    color: "oklch(0.55 0.19 250)",
                  }}
                >
                  {page.page}
                </div>
                <span className="font-medium text-sm">Page {page.page}</span>
                <ConfidenceBadge score={page.confidence} />
                {page.engine && (
                  <span
                    className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md"
                    style={{
                      background: "var(--bg-input)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <Cpu className="w-3 h-3" />
                    {page.engine}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    copyText(page.text, page.page);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
                  style={{
                    background: "var(--bg-input)",
                    color: "var(--text-muted)",
                  }}
                  aria-label={`Copy text from page ${page.page}`}
                >
                  {copiedPage === page.page ? (
                    <Check className="w-3.5 h-3.5" style={{ color: "oklch(0.68 0.17 145)" }} />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </motion.button>
                {expandedPages.has(page.page) ? (
                  <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                ) : (
                  <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                )}
              </div>
            </div>

            {/* Extracted text */}
            <AnimatePresence>
              {expandedPages.has(page.page) && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div
                    className="px-4 pb-4"
                  >
                    <div
                      className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono"
                      style={{
                        background: "var(--bg-input)",
                        color: "var(--text-secondary)",
                        maxHeight: "300px",
                        overflowY: "auto",
                      }}
                    >
                      {page.text || (
                        <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                          No text detected on this page.
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
