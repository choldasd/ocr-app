"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, XCircle, Download, CheckCircle2, AlertCircle,
  Clock, Loader2, FileText, ChevronDown, BarChart3
} from "lucide-react";
import Header from "@/components/Header";
import { getBatch, retryBatch, cancelBatch, getBatchExportUrl, createBatchWebSocket } from "@/services/api";

type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
type BatchStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "PARTIAL SUCCESS";

interface Job {
  id: number;
  file_name: string;
  status: JobStatus;
  retry_count: number;
  error_message?: string;
  plain_text?: string;
  ocr_result?: { pages: { page: number; text: string; confidence: number; engine: string }[] };
  processing_started_at?: string;
  processing_completed_at?: string;
}

interface BatchDetail {
  batch_uuid: string;
  status: BatchStatus;
  total_files: number;
  completed_files: number;
  failed_files: number;
  pending_files: number;
  processing_files: number;
  created_at: string;
  jobs: Job[];
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "oklch(0.68 0.17 145)",
  FAILED: "oklch(0.60 0.20 25)",
  PROCESSING: "oklch(0.55 0.19 250)",
  PENDING: "oklch(0.78 0.15 75)",
  "PARTIAL SUCCESS": "oklch(0.75 0.14 180)",
};

const STATUS_BG: Record<string, string> = {
  COMPLETED: "oklch(0.68 0.17 145 / 0.12)",
  FAILED: "oklch(0.60 0.20 25 / 0.12)",
  PROCESSING: "oklch(0.55 0.19 250 / 0.12)",
  PENDING: "oklch(0.78 0.15 75 / 0.12)",
  "PARTIAL SUCCESS": "oklch(0.75 0.14 180 / 0.12)",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: STATUS_BG[status] || STATUS_BG.PENDING, color: STATUS_COLORS[status] || STATUS_COLORS.PENDING }}>
      {status}
    </span>
  );
}

function JobStatusIcon({ status }: { status: JobStatus }) {
  if (status === "COMPLETED") return <CheckCircle2 className="w-4 h-4" style={{ color: "oklch(0.68 0.17 145)" }} />;
  if (status === "FAILED") return <AlertCircle className="w-4 h-4" style={{ color: "oklch(0.60 0.20 25)" }} />;
  if (status === "PROCESSING") return <Loader2 className="w-4 h-4 animate-spin" style={{ color: "oklch(0.55 0.19 250)" }} />;
  return <Clock className="w-4 h-4" style={{ color: "oklch(0.78 0.15 75)" }} />;
}

const EXPORT_FORMATS = [
  { label: "JSON", value: "json" },
  { label: "CSV", value: "csv" },
  { label: "Excel (.xlsx)", value: "excel" },
  { label: "PDF", value: "pdf" },
] as const;

