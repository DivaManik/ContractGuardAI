"use client";
import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { IDL } from "./idl";

// ── Program & token constants ─────────────────────────────────────────────────
export const PROGRAM_ID       = new PublicKey("2Htsz7Xf4YWZTc8tupBTgsFHwZNZDzi59FRr9AWmxdNq");
export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const ASSOC_TOKEN_PID  = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
export const USDC_DECIMALS    = 6;
export const MINT_AMOUNT_USDC = 1_000; // per claim

// ── PDA derivations ───────────────────────────────────────────────────────────
export function getConfigPDA(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID)[0];
}

export function getUsdcMintPDA(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("usdc_mint")], PROGRAM_ID)[0];
}

export function getMintRecordPDA(user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint_record"), user.toBuffer()],
    PROGRAM_ID
  )[0];
}

export function getContractPDA(client: PublicKey, contractor: PublicKey, createdAt: BN): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("contract"),
      client.toBuffer(),
      contractor.toBuffer(),
      createdAt.toArrayLike(Buffer, "le", 8),
    ],
    PROGRAM_ID
  )[0];
}

// Derive Associated Token Account address
export function getATA(mint: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOC_TOKEN_PID
  )[0];
}

// ── Unit helpers ──────────────────────────────────────────────────────────────
export function usdcToUnits(usdc: number): BN {
  return new BN(Math.round(usdc * Math.pow(10, USDC_DECIMALS)));
}

export function unitsToUsdc(units: BN): number {
  return units.toNumber() / Math.pow(10, USDC_DECIMALS);
}

export function formatUsdc(units: BN): string {
  return unitsToUsdc(units).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Hash helper ───────────────────────────────────────────────────────────────
export async function hashString(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", encoded.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 64);
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useContractProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const program = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return null;
    const provider = new AnchorProvider(
      connection,
      wallet as never,
      { preflightCommitment: "confirmed", commitment: "confirmed" }
    );
    return new Program(IDL as never, provider);
  }, [connection, wallet]);

  return { program, wallet, connection };
}

export { BN, PublicKey };
