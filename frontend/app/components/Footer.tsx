"use client";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "./LanguageProvider";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer style={{
      padding: "22px 0", background: "var(--footer-bg)",
      borderTop: "1px solid var(--footer-border)",
      position: "relative",
    }}>
      {/* subtle accent top glow line */}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: "40%", height: "1px", pointerEvents: "none",
        background: "linear-gradient(to right, transparent, var(--accent-border-strong), transparent)",
      }} />

      <div style={{
        maxWidth: "1160px", margin: "0 auto", padding: "0 80px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        {/* Logo */}
        <Link href="/" style={{
          display: "flex", alignItems: "center", gap: "0px",
          textDecoration: "none", transition: "opacity 0.2s",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = "0.75"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
        >
          <Image
            src="/contract-guard-logo.png"
            alt="ContractGuard AI"
            width={300}
            height={300}
            style={{ width: "50px", height: "50px", objectFit: "contain", display: "block", marginRight: "-4px" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{
              fontWeight: 800, fontSize: "14px",
              letterSpacing: "-0.03em", color: "var(--text-2)",
              lineHeight: 1.1,
            }}>ContractGuard</span>
            <span style={{
              fontSize: "9px", letterSpacing: "2.2px",
              color: "var(--accent-text-dim)", fontWeight: 600,
              textTransform: "uppercase" as const, lineHeight: 1,
            }}>AI · Secured</span>
          </div>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", gap: "30px" }}>
          {[
            { label: "GitHub",       href: "#" },
            { label: t("footer.docs"), href: "#" },
          ].map(({ label, href }) => (
            <Link key={label} href={href} style={{
              fontSize: "13px", color: "var(--text-4)",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent-text)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-4)"; }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Copyright */}
        <div style={{
          fontSize: "11.5px", color: "var(--text-5)",
          letterSpacing: "0.2px",
        }}>
          {t("footer.copyright")} ·{" "}
          <span style={{ color: "var(--accent-text-dim)" }}>{t("footer.builtOn")}</span>
        </div>
      </div>
    </footer>
  );
}
