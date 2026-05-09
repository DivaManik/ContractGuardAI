"use client";
import { useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
}

const WALLETS = [
  {
    name: "Phantom",
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="10" fill="#AB9FF2" />
        <path d="M29.5 18.5C29.5 12.4 24.6 7.5 18.5 7.5C12.1 7.5 7 12.9 7 19.3C7 25.1 11.1 29.9 16.6 30.8V27.3C13.1 26.5 10.5 23.2 10.5 19.3C10.5 14.8 14.1 11.1 18.5 11.1C22.9 11.1 26.5 14.8 26.5 19.2V20.2C26.5 21.4 25.6 22.4 24.4 22.4C23.2 22.4 22.3 21.4 22.3 20.2V18.5C22.3 15.7 20 13.5 17.2 13.5C14.4 13.5 12.1 15.8 12.1 18.6C12.1 21.4 14.4 23.7 17.2 23.7C18.7 23.7 20 23.1 21 22.1C21.7 23.1 22.9 23.7 24.3 23.7C27.2 23.7 29.5 21.3 29.5 18.5Z" fill="white"/>
        <circle cx="17.2" cy="18.6" r="2.3" fill="#AB9FF2" />
      </svg>
    ),
    description: "Connect using Phantom browser extension",
    recommended: true,
  },
];

export default function WalletModal({ open, onClose }: WalletModalProps) {
  const { select, wallets, connecting } = useWallet();

  const handleConnect = useCallback((walletName: string) => {
    const wallet = wallets.find(w => w.adapter.name === walletName);
    if (wallet) {
      select(wallet.adapter.name as any);
      onClose();
    } else {
      window.open("https://phantom.app/", "_blank");
    }
  }, [wallets, select, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const phantomInstalled = wallets.some(w => w.adapter.name === "Phantom");

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn 0.18s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "420px", maxWidth: "calc(100vw - 32px)",
          background: "var(--bg)",
          border: "1px solid var(--accent-border)",
          borderRadius: "24px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.50), 0 0 0 1px var(--accent-glow), inset 0 1px 0 var(--border)",
          overflow: "hidden",
          animation: "slideUp 0.24s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Top accent line */}
        <div style={{
          height: "1px",
          background: "linear-gradient(to right, transparent 5%, var(--accent-border-hover) 50%, transparent 95%)",
        }} />

        {/* Header */}
        <div style={{
          padding: "28px 28px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          <div>
            <h2 style={{
              fontSize: "18px", fontWeight: 800,
              color: "var(--text)", letterSpacing: "-0.03em",
              marginBottom: "6px",
            }}>Connect Wallet</h2>
            <p style={{ fontSize: "13px", color: "var(--text-3)", lineHeight: 1.5 }}>
              Choose a wallet to connect to ContractGuard AI
            </p>
          </div>
          <button onClick={onClose} style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-3)", flexShrink: 0,
            transition: "background 0.15s, color 0.15s",
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)";
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Wallet list */}
        <div style={{ padding: "0 16px 16px" }}>
          {WALLETS.map(wallet => (
            <button
              key={wallet.name}
              onClick={() => handleConnect(wallet.name)}
              disabled={connecting}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "16px",
                padding: "16px 16px", borderRadius: "14px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                cursor: connecting ? "wait" : "pointer",
                textAlign: "left",
                transition: "background 0.2s, border-color 0.2s, transform 0.18s",
                marginBottom: "8px",
                fontFamily: "var(--font-dm), 'DM Sans', sans-serif",
                position: "relative", overflow: "hidden",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.background = "var(--accent-bg)";
                el.style.borderColor = "var(--accent-border-strong)";
                el.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.background = "var(--surface-2)";
                el.style.borderColor = "var(--border)";
                el.style.transform = "translateY(0)";
              }}
            >
              {/* Icon */}
              <div style={{ flexShrink: 0 }}>{wallet.icon}</div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
                    {wallet.name}
                  </span>
                  {wallet.recommended && (
                    <span style={{
                      fontSize: "9.5px", letterSpacing: "1.2px",
                      color: "var(--accent-text)",
                      border: "1px solid var(--accent-border)",
                      borderRadius: "999px", padding: "2px 8px",
                      background: "var(--accent-bg)",
                    }}>RECOMMENDED</span>
                  )}
                </div>
                <p style={{ fontSize: "12.5px", color: "var(--text-3)", margin: 0 }}>
                  {phantomInstalled ? wallet.description : "Not installed — click to install"}
                </p>
              </div>

              {/* Arrow */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: "var(--text-4)" }}>
                <path d="M3 8H13M13 8L8 3M13 8L8 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 28px 24px",
          borderTop: "1px solid var(--border-light)",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="var(--text-4)" strokeWidth="1.2" />
            <line x1="7" y1="6" x2="7" y2="10" stroke="var(--text-4)" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="7" cy="4.2" r="0.7" fill="var(--text-4)" />
          </svg>
          <p style={{ fontSize: "12px", color: "var(--text-4)", margin: 0, lineHeight: 1.5 }}>
            By connecting, you agree to let ContractGuard read your wallet address. No transaction will be made without your approval.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
}
