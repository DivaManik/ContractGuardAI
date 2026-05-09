"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { TransactionInstruction, Transaction, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useWalletModal } from "./WalletProvider";
import { useContractProgram, getUsdcMintPDA, getATA, getMintRecordPDA, getConfigPDA, TOKEN_PROGRAM_ID, ASSOC_TOKEN_PID, PROGRAM_ID, MINT_AMOUNT_USDC } from "../lib/useContractProgram";
import { toast } from "./Toast";

const COOLDOWN_SECS = 86_400;

function shortAddress(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function fmtCooldown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function WalletButton() {
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { program, wallet, connection } = useContractProgram();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [solBalance, setSolBalance]   = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [cooldownLeft, setCooldown]   = useState(0);
  const [claiming, setClaiming]       = useState(false);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const fetchBalances = useCallback(async () => {
    if (!publicKey || !connection) return;

    // SOL
    try {
      const lamports = await connection.getBalance(publicKey, "confirmed");
      setSolBalance(lamports / 1e9);
    } catch { setSolBalance(0); }

    // USDC
    const mint = getUsdcMintPDA();
    const ata  = getATA(mint, publicKey);
    try {
      const bal = await connection.getTokenAccountBalance(ata, "confirmed");
      setUsdcBalance(Number(bal.value.uiAmount ?? 0));
    } catch { setUsdcBalance(0); }

    // Cooldown
    if (!program) return;
    try {
      const record = getMintRecordPDA(publicKey);
      const acc = await (program.account as never as {
        userMintRecord: { fetch: (pk: import("@solana/web3.js").PublicKey) => Promise<{ lastMintAt: BN }> }
      }).userMintRecord.fetch(record);
      const elapsed = Math.floor(Date.now() / 1000) - acc.lastMintAt.toNumber();
      setCooldown(Math.max(0, COOLDOWN_SECS - elapsed));
    } catch { setCooldown(0); }
  }, [publicKey, connection, program]);

  useEffect(() => {
    if (open) fetchBalances();
  }, [open, fetchBalances]);

  // Countdown tick
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const id = setInterval(() => setCooldown(s => Math.max(0, s - 1)), 1_000);
    return () => clearInterval(id);
  }, [cooldownLeft]);

  const handleClaim = async () => {
    if (!publicKey || !connection || cooldownLeft > 0 || claiming) return;
    setClaiming(true);
    toast.info("Claiming USDt...", "Awaiting wallet signature");
    try {
      const config    = getConfigPDA();
      const mint      = getUsdcMintPDA();
      const userATA   = getATA(mint, publicKey);
      const mintRecord = getMintRecordPDA(publicKey);

      const createAtaIx = new TransactionInstruction({
        programId: ASSOC_TOKEN_PID,
        keys: [
          { pubkey: publicKey,               isSigner: true,  isWritable: true  },
          { pubkey: userATA,                 isSigner: false, isWritable: true  },
          { pubkey: publicKey,               isSigner: false, isWritable: false },
          { pubkey: mint,                    isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID,        isSigner: false, isWritable: false },
        ],
        data: Buffer.from([1]),
      });

      const mintUsdcIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: publicKey,               isSigner: true,  isWritable: true  },
          { pubkey: config,                  isSigner: false, isWritable: true  },
          { pubkey: mint,                    isSigner: false, isWritable: true  },
          { pubkey: userATA,                 isSigner: false, isWritable: true  },
          { pubkey: mintRecord,              isSigner: false, isWritable: true  },
          { pubkey: TOKEN_PROGRAM_ID,        isSigner: false, isWritable: false },
          { pubkey: ASSOC_TOKEN_PID,         isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from([18, 18, 44, 151, 229, 134, 223, 5]),
      });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      tx.add(createAtaIx, mintUsdcIx);
      const sig = await wallet.sendTransaction!(tx, connection);
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

      toast.success(`${MINT_AMOUNT_USDC} USDt claimed!`, "Added to your wallet");
      await fetchBalances();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("MintCooldownNotExpired")) {
        toast.warning("Cooldown active", "You can only claim once every 24 hours");
        setCooldown(COOLDOWN_SECS);
      } else {
        toast.error("Claim failed", msg.slice(0, 80));
      }
    } finally {
      setClaiming(false);
    }
  };

  if (connected && publicKey) {
    const canClaim = cooldownLeft === 0 && !claiming;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>

        {/* Address pill */}
        <div ref={ref} style={{ position: "relative" }}>
        <div
          onClick={() => setOpen(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: "7px",
            background: open ? "rgba(80,220,140,0.12)" : "rgba(80,220,140,0.08)",
            border: open ? "1px solid rgba(80,220,140,0.40)" : "1px solid rgba(80,220,140,0.25)",
            borderRadius: "6px", padding: "8px 14px",
            fontSize: "13px", color: "rgba(80,220,140,0.90)",
            fontWeight: 600, letterSpacing: "-0.01em",
            cursor: "pointer", userSelect: "none",
            transition: "background 0.18s, border-color 0.18s",
            height: "34px", boxSizing: "border-box",
          }}
        >
          <span style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: "rgba(80,220,140,0.90)",
            boxShadow: "0 0 6px rgba(80,220,140,0.60)",
            flexShrink: 0,
          }} />
          {shortAddress(publicKey.toBase58())}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{
            marginLeft: "2px", opacity: 0.55,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Dropdown popup (dirender di dalam ref wrapper agar outside-click benar) */}
        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            minWidth: "268px",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            boxShadow: "0 16px 40px rgba(0,0,0,0.40), 0 0 0 1px var(--border)",
            overflow: "hidden",
            zIndex: 100,
            animation: "slideDown 0.15s cubic-bezier(0.16,1,0.3,1)",
          }}>

            {/* Address section */}
            <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: "10px", letterSpacing: "1px", color: "var(--text-4)", marginBottom: "4px" }}>
                CONNECTED
              </div>
              <div style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-2)", wordBreak: "break-all" }}>
                {publicKey.toBase58().slice(0, 22)}...
              </div>
            </div>

            {/* Balances section */}
            <div style={{ padding: "12px 14px 14px", borderBottom: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: "10px", letterSpacing: "1px", color: "var(--text-4)", marginBottom: "10px" }}>
                BALANCES
              </div>

              {/* SOL row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    width: "24px", height: "24px", borderRadius: "50%",
                    background: "rgba(153,69,255,0.12)", border: "1px solid rgba(153,69,255,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <svg width="12" height="10" viewBox="0 0 20 17" fill="none">
                      <path d="M0,0 L13,0 L16,4 L3,4 Z" fill="rgba(153,69,255,0.9)" />
                      <path d="M2,6.5 L15,6.5 L18,10.5 L5,10.5 Z" fill="rgba(153,69,255,0.7)" />
                      <path d="M4,13 L17,13 L20,17 L7,17 Z" fill="rgba(153,69,255,0.5)" />
                    </svg>
                  </div>
                  <span style={{ fontSize: "12.5px", color: "var(--text-2)", fontWeight: 600 }}>SOL</span>
                </div>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)", fontFamily: "monospace" }}>
                  {solBalance === null ? "—" : solBalance.toFixed(4)}
                </span>
              </div>

              {/* USDt row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    width: "24px", height: "24px", borderRadius: "50%",
                    background: "rgba(38,161,123,0.12)", border: "1px solid rgba(38,161,123,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 32 32" fill="none">
                      <circle cx="16" cy="16" r="15" fill="#26A17B" />
                      <text x="16" y="21" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white" fontFamily="sans-serif">₮</text>
                    </svg>
                  </div>
                  <span style={{ fontSize: "12.5px", color: "var(--text-2)", fontWeight: 600 }}>USDt</span>
                </div>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)", fontFamily: "monospace" }}>
                  {usdcBalance === null ? "—" : usdcBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Disconnect */}
            <button
              onClick={() => { disconnect(); setOpen(false); }}
              style={{
                width: "100%", padding: "11px 14px",
                background: "transparent", border: "none",
                display: "flex", alignItems: "center", gap: "9px",
                cursor: "pointer", textAlign: "left",
                color: "rgba(255,100,100,0.80)",
                fontSize: "13px", fontWeight: 600,
                fontFamily: "var(--font-dm), 'DM Sans', sans-serif",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,80,80,0.08)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 7H13M10 4L13 7L10 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 2H2.5A1.5 1.5 0 0 0 1 3.5v7A1.5 1.5 0 0 0 2.5 12H7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              Disconnect
            </button>
          </div>
        )}

        <style>{`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes spinRing {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
        </div>

        {/* Claim USDC button — di kanan address pill */}
        <button
          onClick={handleClaim}
          disabled={!canClaim}
          title={cooldownLeft > 0 ? `Cooldown: ${fmtCooldown(cooldownLeft)}` : "Claim 1,000 mock USDt"}
          style={{
            background: canClaim ? "rgba(39,117,255,0.12)" : "var(--surface-2)",
            color: canClaim ? "rgba(100,165,255,0.95)" : "var(--text-4)",
            border: `1px solid ${canClaim ? "rgba(39,117,255,0.26)" : "var(--border)"}`,
            borderRadius: "6px", padding: "8px 14px",
            fontSize: "13px", fontWeight: 700,
            cursor: canClaim ? "pointer" : "not-allowed",
            display: "inline-flex", alignItems: "center", gap: "6px",
            fontFamily: "var(--font-dm), 'DM Sans', sans-serif",
            transition: "opacity 0.15s, background 0.15s",
            whiteSpace: "nowrap",
            height: "34px", boxSizing: "border-box",
          }}
          onMouseEnter={e => { if (canClaim) (e.currentTarget as HTMLButtonElement).style.opacity = "0.78"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
        >
          {/* USDt mini icon */}
          <svg width="13" height="13" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="16" cy="16" r="15" fill="#26A17B" />
            <text x="16" y="21" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white" fontFamily="sans-serif">₮</text>
          </svg>
          {claiming ? (
            <svg width="10" height="10" viewBox="0 0 44 44" fill="none" style={{ animation: "spinRing 1.2s linear infinite" }}>
              <circle cx="22" cy="22" r="18" stroke="rgba(100,165,255,0.3)" strokeWidth="5" />
              <path d="M22 4 A18 18 0 0 1 40 22" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            </svg>
          ) : cooldownLeft > 0 ? (
            <>
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {fmtCooldown(cooldownLeft)}
            </>
          ) : "Claim 1,000"}
        </button>

      </div>
    );
  }

  return (
    <button onClick={() => setVisible(true)} style={{
      background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)",
      fontWeight: 700, fontSize: "13.5px",
      padding: "9px 22px", borderRadius: "6px", border: "none", cursor: "pointer",
      display: "flex", alignItems: "center", gap: "8px", letterSpacing: "-0.01em",
      boxShadow: "0 0 0 1px var(--border), 0 3px 12px rgba(0,0,0,0.15)",
      transition: "transform 0.2s, box-shadow 0.2s, opacity 0.2s",
      fontFamily: "var(--font-dm), 'DM Sans', sans-serif",
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.opacity = "0.88";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 1px var(--border-strong), 0 6px 20px rgba(0,0,0,0.20)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.opacity = "1";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 1px var(--border), 0 3px 12px rgba(0,0,0,0.15)";
      }}
      onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
      onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
    >
      Connect Wallet
      <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
        <path d="M1 7H13M13 7L7 1M13 7L7 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