export default function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<number>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);

  const fetchBatch = useCallback(async () => {
    try {
      const data = await getBatch(batchId);
      setBatch(data);
    } catch {
      /* keep stale */
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  // WebSocket + polling fallback
  useEffect(() => {
    fetchBatch();

    try {
      const ws = createBatchWebSocket(batchId);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        const payload = JSON.parse(e.data);
        setBatch((prev) => prev ? { ...prev, ...payload } : prev);
        // If done, fetch full detail (job list)
        if (["COMPLETED", "FAILED", "PARTIAL SUCCESS"].includes(payload.status)) {
          fetchBatch();
        }
      };
      ws.onerror = () => {
        // WebSocket failed — fall back to polling
        const interval = setInterval(fetchBatch, 5000);
        return () => clearInterval(interval);
      };
    } catch {
      const interval = setInterval(fetchBatch, 5000);
      return () => clearInterval(interval);
    }

    return () => wsRef.current?.close();
  }, [batchId, fetchBatch]);

  const handleRetry = async () => {
    setActionMsg("Retrying failed jobs…");
    try {
      const res = await retryBatch(batchId);
      setActionMsg(res.message);
      fetchBatch();
    } catch {
      setActionMsg("Retry failed.");
    }
    setTimeout(() => setActionMsg(""), 3000);
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this batch? All pending jobs will be marked as failed.")) return;
    setActionMsg("Cancelling batch…");
    try {
      const res = await cancelBatch(batchId);
      setActionMsg(res.message);
      fetchBatch();
    } catch {
      setActionMsg("Cancel failed.");
    }
    setTimeout(() => setActionMsg(""), 3000);
  };

  const handleExport = (format: string) => {
    window.open(getBatchExportUrl(batchId, format as "json" | "csv" | "excel" | "pdf"), "_blank");
    setShowExport(false);
  };

  const toggleJob = (id: number) =>
    setExpandedJobs((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  if (loading) return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Header />
      <div className="flex items-center justify-center h-72">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "oklch(0.55 0.19 250)" }} />
      </div>
    </div>
  );

  if (!batch) return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Header />
      <div className="flex items-center justify-center h-72">
        <p style={{ color: "var(--text-muted)" }}>Batch not found.</p>
      </div>
    </div>
  );

  const progress = batch.total_files > 0
    ? Math.round(((batch.completed_files + batch.failed_files) / batch.total_files) * 100)
    : 0;

  const isFinished = ["COMPLETED", "FAILED", "PARTIAL SUCCESS"].includes(batch.status);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border p-6 mb-6"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-default)", boxShadow: "var(--shadow-md)" }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4" style={{ color: "oklch(0.55 0.19 250)" }} />
                <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{batch.batch_uuid}</p>
              </div>
              <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                Batch Progress
              </h1>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Started {new Date(batch.created_at).toLocaleString()}
              </p>
            </div>
            <StatusBadge status={batch.status} />
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
              <span>{progress}% complete</span>
              <span>{batch.completed_files + batch.failed_files} / {batch.total_files} processed</span>
            </div>
            <div className="w-full rounded-full h-3 overflow-hidden" style={{ background: "var(--bg-input)" }}>
              <motion.div
                className="h-3 rounded-full"
                style={{ background: "var(--gradient-hero)" }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut", duration: 0.6 }}
              />
            </div>
          </div>

          {/* Stat chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Pending", value: batch.pending_files, color: "oklch(0.78 0.15 75)" },
              { label: "Processing", value: batch.processing_files, color: "oklch(0.55 0.19 250)" },
              { label: "Completed", value: batch.completed_files, color: "oklch(0.68 0.17 145)" },
              { label: "Failed", value: batch.failed_files, color: "oklch(0.60 0.20 25)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl p-3 text-center"
                style={{ background: "var(--bg-input)" }}>
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {batch.failed_files > 0 && (
              <button onClick={handleRetry}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer text-white"
                style={{ background: "oklch(0.55 0.19 250)" }}>
                <RefreshCw className="w-3.5 h-3.5" /> Retry Failed ({batch.failed_files})
              </button>
            )}
            {!isFinished && (
              <button onClick={handleCancel}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                style={{ background: "oklch(0.60 0.20 25 / 0.12)", color: "oklch(0.60 0.20 25)", border: "1px solid oklch(0.60 0.20 25 / 0.3)" }}>
                <XCircle className="w-3.5 h-3.5" /> Cancel Batch
              </button>
            )}
            {/* Export dropdown */}
            <div className="relative">
              <button onClick={() => setShowExport((v) => !v)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                style={{ background: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
                <Download className="w-3.5 h-3.5" /> Export Results <ChevronDown className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {showExport && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="absolute top-full left-0 mt-1 rounded-xl border overflow-hidden z-20 min-w-[160px]"
                    style={{ background: "var(--bg-card)", borderColor: "var(--border-default)", boxShadow: "var(--shadow-lg)" }}
                  >
                    {EXPORT_FORMATS.map((f) => (
                      <button key={f.value} onClick={() => handleExport(f.value)}
                        className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                        style={{ color: "var(--text-primary)" }}>
                        {f.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {actionMsg && (
            <p className="text-xs mt-3" style={{ color: "oklch(0.55 0.19 250)" }}>{actionMsg}</p>
          )}
        </motion.div>

        {/* Job list */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
            Files ({batch.jobs.length})
          </h2>
          <div className="space-y-2">
            {batch.jobs.map((job, idx) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="rounded-xl border overflow-hidden"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-default)" }}
              >
                <button
                  className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                  onClick={() => job.status === "COMPLETED" && toggleJob(job.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <JobStatusIcon status={job.status} />
                    <span className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {job.file_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={job.status} />
                    {job.status === "COMPLETED" && (
                      <ChevronDown
                        className="w-3.5 h-3.5 transition-transform"
                        style={{
                          color: "var(--text-muted)",
                          transform: expandedJobs.has(job.id) ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                      />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {expandedJobs.has(job.id) && job.status === "COMPLETED" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t px-4 py-3"
                      style={{ borderColor: "var(--border-default)" }}
                    >
                      {job.ocr_result?.pages?.map((page) => (
                        <div key={page.page} className="mb-3">
                          <p className="text-[11px] font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                            Page {page.page} · {page.engine} · {(page.confidence * 100).toFixed(0)}% confidence
                          </p>
                          <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed"
                            style={{ color: "var(--text-secondary)" }}>
                            {page.text || "(no text)"}
                          </pre>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {job.error_message && (
                  <div className="px-4 pb-3">
                    <p className="text-[11px]" style={{ color: "oklch(0.60 0.20 25)" }}>
                      Error: {job.error_message}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
