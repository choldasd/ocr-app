"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Eye, Download, CheckCircle2, AlertCircle, Clock,
  Loader2, ChevronLeft, ChevronRight, History
} from "lucide-react";
import Header from "@/components/Header";
import { listBatches, getBatchExportUrl } from "@/services/api";

interface Batch {
  id: number;
  batch_uuid: string;
  status: string;
  total_files: number;
  completed_files: number;
  failed_files: number;
  pending_files: number;
  processing_files: number;
  created_at: string;
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

function StatusIcon({ status }: { status: string }) {
  if (status === "COMPLETED") return <CheckCircle2 className="w-3.5 h-3.5" style={{ color: STATUS_COLORS.COMPLETED }} />;
  if (status === "FAILED") return <AlertCircle className="w-3.5 h-3.5" style={{ color: STATUS_COLORS.FAILED }} />;
  if (status === "PROCESSING") return <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: STATUS_COLORS.PROCESSING }} />;
  return <Clock className="w-3.5 h-3.5" style={{ color: STATUS_COLORS.PENDING }} />;
}

const PAGE_SIZE = 15;

export default function BatchHistoryPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listBatches(page * PAGE_SIZE, PAGE_SIZE)
      .then((data) => {
        setBatches(data.batches);
        setTotal(data.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(0.55 0.19 250 / 0.12)" }}>
              <History className="w-4.5 h-4.5" style={{ color: "oklch(0.55 0.19 250)" }} />
            </div>
            <h1 className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>Batch History</h1>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            View and manage all previous batch processing runs.
          </p>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-default)", boxShadow: "var(--shadow-md)" }}
        >
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 border-b text-[11px] font-semibold uppercase tracking-wider"
            style={{ borderColor: "var(--border-default)", color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
            <span>Batch ID</span>
            <span className="text-right">Total</span>
            <span className="text-right">Done</span>
            <span className="text-right">Failed</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: "oklch(0.55 0.19 250)" }} />
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No batch runs yet.</p>
              <Link href="/batch-upload"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ background: "var(--gradient-hero)" }}>
                Start a Batch
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-default)]">
              {batches.map((batch, idx) => (
                <motion.div
                  key={batch.batch_uuid}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-[var(--bg-hover)] transition-colors"
                >
                  {/* Batch ID + date */}
                  <div>
                    <p className="text-xs font-mono font-medium truncate max-w-[220px]"
                      style={{ color: "var(--text-primary)" }}>
                      {batch.batch_uuid.slice(0, 18)}…
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {new Date(batch.created_at).toLocaleString()}
                    </p>
                  </div>

                  <span className="text-sm font-semibold text-right" style={{ color: "var(--text-primary)" }}>
                    {batch.total_files}
                  </span>
                  <span className="text-sm font-semibold text-right" style={{ color: "oklch(0.68 0.17 145)" }}>
                    {batch.completed_files}
                  </span>
                  <span className="text-sm font-semibold text-right" style={{ color: "oklch(0.60 0.20 25)" }}>
                    {batch.failed_files}
                  </span>

                  {/* Status */}
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold w-fit"
                    style={{ background: STATUS_BG[batch.status] || STATUS_BG.PENDING, color: STATUS_COLORS[batch.status] || STATUS_COLORS.PENDING }}>
                    <StatusIcon status={batch.status} />
                    {batch.status}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link href={`/batch/${batch.batch_uuid}`}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}
                      title="View Details">
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => window.open(getBatchExportUrl(batch.batch_uuid, "json"), "_blank")}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                      style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}
                      title="Download Results (JSON)">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t"
              style={{ borderColor: "var(--border-default)", background: "var(--bg-secondary)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-40 cursor-pointer"
                  style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {page + 1} / {totalPages}
                </span>
                <button
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-40 cursor-pointer"
                  style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
