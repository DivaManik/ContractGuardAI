"use client";
import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { IconDocument } from "../components/Icons";
import { useLanguage } from "../components/LanguageProvider";
import { useWalletModal } from "../components/WalletProvider";
import { useContracts, type ContractStatus, type OnChainContract } from "../lib/useContracts";

const glass = {
  background: "var(--surface)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid var(--border)",
  boxShadow: "var(--glass-shadow)",
  borderRadius: "16px",
} as const;

const STATUS_STYLES: Record<ContractStatus, { bg: string; text: string; border: string }> = {
  Active:    { bg: "rgba(80,220,140,0.10)",  text: "rgba(80,220,140,0.90)",   border: "rgba(80,220,140,0.28)" },
  Draft:     { bg: "var(--surface-2)",        text: "var(--text-2)",           border: "var(--border)" },
  Completed: { bg: "rgba(100,160,255,0.10)", text: "rgba(130,180,255,0.90)",  border: "rgba(100,160,255,0.28)" },
  Disputed:  { bg: "rgba(255,80,80,0.10)",   text: "rgba(255,120,120,0.90)", border: "rgba(255,80,80,0.28)" },
  Cancelled: { bg: "rgba(255,150,80,0.10)",  text: "rgba(255,180,100,0.90)", border: "rgba(255,150,80,0.28)" },
};

type Filter = "All" | ContractStatus;
const FILTERS: Filter[] = ["All", "Active", "Draft", "Completed", "Disputed", "Cancelled"];

function StatusPill({ status }: { status: ContractStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span style={{
      fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.8px",
      padding: "4px 11px", borderRadius: "999px",
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
    }}>{status.toUpperCase()}</span>
  );
}

