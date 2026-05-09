"use client";
import { useEffect, useState, useCallback } from "react";
import { IconCheckCircle, IconXCircle, IconInfo, IconAlertTriangle, IconX } from "./Icons";

/* ─────────────────────────────────────────────
   Toast system — module-level store (no Context needed)
   Usage anywhere:
     import { toast } from "@/app/components/Toast"
     toast.success("Contract deployed!")
     toast.error("Transaction failed")
     toast.info("Connecting wallet...")
     toast.warning("High-risk clause found")
─────────────────────────────────────────────── */

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  description?: string;
  type: ToastType;
  entering: boolean;
  leaving: boolean;
}

/* module-level state */
let items: ToastItem[] = [];
let listeners: Set<() => void> = new Set();

function notify() { listeners.forEach(fn => fn()); }

function add(message: string, type: ToastType, description?: string) {
  const id = Math.random().toString(36).slice(2);
  items = [{ id, message, description, type, entering: true, leaving: false }, ...items];
  notify();

  /* remove 'entering' flag after animation */
  setTimeout(() => {
    items = items.map(t => t.id === id ? { ...t, entering: false } : t);
    notify();
  }, 320);

  /* auto-dismiss */
  setTimeout(() => dismiss(id), 4200);
}

function dismiss(id: string) {
  items = items.map(t => t.id === id ? { ...t, leaving: true } : t);
  notify();
  setTimeout(() => {
    items = items.filter(t => t.id !== id);
    notify();
  }, 340);
}

/* public API */
export const toast = {
  success: (message: string, description?: string) => add(message, "success", description),
  error:   (message: string, description?: string) => add(message, "error",   description),
  info:    (message: string, description?: string) => add(message, "info",    description),
  warning: (message: string, description?: string) => add(message, "warning", description),
};

/* ── config per type ── */
const CONFIG: Record<ToastType, {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  iconColor: string;
  border: string;
  bg: string;
  glow: string;
  bar: string;
  label: string;
}> = {
  success: {
    icon: IconCheckCircle,
    iconColor: "rgba(80,220,140,0.90)",
    border: "rgba(80,220,140,0.22)",
    bg: "rgba(80,220,140,0.06)",
    glow: "rgba(80,220,140,0.08)",
    bar: "rgba(80,220,140,0.70)",
    label: "Success",
  },
  error: {
    icon: IconXCircle,
    iconColor: "rgba(255,100,100,0.90)",
    border: "rgba(255,100,100,0.22)",
    bg: "rgba(255,80,80,0.06)",
    glow: "rgba(255,80,80,0.08)",
    bar: "rgba(255,100,100,0.70)",
    label: "Error",
  },
  warning: {
    icon: IconAlertTriangle,
    iconColor: "rgba(255,210,80,0.90)",
    border: "rgba(255,210,80,0.22)",
    bg: "rgba(255,190,0,0.06)",
    glow: "rgba(255,190,0,0.08)",
    bar: "rgba(255,210,80,0.70)",
    label: "Warning",
  },
  info: {
    icon: IconInfo,
    iconColor: "rgba(130,190,255,0.90)",
    border: "rgba(100,170,255,0.22)",
    bg: "rgba(80,140,255,0.06)",
    glow: "rgba(80,140,255,0.08)",
    bar: "rgba(130,190,255,0.70)",
    label: "Info",
  },
};

/* ── single toast item ── */
function ToastCard({ item }: { item: ToastItem }) {
  const [progress, setProgress] = useState(100);
  const cfg = CONFIG[item.type];
  const Icon = cfg.icon;

  useEffect(() => {
    const start = Date.now();
    const duration = 4200;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.max(0, 100 - (elapsed / duration) * 100));
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const slideIn = item.entering ? {
    opacity: 0,
    transform: "translateX(24px) scale(0.96)",
  } : item.leaving ? {
    opacity: 0,
    transform: "translateX(24px) scale(0.96)",
  } : {
    opacity: 1,
    transform: "translateX(0) scale(1)",
  };

  return (
    <div style={{
      position: "relative", overflow: "hidden",
      minWidth: "300px", maxWidth: "380px",
      background: "rgba(14,14,14,0.92)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      border: `1px solid ${cfg.border}`,
      borderRadius: "14px",
      padding: "14px 16px 14px 14px",
      boxShadow: `0 8px 32px rgba(0,0,0,0.65), 0 0 0 0.5px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.10)`,
      display: "flex", gap: "12px", alignItems: "flex-start",
      transition: "opacity 0.30s ease, transform 0.30s cubic-bezier(0.34,1.56,0.64,1)",
      ...slideIn,
    }}>
      {/* icon */}
      <div style={{ flexShrink: 0, marginTop: "1px" }}>
        <Icon size={18} color={cfg.iconColor} strokeWidth={1.8} />
      </div>

      {/* content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "13.5px", fontWeight: 700, color: "white",
          marginBottom: item.description ? "3px" : "0",
          letterSpacing: "-0.01em",
        }}>{item.message}</div>
        {item.description && (
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.50)", lineHeight: 1.5 }}>
            {item.description}
          </div>
        )}
      </div>

      {/* close */}
      <button
        onClick={() => dismiss(item.id)}
        style={{
          flexShrink: 0, background: "transparent", border: "none",
          cursor: "pointer", padding: "2px", marginTop: "1px",
          color: "rgba(255,255,255,0.28)",
          transition: "color 0.15s",
          display: "flex", alignItems: "center",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
      >
        <IconX size={14} color="currentColor" strokeWidth={2} />
      </button>

      {/* progress bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0,
        height: "2px", borderRadius: "0 0 14px 14px",
        width: `${progress}%`,
        background: cfg.bar,
        transition: "width 0.03s linear",
      }} />
    </div>
  );
}

/* ── container (add to layout) ── */
export function ToastContainer() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const fn = () => setTick(n => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  return (
    <div style={{
      position: "fixed", bottom: "28px", right: "28px",
      zIndex: 9999,
      display: "flex", flexDirection: "column-reverse", gap: "10px",
      pointerEvents: "none",
    }}>
      {items.map(item => (
        <div key={item.id} style={{ pointerEvents: "auto" }}>
          <ToastCard item={item} />
        </div>
      ))}
    </div>
  );
}
