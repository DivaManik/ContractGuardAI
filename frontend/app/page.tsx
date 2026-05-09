"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { useLanguage } from "./components/LanguageProvider";

const glass = {
  background: "var(--surface)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid var(--border)",
  boxShadow: "var(--glass-shadow)",
  borderRadius: "16px",
} as const;

function StepIcon({ type }: { type: "review" | "monitor" | "record" }) {
  if (type === "review") return (
    <g>
      <rect x={-8} y={-12} width={16} height={22} rx={3} fill="none" stroke="var(--accent)" strokeWidth={1.7} />
      <line x1={-5} y1={-5} x2={5} y2={-5} stroke="var(--accent)" strokeWidth={1.3} strokeOpacity={.78} />
      <line x1={-5} y1={0} x2={5} y2={0} stroke="var(--accent)" strokeWidth={1.3} strokeOpacity={.78} />
      <line x1={-5} y1={5} x2={1} y2={5} stroke="var(--accent)" strokeWidth={1.3} strokeOpacity={.50} />
    </g>
  );
  if (type === "monitor") return (
    <g>
      <path d="M-11,0 C-6,-8 6,-8 11,0 C6,8 -6,8 -11,0 Z" fill="none" stroke="var(--accent)" strokeWidth={1.7} />
      <circle cx={0} cy={0} r={3.5} fill="none" stroke="var(--accent)" strokeWidth={1.4} />
      <circle cx={0} cy={0} r={1.4} fill="var(--accent)" />
    </g>
  );
  return (
    <g>
      <rect x={-11} y={-5} width={11} height={10} rx={5} fill="none" stroke="var(--accent)" strokeWidth={1.7} />
      <rect x={0} y={-5} width={11} height={10} rx={5} fill="none" stroke="var(--accent)" strokeWidth={1.7} />
    </g>
  );
}

function FeatureIcon({ type }: { type: string }) {
  switch (type) {
    case "audit": return (
      <g>
        <path d="M0,-12 L10,-7 L10,3 L0,12 L-10,3 L-10,-7 Z" fill="none" stroke="var(--accent)" strokeWidth={1.7} />
        <path d="M-4,0.5 L-1,4 L5,-3.5" stroke="var(--accent)" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    );
    case "escrow": return (
      <g>
        <rect x={-9} y={-3} width={18} height={14} rx={3} fill="none" stroke="var(--accent)" strokeWidth={1.7} />
        <path d="M-9,-3 L0,-12 L9,-3" fill="none" stroke="var(--accent)" strokeWidth={1.7} />
        <circle cx={0} cy={4} r={2.5} fill="none" stroke="var(--accent)" strokeWidth={1.4} />
        <line x1={0} y1={6.5} x2={0} y2={9} stroke="var(--accent)" strokeWidth={1.4} />
      </g>
    );
    case "check": return (
      <g>
        <circle cx={0} cy={-6} r={4.5} fill="none" stroke="var(--accent)" strokeWidth={1.6} />
        <line x1={0} y1={-1.5} x2={0} y2={12} stroke="var(--accent)" strokeWidth={1.4} />
        <line x1={-8} y1={2} x2={-2} y2={2} stroke="var(--accent)" strokeWidth={1.3} strokeOpacity={.65} />
        <line x1={-8} y1={7} x2={-2} y2={7} stroke="var(--accent)" strokeWidth={1.3} strokeOpacity={.45} />
        <path d="M2.5,0.5 L4.5,2.5 L8,-1.5" stroke="var(--accent)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    );
    case "chain": return (
      <g>
        <rect x={-11} y={-5} width={11} height={10} rx={5} fill="none" stroke="var(--accent)" strokeWidth={1.7} />
        <rect x={0} y={-5} width={11} height={10} rx={5} fill="none" stroke="var(--accent)" strokeWidth={1.7} />
        <line x1={-8} y1={7} x2={-4} y2={11} stroke="var(--accent)" strokeWidth={1.3} strokeOpacity={.6} />
        <line x1={4} y1={7} x2={8} y2={11} stroke="var(--accent)" strokeWidth={1.3} strokeOpacity={.6} />
      </g>
    );
    default: return null;
  }
}

function IconBox({ type, size = 52 }: { type: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "13px", flexShrink: 0,
      background: "var(--accent-bg)",
      border: "1px solid var(--accent-border)",
      boxShadow: "inset 0 1px 0 var(--accent-bg-hover), 0 0 14px var(--accent-bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="28" height="28" viewBox="-13 -13 26 26" fill="none">
        <FeatureIcon type={type} />
      </svg>
    </div>
  );
}

function BrandLogo({ name }: { name: string }) {
  const s = { flexShrink: 0 as const, display: "block" as const };
  if (name === "Solana") return (
    <svg width="19" height="15" viewBox="0 0 20 17" fill="none" style={s}>
      <path d="M0,0 L13,0 L16,4 L3,4 Z" fill="var(--accent)" />
      <path d="M2,6.5 L15,6.5 L18,10.5 L5,10.5 Z" fill="var(--accent)" fillOpacity={0.80} />
      <path d="M4,13 L17,13 L20,17 L7,17 Z" fill="var(--accent)" fillOpacity={0.60} />
    </svg>
  );
  if (name === "Tether") return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" style={s}>
      <circle cx="10" cy="10" r="9" stroke="var(--accent)" strokeWidth="2" fill="none" />
      <text x="10" y="14.5" textAnchor="middle" fontSize="10" fontWeight="bold" fill="var(--accent)" fontFamily="sans-serif">₮</text>
    </svg>
  );
  if (name === "Phantom") return (
    <svg width="15" height="17" viewBox="0 0 20 22" fill="none" style={s}>
      <path d="M3.5,11 A6.5,6.5 0 0,1 16.5,11 L16.5,19.5 L14.5,17.5 L12,19.5 L9.5,17.5 L7,19.5 L4.5,17.5 L3.5,11 Z" fill="var(--accent)" />
    </svg>
  );
  if (name === "Metaplex") return (
    <svg width="17" height="15" viewBox="0 0 20 20" fill="none" style={s}>
      <path d="M1.5,17 L1.5,4 L10,12 L18.5,4 L18.5,17" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (name === "Colosseum") return (
    <svg width="17" height="14" viewBox="0 0 20 18" fill="none" style={s}>
      <path d="M1,17 L1,11 A9,8 0 0,1 19,11 L19,17" stroke="var(--accent)" strokeWidth="2.2" fill="none" />
      <line x1="1" y1="17" x2="19" y2="17" stroke="var(--accent)" strokeWidth="2" />
      <line x1="5.5" y1="17" x2="5.5" y2="12" stroke="var(--accent)" strokeWidth="1.8" />
      <line x1="10" y1="17" x2="10" y2="11" stroke="var(--accent)" strokeWidth="1.8" />
      <line x1="14.5" y1="17" x2="14.5" y2="12" stroke="var(--accent)" strokeWidth="1.8" />
    </svg>
  );
  if (name === "Superteam") return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" style={s}>
      <polygon points="10,1 12.5,7.5 19.5,7.5 14,11.5 16,18 10,14 4,18 6,11.5 0.5,7.5 7.5,7.5" fill="var(--accent)" />
    </svg>
  );
  return null;
}