function ProgressBar({ completed, total, checkpointsLabel = "checkpoints" }: {
  completed: number; total: number; checkpointsLabel?: string;
}) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "11.5px", color: "var(--text-3)" }}>
          {completed}/{total} {checkpointsLabel}
        </span>
        <span style={{ fontSize: "11.5px", color: "var(--text-2)", fontWeight: 600 }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div style={{ height: "4px", borderRadius: "999px", background: "var(--border-light)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: "999px", width: `${pct}%`,
          background: pct === 100 ? "rgba(80,220,140,0.80)" : "var(--accent)",
          transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ ...glass, padding: "24px 28px", display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "24px", alignItems: "center" }}>
          <div>
            <div style={{ height: "12px", width: "80px", borderRadius: "6px", background: "var(--border)", marginBottom: "10px", animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ height: "16px", width: "220px", borderRadius: "6px", background: "var(--border)", marginBottom: "8px", animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ height: "12px", width: "140px", borderRadius: "6px", background: "var(--border)", animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
          <div>
            <div style={{ height: "12px", width: "100px", borderRadius: "6px", background: "var(--border)", marginBottom: "14px", animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ height: "4px", borderRadius: "999px", background: "var(--border)", animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
            <div style={{ height: "22px", width: "100px", borderRadius: "6px", background: "var(--border)", animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ height: "12px", width: "60px", borderRadius: "6px", background: "var(--border)", animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ContractCard({ contract, index, t }: { contract: OnChainContract; index: number; t: (k: string) => string }) {
  return (
    <Link key={contract.id} href={`/dashboard/${contract.id}`} style={{ textDecoration: "none" }}>
      <div style={{
        ...glass, padding: "24px 28px", cursor: "pointer",
        transition: "border-color 0.25s ease, background 0.25s ease, transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease",
        display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "24px", alignItems: "center",
        animation: `fadeSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) ${index * 0.07}s both`,
      }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = "var(--border-strong)";
          el.style.background = "var(--surface-2)";
          el.style.transform = "translateY(-3px)";
          el.style.boxShadow = "var(--glass-shadow)";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = "var(--border)";
          el.style.background = "var(--surface)";
          el.style.transform = "translateY(0)";
          el.style.boxShadow = "var(--glass-shadow)";
        }}
      >
        {/* Left: title + contractor */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            {contract.status === "Active" && (
              <span className="pulse-dot" style={{
                width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0,
                background: "rgba(80,220,140,0.90)", boxShadow: "0 0 6px rgba(80,220,140,0.60)",
              }} />
            )}
            <StatusPill status={contract.status} />
            <span style={{ fontSize: "10.5px", color: "var(--text-4)" }}>{contract.createdAt}</span>
            {contract.role === "contractor" && (
              <span style={{ fontSize: "10px", color: "var(--text-4)", padding: "2px 7px", border: "1px solid var(--border)", borderRadius: "999px" }}>
                as contractor
              </span>
            )}
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)", marginBottom: "6px", letterSpacing: "-0.02em" }}>
            {contract.title}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--text-4)" }} />
            <span style={{ fontSize: "13px", color: "var(--text-3)" }}>{contract.contractor}</span>
            <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--text-4)" }}>
              {contract.contractorWallet}
            </span>
          </div>
        </div>

        {/* Middle: progress */}
        <div>
          <div style={{ fontSize: "11.5px", color: "var(--text-4)", marginBottom: "10px" }}>
            {t("dash.current")} <span style={{ color: "var(--text-2)", fontWeight: 600 }}>{contract.checkpoints.current}</span>
          </div>
          <ProgressBar
            completed={contract.checkpoints.completed}
            total={contract.checkpoints.total}
            checkpointsLabel={t("dash.checkpoints")}
          />
        </div>

        {/* Right: amount + score */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
          <div style={{
            fontSize: "18px", fontWeight: 900, letterSpacing: "-0.03em",
            background: "linear-gradient(135deg, var(--accent-2), var(--accent))",
            WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            {contract.totalAmount}
          </div>
          {contract.fairnessScore > 0 && (
            <div style={{ fontSize: "11px", color: "var(--text-4)" }}>
              {t("dash.fairness")} {contract.fairnessScore}/10
            </div>
          )}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.35 }}>
            <path d="M4 8H12M12 8L8 4M12 8L8 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [filter, setFilter] = useState<Filter>("All");
  const { contracts, loading, error, refetch } = useContracts();

  const filtered = filter === "All" ? contracts : contracts.filter(c => c.status === filter);

  const totalEscrow = contracts
    .filter(c => c.status === "Active")
    .reduce((sum, c) => {
      const num = parseFloat(c.totalAmount.replace(/[^0-9.]/g, ""));
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

  const escrowLabel = totalEscrow > 0
    ? `${totalEscrow.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDt`
    : "—";

  const stats = [
    { label: t("dash.statTotal"),     value: contracts.length },
    { label: t("dash.statActive"),    value: contracts.filter(c => c.status === "Active").length },
    { label: t("dash.statCompleted"), value: contracts.filter(c => c.status === "Completed").length },
    { label: t("dash.statEscrow"),    value: escrowLabel },
  ];

  return (
    <main style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--text)" }}>
      <Navbar />

      <div style={{
        position: "fixed", pointerEvents: "none", zIndex: 0,
        top: "30%", left: "50%", transform: "translate(-50%, -50%)",
        width: "70%", height: "60%",
        background: "radial-gradient(ellipse, var(--orb) 0%, transparent 65%)",
        filter: "blur(70px)",
      }} />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "110px 80px 80px", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px" }}>
          <div>
            <div className="page-in p0" style={{
              display: "inline-flex", alignItems: "center",
              border: "1px solid var(--accent-border-strong)", borderRadius: "999px",
              padding: "4px 14px", fontSize: "11px",
              color: "var(--accent-text)", background: "var(--accent-bg)",
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              boxShadow: "inset 0 1px 0 var(--accent-glow), 0 0 14px var(--accent-glow)",
              marginBottom: "14px", letterSpacing: "1.5px",
            }}>
              {t("dash.badge")}
            </div>
            <h1 className="page-in p1" style={{
              fontSize: "clamp(30px,3.5vw,44px)", fontWeight: 900,
              letterSpacing: "-0.04em", color: "var(--text)", lineHeight: 1.0,
            }}>
              {t("dash.headline")}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {connected && (
              <button onClick={refetch} style={{
                background: "var(--surface-2)", border: "1px solid var(--border)",
                color: "var(--text-3)", borderRadius: "7px", padding: "10px 16px",
                cursor: "pointer", fontSize: "13px", fontWeight: 600,
                fontFamily: "var(--font-dm), 'DM Sans', sans-serif",
                display: "flex", alignItems: "center", gap: "6px",
                transition: "border-color 0.2s, color 0.2s",
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)";
                }}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M12.5 7A5.5 5.5 0 1 1 7 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  <path d="M7 1.5L10 4.5M7 1.5L10 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Refresh
              </button>
            )}
            <Link href="/create" className="page-in p2" style={{
              background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)", fontWeight: 700,
              fontSize: "13.5px", padding: "12px 26px", borderRadius: "7px",
              textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px",
              boxShadow: "var(--glass-shadow)", transition: "opacity 0.2s, transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.opacity = "0.88";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              }}
              onMouseDown={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.97)"; }}
              onMouseUp={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)"; }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {t("dash.newContract")}
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="page-in p3" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "32px" }}>
          {stats.map((s, i) => (
            <div key={i} className="card-lift" style={{ ...glass, padding: "22px 24px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "1.6px", color: "var(--text-3)", marginBottom: "8px" }}>{s.label}</div>
              <div className="num-glow" style={{
                fontSize: "28px", fontWeight: 900, letterSpacing: "-0.04em",
                background: "linear-gradient(135deg, var(--accent-2) 0%, var(--accent) 50%, var(--shimmer-mid) 100%)",
                WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                {loading ? "—" : s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Wallet not connected */}
        {!connected && (
          <div style={{ ...glass, padding: "64px 48px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px", opacity: 0.20 }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
                <path d="M16 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor" />
                <path d="M2 10h20" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-3)", marginBottom: "8px" }}>
              Connect your wallet to view contracts
            </div>
            <div style={{ fontSize: "13.5px", color: "var(--text-4)", marginBottom: "28px", maxWidth: "360px", lineHeight: 1.7 }}>
              Your on-chain contracts will appear here once you connect.
            </div>
            <button onClick={() => setVisible(true)} style={{
              background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)",
              fontSize: "13.5px", fontWeight: 700, padding: "12px 26px", borderRadius: "7px",
              border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px",
              fontFamily: "var(--font-dm), 'DM Sans', sans-serif",
            }}>
              Connect Wallet
            </button>
          </div>
        )}

        {/* Error */}
        {connected && error && (
          <div style={{ ...glass, padding: "28px", textAlign: "center", color: "rgba(255,120,120,0.90)", fontSize: "14px" }}>
            {error}
            <button onClick={refetch} style={{
              marginLeft: "16px", background: "none", border: "1px solid currentColor",
              color: "inherit", borderRadius: "6px", padding: "6px 14px", cursor: "pointer", fontSize: "12px",
              fontFamily: "var(--font-dm), 'DM Sans', sans-serif",
            }}>
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {connected && loading && !error && (
          <>
            <style>{`@keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }`}</style>
            <LoadingSkeleton />
          </>
        )}

        {/* Contracts list */}
        {connected && !loading && !error && (
          <>
            {/* Filter tabs */}
            <div className="page-in p4" style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
              {FILTERS.filter(f => f === "All" || contracts.some(c => c.status === f)).map(f => {
                const label = f === "All" ? t("dash.filterAll") : f;
                const count = f === "All" ? contracts.length : contracts.filter(c => c.status === f).length;
                return (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    padding: "8px 18px", borderRadius: "8px", cursor: "pointer",
                    fontSize: "13px", fontWeight: filter === f ? 700 : 400,
                    background: filter === f ? "var(--accent-bg)" : "transparent",
                    color: filter === f ? "var(--accent-text)" : "var(--text-3)",
                    border: filter === f ? "1px solid var(--accent-border)" : "1px solid transparent",
                    fontFamily: "var(--font-dm), 'DM Sans', sans-serif",
                    transition: "all 0.2s",
                    boxShadow: filter === f ? "inset 0 1px 0 var(--accent-glow)" : "none",
                  } as React.CSSProperties}>
                    {label}
                    <span style={{ marginLeft: "6px", fontSize: "10.5px", opacity: 0.6 }}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filtered.map((contract, i) => (
                <ContractCard key={contract.id} contract={contract} index={i} t={t} />
              ))}

              {filtered.length === 0 && (
                <div style={{ ...glass, padding: "64px 48px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px", opacity: 0.20 }}>
                    <IconDocument size={52} color="currentColor" strokeWidth={1.4} />
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-3)", marginBottom: "8px" }}>
                    {t("dash.emptyTitle")}
                  </div>
                  <div style={{ fontSize: "13.5px", color: "var(--text-4)", marginBottom: "28px", maxWidth: "360px", lineHeight: 1.7 }}>
                    {t("dash.emptyDesc")}
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                    <Link href="/audit" style={{
                      background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)",
                      fontSize: "13.5px", fontWeight: 700, padding: "12px 26px", borderRadius: "7px",
                      textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px",
                      transition: "opacity 0.2s",
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = "0.88"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M0 6.5A6.5 6.5 0 1 0 13 6.5A6.5 6.5 0 0 0 0 6.5Z" stroke="currentColor" strokeWidth="1.6" />
                        <path d="M11.5 11.5L13.5 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      {t("dash.emptyAudit")}
                    </Link>
                    <Link href="/create" style={{
                      background: "var(--btn-ghost-bg)", color: "var(--btn-ghost-text)",
                      fontSize: "13.5px", fontWeight: 600, padding: "12px 22px", borderRadius: "7px",
                      border: "1px solid var(--btn-ghost-border)", textDecoration: "none",
                      display: "inline-flex", alignItems: "center", gap: "8px",
                      transition: "background 0.2s, border-color 0.2s",
                    }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLAnchorElement).style.background = "var(--surface)";
                        (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border-strong)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLAnchorElement).style.background = "var(--btn-ghost-bg)";
                        (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--btn-ghost-border)";
                      }}
                    >
                      {t("dash.createContract")}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

      </div>
      <Footer />
    </main>
  );
}
