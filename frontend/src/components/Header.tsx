"use client";

import { useTheme } from "@/hooks/useTheme";
import { ScanText, Sun, Moon, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 backdrop-blur-xl border-b"
      style={{
        background: theme === "dark"
          ? "rgba(11, 15, 26, 0.8)"
          : "rgba(255, 255, 255, 0.85)",
        borderColor: "var(--border-default)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "var(--gradient-hero)",
                boxShadow: "0 0 20px -4px oklch(0.55 0.19 250 / 0.4)",
              }}
            >
              <ScanText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1
                className="text-lg font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                OCR<span style={{ color: "oklch(0.65 0.17 180)" }}>.</span>ai
              </h1>
              <p
                className="text-[10px] font-medium tracking-widest uppercase"
                style={{ color: "var(--text-muted)" }}
              >
                Document Intelligence
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: "var(--bg-input)",
                color: "var(--text-secondary)",
              }}
            >
              <Activity className="w-3 h-3" style={{ color: "oklch(0.68 0.17 145)" }} />
              <span>CPU Mode</span>
            </div>

            {/* Theme toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
              style={{
                background: "var(--bg-input)",
                color: "var(--text-secondary)",
              }}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
