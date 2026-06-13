"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, Layers, CheckCircle2, AlertCircle,
  Clock, TrendingUp, Loader2, RefreshCw
} from "lucide-react";
import Header from "@/components/Header";
import { getBatchAnalytics } from "@/services/api";

interface Analytics {
  total_batches: number;
  total_files_processed: number;
  total_files_failed: number;
  avg_processing_time_sec: number;
  success_rate_percent: number;
  failure_rate_percent: number;
}

interface KPICardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  iconColor: string;
  iconBg: string;
  delay?: number;
}

function KPICard({ icon: Icon, label, value, sub, iconColor, iconBg, delay = 0 }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: "easeOut" }}
      whileHover={{ y: -3, boxShadow: "var(--shadow-lg)" }}
      className="rounded-2xl border p-5 flex flex-col gap-3 transition-all"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border-default)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
          {value}
        </p>
        <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>
          {label}
        </p>
        {sub && (
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function RateBar({ label, rate, color }: { label: string; rate: number; color: string }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>
        <span className="font-medium">{label}</span>
        <span className="font-semibold">{rate.toFixed(1)}%</span>
      </div>
      <div className="w-full rounded-full h-2.5 overflow-hidden" style={{ background: "var(--bg-input)" }}>
        <motion.div
          className="h-2.5 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${rate}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

export default function BatchAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getBatchAnalytics();
      setAnalytics(data);
    } catch {
      setError("Failed to load analytics. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Page hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between flex-wrap gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "oklch(0.75 0.14 180 / 0.12)" }}>
                <BarChart3 className="w-4.5 h-4.5" style={{ color: "oklch(0.75 0.14 180)" }} />
              </div>
              <h1 className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>
                Batch Analytics
              </h1>
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Aggregated statistics across all batch processing runs.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={fetchAnalytics}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            style={{ background: "var(--bg-input)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </motion.button>
        </motion.div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "oklch(0.55 0.19 250)" }} />
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border p-6 flex items-center gap-3"
            style={{ background: "oklch(0.60 0.20 25 / 0.08)", borderColor: "oklch(0.60 0.20 25 / 0.3)" }}
          >
            <AlertCircle className="w-5 h-5 shrink-0" style={{ color: "oklch(0.60 0.20 25)" }} />
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>{error}</p>
          </motion.div>
        )}

        {analytics && !loading && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KPICard
                icon={Layers}
                label="Total Batches"
                value={analytics.total_batches.toLocaleString()}
                sub="all time"
                iconColor="oklch(0.55 0.19 250)"
                iconBg="oklch(0.55 0.19 250 / 0.12)"
                delay={0.05}
              />
              <KPICard
                icon={CheckCircle2}
                label="Files Processed"
                value={analytics.total_files_processed.toLocaleString()}
                sub="completed successfully"
                iconColor="oklch(0.68 0.17 145)"
                iconBg="oklch(0.68 0.17 145 / 0.12)"
                delay={0.1}
              />
              <KPICard
                icon={AlertCircle}
                label="Files Failed"
                value={analytics.total_files_failed.toLocaleString()}
                sub="encountered errors"
                iconColor="oklch(0.60 0.20 25)"
                iconBg="oklch(0.60 0.20 25 / 0.12)"
                delay={0.15}
              />
              <KPICard
                icon={Clock}
                label="Avg. Processing Time"
                value={
                  analytics.avg_processing_time_sec < 60
                    ? `${analytics.avg_processing_time_sec.toFixed(1)}s`
                    : `${(analytics.avg_processing_time_sec / 60).toFixed(1)}m`
                }
                sub="per file"
                iconColor="oklch(0.78 0.15 75)"
                iconBg="oklch(0.78 0.15 75 / 0.12)"
                delay={0.2}
              />
            </div>

            {/* Success / Failure rate panel */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="rounded-2xl border p-6 mb-8"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-default)", boxShadow: "var(--shadow-md)" }}
            >
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-4.5 h-4.5" style={{ color: "oklch(0.75 0.14 180)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Success vs. Failure Rate
                </h2>
              </div>
              <RateBar
                label="Success Rate"
                rate={analytics.success_rate_percent}
                color="oklch(0.68 0.17 145)"
              />
              <RateBar
                label="Failure Rate"
                rate={analytics.failure_rate_percent}
                color="oklch(0.60 0.20 25)"
              />

              {/* Visual donut-style split */}
              <div className="mt-6 flex items-center gap-4">
                <div className="relative w-24 h-24 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                    <circle cx="18" cy="18" r="15.9155" fill="none"
                      stroke="var(--bg-input)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9155" fill="none"
                      stroke="oklch(0.68 0.17 145)" strokeWidth="3"
                      strokeDasharray={`${analytics.success_rate_percent} ${100 - analytics.success_rate_percent}`}
                      strokeDashoffset="0" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                      {analytics.success_rate_percent.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: "oklch(0.68 0.17 145)" }} />
                    <span style={{ color: "var(--text-secondary)" }}>
                      {analytics.total_files_processed.toLocaleString()} files succeeded
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: "oklch(0.60 0.20 25)" }} />
                    <span style={{ color: "var(--text-secondary)" }}>
                      {analytics.total_files_failed.toLocaleString()} files failed
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: "oklch(0.55 0.19 250)" }} />
                    <span style={{ color: "var(--text-secondary)" }}>
                      {analytics.total_batches.toLocaleString()} total batches
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Empty-state prompt */}
            {analytics.total_batches === 0 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="text-center py-8"
              >
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No batch data yet.{" "}
                  <a href="/batch-upload" className="font-semibold"
                    style={{ color: "oklch(0.55 0.19 250)" }}>
                    Start your first batch →
                  </a>
                </p>
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
