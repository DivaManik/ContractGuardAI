"use client";
import { useState, useEffect, useCallback } from "react";
import { useContractProgram, getConfigPDA, getUsdcMintPDA, getMintRecordPDA, getATA, TOKEN_PROGRAM_ID, MINT_AMOUNT_USDC } from "../lib/useContractProgram";
import { BN } from "@coral-xyz/anchor";
import { toast } from "./Toast";

const COOLDOWN_SECS = 86_400;

interface Props {
  onBalanceChange?: (balance: number) => void;
}

export default function ClaimUsdcButton({ onBalanceChange }: Props) {
  const { program, wallet, connection } = useContractProgram();
  const [balance, setBalance]     = useState<number | null>(null);
  const [cooldownLeft, setCooldown] = useState(0); // seconds
  const [claiming, setClaiming]   = useState(false);

  const fetchState = useCallback(async () => {
    if (!wallet.publicKey || !connection) return;
    const mint = getUsdcMintPDA();
    const ata  = getATA(mint, wallet.publicKey);

    // USDC balance
    try {
      const bal = await connection.getTokenAccountBalance(ata, "confirmed");
      const ui = Number(bal.value.uiAmount ?? 0);
      setBalance(ui);
      onBalanceChange?.(ui);
    } catch {
      setBalance(0);
      onBalanceChange?.(0);
    }

    // Cooldown
    if (!program) return;
    try {
      const record = getMintRecordPDA(wallet.publicKey);
      const acc = await (program.account as never as {
        userMintRecord: { fetch: (pk: import("@solana/web3.js").PublicKey) => Promise<{ lastMintAt: BN }> }
      }).userMintRecord.fetch(record);
      const now = Math.floor(Date.now() / 1000);
      const elapsed = now - acc.lastMintAt.toNumber();
      const left = Math.max(0, COOLDOWN_SECS - elapsed);
      setCooldown(left);
    } catch {
      setCooldown(0);
    }
  }, [wallet.publicKey, connection, program, onBalanceChange]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Countdown tick
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const id = setInterval(() => setCooldown(s => Math.max(0, s - 1)), 1_000);
    return () => clearInterval(id);
  }, [cooldownLeft]);

  const handleClaim = async () => {
    if (!program || !wallet.publicKey) {
      toast.error("Wallet not connected", "Connect Phantom wallet first");
      return;
    }
    if (cooldownLeft > 0) return;

    setClaiming(true);
    toast.info("Claiming USDt...", "Awaiting wallet signature");
    try {
      const config   = getConfigPDA();
      const mint     = getUsdcMintPDA();
      const userATA  = getATA(mint, wallet.publicKey);
      const mintRecord = getMintRecordPDA(wallet.publicKey);

      await (program.methods as never as {
        mintUsdc: () => { accounts: (a: object) => { rpc: () => Promise<string> } }
      }).mintUsdc().accounts({
        user: wallet.publicKey,
        config,
        mint,
        userTokenAccount: userATA,
        mintRecord,
        tokenProgram: TOKEN_PROGRAM_ID,
      }).rpc();

      toast.success(`${MINT_AMOUNT_USDC} USDt claimed!`, "Added to your wallet");
      await fetchState();
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

  const fmtCooldown = () => {
    const h = Math.floor(cooldownLeft / 3600);
    const m = Math.floor((cooldownLeft % 3600) / 60);
    const s = cooldownLeft % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const canClaim  = cooldownLeft === 0 && !claiming;
  const connected = !!wallet.publicKey;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "10px",
      padding: "12px 18px",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
    }}>
      {/* USDt icon */}
      <div style={{
        width: "32px", height: "32px", borderRadius: "50%",
        background: "rgba(38,161,123,0.15)",
        border: "1px solid rgba(38,161,123,0.30)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="15" fill="#26A17B" />
          <text x="16" y="21" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white" fontFamily="sans-serif">₮</text>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "11px", letterSpacing: "0.6px", color: "var(--text-4)", marginBottom: "1px" }}>
          MOCK USDt BALANCE
        </div>
        <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)", fontFamily: "monospace" }}>
          {connected
            ? balance === null ? "—" : `${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDt`
            : "Connect wallet"
          }
        </div>
      </div>

      <button
        onClick={handleClaim}
        disabled={!canClaim || !connected}
        style={{
          background: canClaim && connected ? "var(--btn-primary-bg)" : "var(--surface-2)",
          color: canClaim && connected ? "var(--btn-primary-text)" : "var(--text-3)",
          fontWeight: 700, fontSize: "12.5px",
          padding: "9px 16px", borderRadius: "7px", border: "none",
          cursor: canClaim && connected ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", gap: "6px",
          whiteSpace: "nowrap",
          transition: "opacity 0.2s",
          fontFamily: "var(--font-dm), 'DM Sans', sans-serif",
          flexShrink: 0,
        }}
        onMouseEnter={e => { if (canClaim && connected) (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
      >
        {claiming ? (
          <>
            <svg width="12" height="12" viewBox="0 0 44 44" fill="none" style={{ animation: "spinRing 1.2s linear infinite" }}>
              <circle cx="22" cy="22" r="18" stroke="var(--border)" strokeWidth="5" />
              <path d="M22 4 A18 18 0 0 1 40 22" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            </svg>
            Claiming...
          </>
        ) : cooldownLeft > 0 ? (
          <>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4" />
              <path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            {fmtCooldown()}
          </>
        ) : (
          <>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Claim 1,000 USDt
          </>
        )}
      </button>
    </div>
  );
}
