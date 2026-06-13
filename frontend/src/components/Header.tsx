"use client";

import { useTheme } from "@/hooks/useTheme";
import { ScanText, Sun, Moon, Activity, Upload, History, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Single OCR", icon: ScanText },
  { href: "/batch-upload", label: "Batch Upload", icon: Upload },
  { href: "/batches", label: "History", icon: History },
  { href: "/batch-analytics", label: "Analytics", icon: BarChart3 },
];

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 backdrop-blur-xl border-b"
      style={{
        background: theme === "dark"
          ? "rgba(11, 15, 26, 0.88)"
          : "rgba(255, 255, 255, 0.88)",
        borderColor: "var(--border-default)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "var(--gradient-hero)",
                boxShadow: "0 0 18px -4px oklch(0.55 0.19 250 / 0.45)",
              }}
            >
              <ScanText className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight leading-none" style={{ color: "var(--text-primary)" }}>
                OCR<span style={{ color: "oklch(0.65 0.17 180)" }}>.</span>ai
              </p>
              <p className="text-[9px] font-medium tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                Document Intelligence
              </p>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: active ? "oklch(0.55 0.19 250 / 0.12)" : "transparent",
                    color: active ? "oklch(0.55 0.19 250)" : "var(--text-secondary)",
                    border: active ? "1px solid oklch(0.55 0.19 250 / 0.25)" : "1px solid transparent",
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <div
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}
            >
              <Activity className="w-3 h-3" style={{ color: "oklch(0.68 0.17 145)" }} />
              <span>CPU Mode</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
              style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
