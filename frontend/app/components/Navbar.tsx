"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "./WalletButton";
import { useTheme } from "./ThemeProvider";
import { useLanguage } from "./LanguageProvider";

function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  const isEn = lang === "en";
  return (
    <button
      onClick={() => setLang(isEn ? "id" : "en")}
      title={isEn ? "Switch to Indonesian" : "Switch to English"}
      style={{
        height: "34px", borderRadius: "8px", padding: "0 10px",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        cursor: "pointer",
        display: "flex", alignItems: "center", gap: "5px",
        color: "var(--text-3)",
        flexShrink: 0,
        fontSize: "12px", fontWeight: 700, letterSpacing: "0.3px",
        fontFamily: "var(--font-dm), 'DM Sans', sans-serif",
        transition: "background 0.2s, border-color 0.2s, color 0.2s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-bg)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent-border)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-text)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)";
      }}
    >
      <span style={{ opacity: isEn ? 1 : 0.45, transition: "opacity 0.2s" }}>EN</span>
      <span style={{ opacity: 0.35, fontSize: "10px" }}>|</span>
      <span style={{ opacity: isEn ? 0.45 : 1, transition: "opacity 0.2s" }}>ID</span>
    </button>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: "34px", height: "34px", borderRadius: "8px",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text-3)",
        flexShrink: 0,
        transition: "background 0.2s, border-color 0.2s, color 0.2s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-bg)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent-border)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-text)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)";
      }}
    >
      {isDark ? (
        /* Sun icon */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
          <line x1="12" y1="2" x2="12" y2="4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="12" y1="19.5" x2="12" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="2" y1="12" x2="4.5" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="19.5" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="4.93" y1="4.93" x2="6.7" y2="6.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="17.3" y1="17.3" x2="19.07" y2="19.07" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="4.93" y1="19.07" x2="6.7" y2="17.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="17.3" y1="6.7" x2="19.07" y2="4.93" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ) : (
        /* Moon icon */
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled]         = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const { t } = useLanguage();

  const NAV_LINKS = [
    { labelKey: "nav.features",   href: "/#features" },
    { labelKey: "nav.howItWorks", href: "/#how-it-works" },
    { labelKey: "nav.pricing",    href: "/pricing" },
    { labelKey: "nav.dashboard",  href: "/dashboard" },
  ];

  // Scroll spy: highlight Features / How it Works as sections enter viewport
  useEffect(() => {
    if (pathname !== "/") { setActiveSection(""); return; }

    const HASH_SECTIONS = ["features", "how-it-works"];
    const observers: IntersectionObserver[] = [];

    HASH_SECTIONS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: "-30% 0px -55% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    // Reset when scrolled back to very top
    const onScroll = () => { if (window.scrollY < 80) setActiveSection(""); };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observers.forEach(o => o.disconnect());
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      height: scrolled ? "56px" : "64px",
      backdropFilter: scrolled ? "blur(32px)" : "blur(24px)",
      WebkitBackdropFilter: scrolled ? "blur(32px)" : "blur(24px)",
      background: scrolled ? "var(--nav-bg-scroll)" : "var(--nav-bg)",
      borderBottom: `1px solid ${scrolled ? "var(--nav-border-scroll)" : "var(--nav-border)"}`,
      boxShadow: scrolled ? "var(--nav-shadow-scroll)" : "var(--nav-shadow)",
      transition: "height 0.3s ease, background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease",
    }}>
      <div style={{
        maxWidth: "1400px", margin: "0 auto", padding: "0 48px",
        height: "100%", display: "flex", alignItems: "center",
        justifyContent: "space-between",
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0px", textDecoration: "none" }}>
          <Image
            src="/contract-guard-logo.png"
            alt="ContractGuard AI"
            width={300}
            height={300}
            style={{ width: "62px", height: "62px", objectFit: "contain", display: "block", marginRight: "-4px" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{
              fontWeight: 800, fontSize: "14.5px",
              letterSpacing: "-0.03em", color: "var(--text)",
              lineHeight: 1.1,
            }}>
              ContractGuard
            </span>
            <span style={{
              fontSize: "9px", letterSpacing: "2.2px",
              color: "var(--accent-text-dim)", fontWeight: 600,
              textTransform: "uppercase" as const,
              lineHeight: 1,
            }}>
              AI · Secured
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", gap: "36px" }}>
          {NAV_LINKS.map(({ labelKey, href }) => {
            const label = t(labelKey);
            const sectionId = href.includes("#") ? href.split("#")[1] : "";
            const isActive = href === pathname
              || (pathname === "/" && !!sectionId && activeSection === sectionId)
              || (href !== "/" && !href.includes("#") && pathname.startsWith(href) && href !== "/");
            return (
              <Link key={labelKey} href={href} style={{
                color: isActive ? "var(--accent)" : "var(--nav-text)",
                fontSize: "14px", textDecoration: "none",
                transition: "color 0.2s ease, text-shadow 0.2s ease",
                fontWeight: isActive ? 700 : 400,
                position: "relative",
              }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = "var(--nav-text-hover)";
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = "var(--nav-text)";
                }}
              >
                {label}
                {isActive && (
                  <span style={{
                    position: "absolute", bottom: "-4px", left: 0, right: 0,
                    height: "1.5px",
                    background: `linear-gradient(to right, transparent, var(--accent) 30%, var(--accent-2) 50%, var(--accent) 70%, transparent)`,
                    borderRadius: "999px",
                  }} />
                )}
              </Link>
            );
          })}
        </div>

        {/* CTA buttons + toggles */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <LanguageToggle />
          <ThemeToggle />
          <Link href="/audit" style={{
            background: "var(--btn-ghost-bg)",
            color: "var(--btn-ghost-text)",
            fontWeight: 600, fontSize: "13.5px",
            padding: "9px 20px", borderRadius: "6px",
            border: "1px solid var(--btn-ghost-border)",
            cursor: "pointer", textDecoration: "none",
            backdropFilter: "blur(8px)",
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
            {t("nav.auditContract")}
          </Link>
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