function Hero() {
  const { t } = useLanguage();
  const [parallaxY, setParallaxY] = useState(0);
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50 });
  const [spotActive, setSpotActive] = useState(false);

  useEffect(() => {
    const handler = () => setParallaxY(window.scrollY * 0.10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <section style={{
      display: "flex", minHeight: "100vh", paddingTop: "62px",
      overflow: "hidden", alignItems: "stretch",
    }}>
      {/* LEFT TEXT */}
      <div
        style={{
          flex: "0 0 46%", minWidth: 0, position: "relative",
          display: "flex", alignItems: "center",
          padding: "0 40px 0 180px",
        }}
        onMouseMove={e => {
          const r = e.currentTarget.getBoundingClientRect();
          setSpotlight({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          setSpotActive(true);
        }}
        onMouseLeave={() => setSpotActive(false)}
      >
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
          background: spotActive
            ? `radial-gradient(circle at ${spotlight.x}% ${spotlight.y}%, var(--orb) 0%, transparent 62%)`
            : "transparent",
          transition: "background 0.15s ease",
        }} />

        <div style={{ paddingBottom: "80px", position: "relative", zIndex: 1 }}>
          {/* badge */}
          <div className="hero-in h0" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            border: "1px solid var(--border-strong)", borderRadius: "999px",
            padding: "5px 16px 5px 8px", fontSize: "11.5px",
            color: "var(--text-2)",
            background: "var(--surface)",
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            marginBottom: "34px",
          }}>
            <span className="pulse-dot" style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: "var(--accent)", flexShrink: 0,
            }} />
            {t("hero.badge")}
          </div>

          <h1 className="hero-in h1" style={{
            fontSize: "clamp(62px,5.8vw,90px)", fontWeight: 900,
            lineHeight: 1.0, letterSpacing: "-0.04em", color: "var(--text)",
            marginBottom: "26px",
          }}>
            {t("hero.headline1")}<br /><span className="text-shimmer">{t("hero.headline2")}</span>
          </h1>

          <p className="hero-in h2" style={{
            fontSize: "15.5px", lineHeight: 1.78,
            color: "var(--text-3)", maxWidth: "310px",
            marginBottom: "42px",
          }}>
            {t("hero.subtitle")}
          </p>

          <div className="hero-in h3" style={{ display: "flex", gap: "14px", marginBottom: "64px" }}>
            <a href="/audit" style={{
              background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)", fontWeight: 700,
              fontSize: "14px", padding: "14px 32px", borderRadius: "6px",
              textDecoration: "none", letterSpacing: "-0.01em",
              display: "inline-flex", alignItems: "center", gap: "9px",
              boxShadow: "0 0 0 1px var(--border), 0 4px 18px rgba(0,0,0,0.15)",
              transition: "transform 0.22s ease, box-shadow 0.22s ease",
            }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.boxShadow = "0 0 0 1px var(--border-strong), 0 8px 28px rgba(0,0,0,0.22)";
                el.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.boxShadow = "0 0 0 1px var(--border), 0 4px 18px rgba(0,0,0,0.15)";
                el.style.transform = "translateY(0)";
              }}
              onMouseDown={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.97)"; }}
              onMouseUp={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)"; }}
            >
              {t("hero.ctaAudit")}
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M1 7H13M13 7L7 1M13 7L7 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href="/#how-it-works" style={{
              background: "var(--btn-ghost-bg)", color: "var(--btn-ghost-text)",
              fontWeight: 600, fontSize: "14px", padding: "14px 28px",
              borderRadius: "6px", border: "1px solid var(--btn-ghost-border)",
              textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px",
              backdropFilter: "blur(10px)",
              transition: "background 0.2s, border-color 0.2s, transform 0.22s ease",
            }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.background = "var(--surface)";
                el.style.borderColor = "var(--border-strong)";
                el.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.background = "var(--btn-ghost-bg)";
                el.style.borderColor = "var(--btn-ghost-border)";
                el.style.transform = "translateY(0)";
              }}
              onMouseDown={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.97)"; }}
              onMouseUp={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)"; }}
            >
              {t("hero.ctaHowItWorks")}
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" transform="rotate(45 7 7)" />
              </svg>
            </a>
          </div>

          <div className="hero-in h4">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
              <div style={{
                height: "1px", width: "36px", flexShrink: 0,
                background: `linear-gradient(to right, transparent, var(--accent-border-strong))`,
              }} />
              <p style={{
                fontSize: "9.5px", color: "var(--accent-text-dim)",
                letterSpacing: "2.2px", fontWeight: 700,
                textTransform: "uppercase" as const, whiteSpace: "nowrap", margin: 0,
              }}>
                {t("hero.trustedBy")}
              </p>
              <div style={{
                height: "1px", flex: 1,
                background: `linear-gradient(to right, var(--accent-border), transparent)`,
              }} />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px", maxWidth: "360px" }}>
              {["Solana", "Tether", "Phantom", "Metaplex", "Colosseum", "Superteam"].map((n, i) => (
                <div key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  background: "var(--accent-bg)",
                  border: "1px solid var(--accent-border)",
                  borderRadius: "999px",
                  padding: "7px 14px 7px 10px",
                  backdropFilter: "blur(10px)",
                  transition: "background 0.2s, border-color 0.2s, transform 0.2s",
                  cursor: "default",
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.background = "var(--accent-bg-hover)";
                    (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent-border-hover)";
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.background = "var(--accent-bg)";
                    (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent-border)";
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                  }}
                >
                  <BrandLogo name={n} />
                  <span style={{
                    fontSize: "13px", fontWeight: 700,
                    color: "var(--accent-text)", letterSpacing: "-0.01em",
                  }}>{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — image with parallax */}
      <div style={{
        flex: 1, position: "relative", overflow: "hidden", minWidth: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `
            linear-gradient(var(--orb) 1px, transparent 1px),
            linear-gradient(90deg, var(--orb) 1px, transparent 1px)`,
          backgroundSize: "36px 36px",
          WebkitMaskImage: "radial-gradient(ellipse 78% 82% at 52% 50%, black 10%, transparent 85%)",
          maskImage: "radial-gradient(ellipse 78% 82% at 52% 50%, black 10%, transparent 85%)",
        }} />
        <div style={{
          position: "absolute", zIndex: 1, pointerEvents: "none",
          top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: "75%", height: "75%",
          background: "radial-gradient(circle, var(--orb) 0%, transparent 100%)",
          filter: "blur(55px)", borderRadius: "50%",
          animation: "pulseGlow 6s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", zIndex: 3, pointerEvents: "none",
          top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: "90%", aspectRatio: "1",
        }}>
          <svg width="100%" height="100%" viewBox="0 0 100 100"
            style={{ animation: "spinRing 42s linear infinite", display: "block" }}>
            <circle cx="50" cy="50" r="48" fill="none"
              stroke="var(--accent-border)" strokeWidth="0.9" strokeDasharray="4 12" />
          </svg>
        </div>
        <div style={{
          position: "absolute", zIndex: 3, pointerEvents: "none",
          top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: "73%", aspectRatio: "1",
        }}>
          <svg width="100%" height="100%" viewBox="0 0 100 100"
            style={{ animation: "spinRingCCW 28s linear infinite", display: "block" }}>
            <circle cx="50" cy="50" r="48" fill="none"
              stroke="var(--accent-border)" strokeWidth="0.65" strokeDasharray="2 9" strokeOpacity="0.65" />
          </svg>
        </div>
        <div style={{
          position: "relative", zIndex: 4,
          transform: `translateY(-${parallaxY}px)`,
          willChange: "transform",
        }}>
          <div style={{
            width: "640px", height: "640px",
            maxWidth: "92%", flexShrink: 0,
            animation: "floatNode 6s ease-in-out infinite",
          }}>
            <Image src="/contraguardv2.png" alt="ContractGuard AI" fill
              style={{ objectFit: "contain", objectPosition: "center" }} priority />
          </div>
        </div>
        <div style={{
          position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
          background: "radial-gradient(ellipse 78% 84% at 52% 50%, transparent 52%, var(--bg) 92%)",
        }} />
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0, width: "90px",
          background: "linear-gradient(to right, var(--bg) 0%, transparent 100%)",
          zIndex: 6, pointerEvents: "none",
        }} />
      </div>
    </section>
  );
}

// ── AI Chat Demo ────────────────────────────────────────────

type ChatMsg = {
  role: "user" | "ai";
  text: string;
  kind: "file" | "text" | "warn" | "success";
  typingMs?: number;
};

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: "4px", padding: "11px 14px", alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: "6px", height: "6px", borderRadius: "50%",
          background: "var(--text-4)", display: "inline-block",
          animation: `chatTypingDot 1.2s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </div>
  );
}

function ChatMessage({ msg, isNew, fileReadyLabel }: { msg: ChatMsg; isNew: boolean; fileReadyLabel?: string }) {
  const anim = isNew ? "chatMsgIn 0.28s ease both" : "none";

  if (msg.kind === "file") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px", animation: anim }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: "var(--accent-bg)", border: "1px solid var(--accent-border)",
          borderRadius: "12px 12px 4px 12px", padding: "10px 14px", maxWidth: "78%",
        }}>
          <div style={{
            width: "32px", height: "38px", borderRadius: "5px", flexShrink: 0,
            background: "var(--accent-bg-hover)", border: "1px solid var(--accent-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="15" height="16" viewBox="0 0 15 18" fill="none">
              <path d="M2 1h8l4 4v12H2z" stroke="var(--accent-text)" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
              <path d="M10 1v4h4" stroke="var(--accent-text)" strokeWidth="1.3" fill="none" />
              <line x1="4" y1="9"  x2="11" y2="9"  stroke="var(--accent-text)" strokeWidth="1.1" strokeOpacity="0.7" />
              <line x1="4" y1="12" x2="11" y2="12" stroke="var(--accent-text)" strokeWidth="1.1" strokeOpacity="0.7" />
              <line x1="4" y1="15" x2="7"  y2="15" stroke="var(--accent-text)" strokeWidth="1.1" strokeOpacity="0.5" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--accent-text)", lineHeight: 1.3 }}>{msg.text}</div>
            <div style={{ fontSize: "10.5px", color: "var(--text-4)", marginTop: "2px" }}>{fileReadyLabel ?? "PDF · Ready to audit"}</div>
          </div>
        </div>
      </div>
    );
  }

  const isWarn    = msg.kind === "warn";
  const isSuccess = msg.kind === "success";
  const bg     = isSuccess ? "rgba(80,220,140,0.08)"  : isWarn ? "rgba(255,180,50,0.07)"  : "var(--surface-2)";
  const border = isSuccess ? "rgba(80,220,140,0.22)"  : isWarn ? "rgba(255,180,50,0.22)"  : "var(--border-light)";
  const color  = isSuccess ? "rgba(80,220,140,0.92)"  : "var(--text-2)";

  return (
    <div style={{ display: "flex", gap: "9px", alignItems: "flex-start", marginBottom: "10px", animation: anim }}>
      <div style={{
        width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0, marginTop: "1px",
        background: "var(--accent-bg)", border: "1px solid var(--accent-border)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <img src="/contract-guard-logo.png" alt="ContractGuard" width={28} height={28} style={{ objectFit: "contain", display: "block" }} />
      </div>
      <div style={{
        background: bg, border: `1px solid ${border}`,
        borderRadius: "4px 12px 12px 12px", padding: "10px 14px",
        maxWidth: "84%", fontSize: "13px", lineHeight: 1.65,
        color, fontWeight: isSuccess ? 600 : 400, whiteSpace: "pre-line",
      }}>
        {msg.text}
      </div>
    </div>
  );
}

function AiChatDemo() {
  const { t, lang } = useLanguage();
  const [visibleCount, setVisibleCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null);

  const CHAT_SEQ: ChatMsg[] = [
    { role: "user", text: t("demo.chat1"), kind: "file" },
    { role: "ai",   text: t("demo.chat2"), kind: "text",    typingMs: 1000 },
    { role: "ai",   text: t("demo.chat3"), kind: "warn",    typingMs: 1500 },
    { role: "ai",   text: t("demo.chat4"), kind: "text",    typingMs: 950 },
    { role: "ai",   text: t("demo.chat5"), kind: "success", typingMs: 1200 },
  ];

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, delay: number) => timers.push(setTimeout(fn, delay));
    let loop = 0;

    function run() {
      const thisLoop = ++loop;
      const guard = (fn: () => void) => () => { if (loop === thisLoop) fn(); };

      setVisibleCount(0);
      setTyping(false);

      let t = 600;
      schedule(guard(() => setVisibleCount(1)), t);
      t += 750;

      for (let i = 1; i < CHAT_SEQ.length; i++) {
        const ms = CHAT_SEQ[i].typingMs ?? 950;
        const count = i + 1;
        schedule(guard(() => setTyping(true)), t);
        t += ms;
        schedule(guard(() => { setTyping(false); setVisibleCount(count); }), t);
        t += 780;
      }

      schedule(() => run(), t + 3800);
    }

    run();
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Scroll WITHIN the chat container only — never touch page scroll
  useEffect(() => {
    const el = msgsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visibleCount, typing]);

  const visible = CHAT_SEQ.slice(0, visibleCount);

  return (
    <section style={{
      padding: "100px 0", background: "var(--bg)",
      borderTop: "1px solid var(--border-light)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", pointerEvents: "none", zIndex: 0,
        top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "60%", height: "90%",
        background: "radial-gradient(ellipse, var(--orb) 0%, transparent 65%)",
        filter: "blur(65px)",
      }} />

      <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "0 80px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.45fr", gap: "64px", alignItems: "center" }}>

          {/* LEFT — label + copy */}
          <div className="reveal">
            <div style={{
              display: "inline-flex", alignItems: "center",
              border: "1px solid var(--accent-border-strong)", borderRadius: "999px",
              padding: "4px 14px", fontSize: "11px",
              color: "var(--accent-text)", background: "var(--accent-bg)",
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              marginBottom: "22px", letterSpacing: "1.5px",
            }}>{t("demo.badge")}</div>

            <h2 style={{
              fontSize: "clamp(30px,3.4vw,46px)", fontWeight: 900,
              letterSpacing: "-0.04em", color: "var(--text)",
              lineHeight: 1.08, marginBottom: "18px",
              whiteSpace: "pre-line",
            }}>
              {t("demo.headline")}
            </h2>

            <p style={{
              fontSize: "14.5px", lineHeight: 1.78, color: "var(--text-3)",
              marginBottom: "38px", maxWidth: "320px",
            }}>
              {t("demo.subtitle")}
            </p>

            <div style={{ display: "flex", gap: "28px" }}>
              {[
                { value: "< 3s",  label: t("demo.statLabel1") },
                { value: "47+",   label: t("demo.statLabel2") },
                { value: "8/10",  label: t("demo.statLabel3") },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{
                    fontSize: "22px", fontWeight: 900, letterSpacing: "-0.04em",
                    background: "linear-gradient(135deg, var(--accent-2), var(--accent))",
                    WebkitBackgroundClip: "text", backgroundClip: "text",
                    WebkitTextFillColor: "transparent", marginBottom: "3px",
                  }}>{s.value}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-4)", letterSpacing: "0.4px" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Chat window */}
          <div className="reveal d1" style={{
            ...glass, borderRadius: "20px", overflow: "hidden",
            border: "1px solid var(--border)",
          }}>
            {/* Header */}
            <div style={{
              padding: "13px 16px", borderBottom: "1px solid var(--border-light)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "var(--surface-2)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                <div style={{
                  width: "30px", height: "30px", borderRadius: "8px",
                  background: "var(--accent-bg)", border: "1px solid var(--accent-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <img src="/contract-guard-logo.png" alt="ContractGuard" width={30} height={30} style={{ objectFit: "contain", display: "block" }} />
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>
                    {t("demo.agentName")}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-4)", marginTop: "1px" }}>
                    {t("demo.agentSub")}
                  </div>
                </div>
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "3px 10px", borderRadius: "999px",
                background: "rgba(80,220,140,0.08)", border: "1px solid rgba(80,220,140,0.22)",
              }}>
                <span style={{
                  width: "5px", height: "5px", borderRadius: "50%",
                  background: "rgba(80,220,140,0.90)",
                  boxShadow: "0 0 4px rgba(80,220,140,0.60)",
                  display: "inline-block",
                  animation: "pulseGlow 2s ease-in-out infinite",
                }} />
                <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(80,220,140,0.80)", letterSpacing: "0.8px" }}>
                  LIVE
                </span>
              </div>
            </div>

            {/* Messages */}
            <div ref={msgsRef} style={{ height: "340px", overflowY: "auto", padding: "16px 14px 8px" }}>
              {visible.map((msg, i) => (
                <ChatMessage key={`${i}-${visible.length}`} msg={msg} isNew={i === visible.length - 1} fileReadyLabel={t("demo.fileReady")} />
              ))}

              {typing && (
                <div style={{ display: "flex", gap: "9px", alignItems: "flex-start", animation: "chatMsgIn 0.2s ease both" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0, marginTop: "1px",
                    background: "var(--accent-bg)", border: "1px solid var(--accent-border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="5.2" stroke="var(--accent-text)" strokeWidth="1.3" />
                      <circle cx="7" cy="7" r="2.1" fill="var(--accent-text)" />
                    </svg>
                  </div>
                  <div style={{
                    background: "var(--surface-2)", border: "1px solid var(--border-light)",
                    borderRadius: "4px 12px 12px 12px",
                  }}>
                    <TypingIndicator />
                  </div>
                </div>
              )}

              <div style={{ height: "4px" }} />
            </div>

            {/* Input — disabled demo */}
            <div style={{
              padding: "11px 14px", borderTop: "1px solid var(--border-light)",
              display: "flex", gap: "9px", alignItems: "center",
              background: "var(--surface-2)",
            }}>
              <div style={{
                flex: 1, padding: "9px 13px", borderRadius: "10px",
                background: "var(--input-bg)", border: "1px solid var(--border-light)",
                fontSize: "13px", color: "var(--text-5)", cursor: "not-allowed",
                userSelect: "none",
              }}>
                {t("demo.inputPlaceholder")}
              </div>
              <div style={{
                width: "34px", height: "34px", borderRadius: "8px", flexShrink: 0,
                background: "var(--surface)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: 0.45, cursor: "not-allowed",
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7H13M13 7L7 1M13 7L7 13" stroke="var(--text-3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ── How It Works ─────────────────────────────────────────────

function HowItWorks() {
  const { t } = useLanguage();
  const steps = [
    {
      num: "01", type: "review" as const,
      when: t("how.step1When"),
      title: t("how.step1Title"),
      desc: t("how.step1Desc"),
    },
    {
      num: "02", type: "monitor" as const,
      when: t("how.step2When"),
      title: t("how.step2Title"),
      desc: t("how.step2Desc"),
    },
    {
      num: "03", type: "record" as const,
      when: t("how.step3When"),
      title: t("how.step3Title"),
      desc: t("how.step3Desc"),
    },
  ];

  return (
    <section id="how-it-works" style={{
      padding: "120px 0", background: "var(--bg)",
      borderTop: "1px solid var(--border-light)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", pointerEvents: "none", zIndex: 0,
        top: "50%", left: "50%",
        width: "80%", height: "80%",
        background: "radial-gradient(ellipse, var(--orb) 0%, transparent 65%)",
        filter: "blur(60px)", transform: "translate(-50%, -50%)",
      }} />

      <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "0 80px", position: "relative", zIndex: 1 }}>
        <div className="reveal" style={{ textAlign: "center", marginBottom: "80px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center",
            border: "1px solid var(--accent-border-strong)", borderRadius: "999px",
            padding: "4px 14px", fontSize: "11px",
            color: "var(--accent-text)", background: "var(--accent-bg)",
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            marginBottom: "20px", letterSpacing: "1.5px",
          }}>{t("how.badge")}</div>
          <h2 style={{
            fontSize: "clamp(34px,3.8vw,52px)", fontWeight: 900,
            letterSpacing: "-0.04em", color: "var(--text)", lineHeight: 1.05, marginBottom: "16px",
            whiteSpace: "pre-line",
          }}>{t("how.headline")}</h2>
          <p style={{
            fontSize: "15px", color: "var(--text-3)",
            maxWidth: "420px", margin: "0 auto", lineHeight: 1.76,
          }}>
            {t("how.subtitle")}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          {steps.map((s, i) => (
            <div key={i} className={`card-lift reveal d${i + 1}`} style={{
              ...glass, padding: "36px 30px 34px",
              position: "relative", overflow: "hidden",
            }}
              onMouseMove={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                e.currentTarget.style.background = `radial-gradient(circle at ${x}px ${y}px, var(--surface) 0%, var(--surface-2) 55%)`;
              }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--surface)"; }}
            >
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "1px",
                background: "linear-gradient(to right, transparent 5%, var(--accent-border-strong) 40%, var(--accent-border-strong) 60%, transparent 95%)",
                pointerEvents: "none",
              }} />

              <div style={{
                position: "absolute", top: "10px", right: "18px",
                fontSize: "96px", fontWeight: 900, fontFamily: "monospace",
                letterSpacing: "-0.07em", lineHeight: 1,
                background: "linear-gradient(175deg, var(--accent-border-hover) 0%, var(--accent-bg) 75%)",
                WebkitBackgroundClip: "text", backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                userSelect: "none", pointerEvents: "none",
              }}>{s.num}</div>

              <span style={{
                display: "block", fontSize: "9.5px", letterSpacing: "2.2px",
                color: "var(--text-4)", fontWeight: 600,
                textTransform: "uppercase" as const, marginBottom: "30px",
              }}>{s.when}</span>

              <div style={{
                width: "52px", height: "52px", borderRadius: "13px",
                background: "var(--accent-bg)",
                border: "1px solid var(--accent-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: "24px",
              }}>
                <svg width="28" height="28" viewBox="-13 -13 26 26" fill="none">
                  <StepIcon type={s.type} />
                </svg>
              </div>

              <h3 style={{
                fontSize: "18px", fontWeight: 700, color: "var(--text)",
                marginBottom: "12px", letterSpacing: "-0.025em",
              }}>{s.title}</h3>

              <p style={{ fontSize: "14px", lineHeight: 1.78, color: "var(--text-3)" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const { t } = useLanguage();
  const items = [
    { type: "audit", tag: t("feat.f1Tag"), title: t("feat.f1Title"), desc: t("feat.f1Desc") },
    { type: "escrow", tag: t("feat.f2Tag"), title: t("feat.f2Title"), desc: t("feat.f2Desc") },
    { type: "check", tag: t("feat.f3Tag"), title: t("feat.f3Title"), desc: t("feat.f3Desc") },
    { type: "chain", tag: t("feat.f4Tag"), title: t("feat.f4Title"), desc: t("feat.f4Desc") },
  ];

  return (
    <section id="features" style={{
      padding: "120px 0",
      background: "linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", pointerEvents: "none", zIndex: 0,
        top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: "65%", height: "75%",
        background: "radial-gradient(ellipse, var(--orb) 0%, transparent 65%)",
        filter: "blur(65px)",
      }} />

      <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "0 80px", position: "relative", zIndex: 1 }}>
        <div className="reveal" style={{ marginBottom: "64px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center",
            border: "1px solid var(--accent-border-strong)", borderRadius: "999px",
            padding: "4px 14px", fontSize: "11px",
            color: "var(--accent-text)", background: "var(--accent-bg)",
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            marginBottom: "20px", letterSpacing: "1.5px",
          }}>{t("feat.badge")}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <h2 style={{
              fontSize: "clamp(32px,3.6vw,48px)", fontWeight: 900,
              letterSpacing: "-0.04em", color: "var(--text)", lineHeight: 1.05, maxWidth: "480px",
              whiteSpace: "pre-line",
            }}>
              {t("feat.headline")}
            </h2>
            <p style={{
              fontSize: "14px", color: "var(--text-3)",
              maxWidth: "290px", lineHeight: 1.76, textAlign: "right",
            }}>
              {t("feat.subtitle")}
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {items.map((f, i) => (
            <div key={i} className={`card-lift reveal d${i + 1}`} style={{ ...glass, padding: "40px 36px", position: "relative", overflow: "hidden" }}
              onMouseMove={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                e.currentTarget.style.background = `radial-gradient(circle at ${x}px ${y}px, var(--accent-bg) 0%, var(--surface) 60%)`;
              }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--surface)"; }}
            >
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "1px",
                background: "linear-gradient(to right, transparent 5%, var(--accent-border-strong) 40%, var(--accent-border-strong) 60%, transparent 95%)",
                pointerEvents: "none",
              }} />
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "flex-start", marginBottom: "28px",
              }}>
                <IconBox type={f.type} />
                <div style={{
                  fontSize: "9.5px", letterSpacing: "1.8px",
                  color: "var(--accent-text)",
                  border: "1px solid var(--accent-border)",
                  borderRadius: "999px", padding: "4px 10px",
                  background: "var(--accent-bg)",
                }}>{f.tag}</div>
              </div>
              <h3 style={{
                fontSize: "18px", fontWeight: 700, color: "var(--text)",
                marginBottom: "12px", letterSpacing: "-0.025em",
              }}>{f.title}</h3>
              <p style={{ fontSize: "14px", lineHeight: 1.78, color: "var(--text-3)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const { t } = useLanguage();
  const STATS_DATA = [
    { display: "< $0.01", countTo: null as number | null, suffix: "", label: t("stats.label1"), sub: t("stats.sub1") },
    { display: "400ms",   countTo: 400,                   suffix: "ms", label: t("stats.label2"), sub: t("stats.sub2") },
    { display: "100%",    countTo: 100,                   suffix: "%",  label: t("stats.label3"), sub: t("stats.sub3") },
    { display: "Claude",  countTo: null as number | null, suffix: "", label: t("stats.label4"), sub: t("stats.sub4") },
  ];
  const [counts, setCounts] = useState(STATS_DATA.map(s => s.countTo ?? 0));
  const animatedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || animatedRef.current) return;
      animatedRef.current = true;
      STATS_DATA.forEach((s, i) => {
        if (s.countTo === null) return;
        const duration = 1600;
        const start = performance.now();
        const to = s.countTo;
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setCounts(prev => { const n = [...prev]; n[i] = Math.round(to * eased); return n; });
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      observer.disconnect();
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section style={{
      padding: "100px 0", background: "var(--bg)",
      borderTop: "1px solid var(--border-light)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", pointerEvents: "none", zIndex: 0,
        top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: "55%", height: "80%",
        background: "radial-gradient(ellipse, var(--orb) 0%, transparent 65%)",
        filter: "blur(60px)",
      }} />
      <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "0 80px", position: "relative", zIndex: 1 }}>
        <div className="reveal" style={{ textAlign: "center", marginBottom: "60px" }}>
          <h2 style={{
            fontSize: "clamp(30px,3.2vw,44px)", fontWeight: 900,
            letterSpacing: "-0.04em", color: "var(--text)", marginBottom: "12px",
          }}>{t("stats.headline")}</h2>
          <p style={{ fontSize: "14px", color: "var(--text-3)", lineHeight: 1.75 }}>
            {t("stats.subtitle")}
          </p>
        </div>

        <div ref={containerRef} className="reveal" style={{
          display: "grid", gridTemplateColumns: "repeat(4,1fr)",
          border: "1px solid var(--border)",
          borderRadius: "16px", overflow: "hidden",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          boxShadow: "var(--glass-shadow)",
        }}>
          {STATS_DATA.map((s, i) => (
            <div key={i} style={{
              background: "var(--surface-2)",
              padding: "36px 24px", textAlign: "center",
              borderRight: i < 3 ? "1px solid var(--border-light)" : "none",
              transition: "background 0.28s ease",
              cursor: "default",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--accent-bg)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--surface-2)"; }}
            >
              <div style={{
                width: "46px", height: "46px", borderRadius: "13px", margin: "0 auto 20px",
                background: "var(--accent-bg)",
                border: "1px solid var(--accent-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="24" height="24" viewBox="-12 -12 24 24" fill="none">
                  {i === 0 && (
                    <g>
                      <path d="M-9,-7 L5,-7 L9,-3 L-5,-3 Z" fill="var(--accent)"/>
                      <path d="M-9,-1 L5,-1 L9,3 L-5,3 Z" fill="var(--accent)" fillOpacity={0.72}/>
                      <path d="M-9,5 L5,5 L9,9 L-5,9 Z" fill="var(--accent)" fillOpacity={0.50}/>
                    </g>
                  )}
                  {i === 1 && (
                    <path d="M3,-11 L-5,1 L2,1 L-3,11 L5,-1 L-2,-1 Z" fill="var(--accent)"/>
                  )}
                  {i === 2 && (
                    <g>
                      <path d="M0,-10 C3,-10 9,-8 9,-3 L9,2 C9,7 4.5,10 0,12 C-4.5,10 -9,7 -9,2 L-9,-3 C-9,-8 -3,-10 0,-10 Z" fill="none" stroke="var(--accent)" strokeWidth="1.7" strokeLinejoin="round"/>
                      <path d="M-4,1 L-1,4.5 L5.5,-3" stroke="var(--accent)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                    </g>
                  )}
                  {i === 3 && (
                    <g>
                      {([0,45,90,135,180,225,270,315] as number[]).map((deg, idx) => (
                        <rect key={idx} x="-1.15" y="-9.5" width="2.3" height="6.5" rx="1.15"
                          fill="var(--accent)"
                          fillOpacity={[0,2,4,6].includes(idx) ? 1 : 0.58}
                          transform={`rotate(${deg})`}
                        />
                      ))}
                    </g>
                  )}
                </svg>
              </div>

              <div style={{
                fontSize: "clamp(24px,2.6vw,36px)", fontWeight: 900,
                letterSpacing: "-0.04em", marginBottom: "8px",
                background: "linear-gradient(135deg, var(--accent-2) 0%, var(--accent) 50%, var(--shimmer-mid) 100%)",
                WebkitBackgroundClip: "text", backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                {s.countTo !== null ? `${counts[i]}${s.suffix}` : s.display}
              </div>
              <div style={{
                fontSize: "10.5px", letterSpacing: "1.6px",
                color: "var(--text-2)", marginBottom: "6px",
              }}>{s.label}</div>
              <div style={{ fontSize: "13px", color: "var(--text-3)" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const { t } = useLanguage();
  return (
    <section style={{
      padding: "140px 0",
      background: "linear-gradient(180deg, var(--bg-2) 0%, var(--bg) 100%)",
      borderTop: "1px solid var(--border-light)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", pointerEvents: "none", zIndex: 0,
        top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "65%", height: "85%",
        background: "radial-gradient(ellipse, var(--accent-glow) 0%, transparent 65%)",
        filter: "blur(60px)",
      }} />

      <div style={{
        maxWidth: "640px", margin: "0 auto",
        padding: "0 40px", textAlign: "center",
        position: "relative", zIndex: 1,
      }}>
        <div className="reveal" style={{
          background: "var(--surface)",
          backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
          border: "1px solid var(--accent-border)",
          borderRadius: "28px", padding: "68px 60px",
          position: "relative", overflow: "hidden",
          boxShadow: "var(--glass-shadow)",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "1px", pointerEvents: "none",
            background: "linear-gradient(to right, transparent 5%, var(--accent-border-strong) 50%, transparent 95%)",
          }} />
          {[
            { top: "20px", left: "22px" }, { top: "20px", right: "22px" },
            { bottom: "20px", left: "22px" }, { bottom: "20px", right: "22px" },
          ].map((pos, i) => (
            <div key={i} style={{
              position: "absolute", ...pos,
              width: "4px", height: "4px", borderRadius: "50%",
              background: "var(--accent-border-strong)",
            }} />
          ))}

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{
              display: "inline-flex", alignItems: "center",
              border: "1px solid var(--accent-border-strong)", borderRadius: "999px",
              padding: "4px 14px", fontSize: "11px",
              color: "var(--accent-text)", background: "var(--accent-bg)",
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              marginBottom: "28px", letterSpacing: "1.5px",
            }}>{t("cta.badge")}</div>

            <h2 style={{
              fontSize: "clamp(30px,4vw,48px)", fontWeight: 900,
              letterSpacing: "-0.045em", color: "var(--text)",
              lineHeight: 1.08, marginBottom: "22px",
            }}>
              {t("cta.headline1")}<br />
              <span className="text-shimmer">{t("cta.headline2")}</span>
            </h2>

            <p style={{
              fontSize: "15px", color: "var(--text-3)",
              marginBottom: "48px", lineHeight: 1.78,
            }}>
              {t("cta.subtitle")}
            </p>

            <div style={{ display: "flex", gap: "14px", justifyContent: "center" }}>
              <a href="/audit" style={{
                background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 50%, var(--accent) 100%)",
                backgroundSize: "200% 100%",
                color: "var(--btn-primary-text)", fontWeight: 800,
                fontSize: "15px", padding: "15px 36px", borderRadius: "8px",
                textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "10px",
                boxShadow: "0 0 0 1px var(--accent-border-strong), 0 4px 22px var(--accent-glow)",
                transition: "transform 0.22s ease, box-shadow 0.22s ease",
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.transform = "translateY(-2px)";
                  el.style.boxShadow = "0 0 0 1px var(--accent-border-hover), 0 8px 32px var(--accent-glow)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "0 0 0 1px var(--accent-border-strong), 0 4px 22px var(--accent-glow)";
                }}
                onMouseDown={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.97)"; }}
                onMouseUp={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)"; }}
              >
                {t("cta.ctaAudit")}
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7H13M13 7L7 1M13 7L7 13" stroke="currentColor"
                    strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a href="/pricing" style={{
                background: "var(--btn-ghost-bg)", color: "var(--text-2)",
                fontSize: "15px", padding: "15px 30px", borderRadius: "8px",
                border: "1px solid var(--btn-ghost-border)", textDecoration: "none",
                transition: "background 0.2s, border-color 0.2s, color 0.2s, transform 0.22s ease",
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "var(--accent-bg)";
                  el.style.borderColor = "var(--accent-border)";
                  el.style.color = "var(--accent-text)";
                  el.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "var(--btn-ghost-bg)";
                  el.style.borderColor = "var(--btn-ghost-border)";
                  el.style.color = "var(--text-2)";
                  el.style.transform = "translateY(0)";
                }}
                onMouseDown={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.97)"; }}
                onMouseUp={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)"; }}
              >
                {t("cta.ctaPricing")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handler = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal, .reveal-left, .reveal-right');
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        const el = e.target as HTMLElement;
        if (e.isIntersecting) {
          el.classList.remove('is-visible');
          void el.offsetWidth;
          el.classList.add('is-visible');
        } else {
          el.classList.remove('is-visible');
        }
      }),
      { threshold: 0.04, rootMargin: "0px 0px 120px 0px" }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--text)", overflowX: "hidden" }}>
      <div style={{
        position: "fixed", top: 0, left: 0, height: "1.5px",
        width: `${scrollProgress}%`,
        background: "linear-gradient(to right, var(--accent), var(--accent-2), var(--accent))",
        zIndex: 200, pointerEvents: "none",
        transition: "width 0.08s linear",
      }} />
      <Navbar />
      <Hero />
      <AiChatDemo />
      <Features />
      <HowItWorks />
      <Stats />
      <CTA />
      <Footer />
    </main>
  );
}
