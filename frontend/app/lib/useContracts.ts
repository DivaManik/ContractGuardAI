"use client";
import { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useContractProgram, unitsToUsdc } from "./useContractProgram";

export type ContractStatus = "Active" | "Draft" | "Completed" | "Cancelled" | "Disputed";

export interface OnChainContract {
  id: string;
  title: string;
  contractor: string;
  contractorWallet: string;
  totalAmount: string;
  status: ContractStatus;
  checkpoints: { total: number; completed: number; current: string };
  createdAt: string;
  fairnessScore: number;
  role: "client" | "contractor";
}

interface RawCheckpoint {
  checkpointNumber: number;
  status: Record<string, unknown>;
}

interface RawContractAccount {
  client: PublicKey;
  contractor: PublicKey;
  totalAmount: BN;
  totalCheckpoints: number;
  completedCheckpoints: number;
  status: Record<string, unknown>;
  createdAt: BN;
  checkpoints: RawCheckpoint[];
}

interface ProgramAccountNamespace {
  contractAccount: {
    all: (filters: unknown[]) => Promise<Array<{ publicKey: PublicKey; account: RawContractAccount }>>;
  };
}

function shortKey(pk: PublicKey): string {
  const s = pk.toBase58();
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}

function deriveStatus(acc: RawContractAccount): ContractStatus {
  const key = Object.keys(acc.status)[0];
  if (key === "active") {
    const hasDisputed = acc.checkpoints?.some(cp => "disputed" in cp.status);
    if (hasDisputed) return "Disputed";
    return "Active";
  }
  if (key === "completed") return "Completed";
  if (key === "cancelled") return "Cancelled";
  return "Draft";
}

type ContractMeta = { title?: string; contractorName?: string; fairnessScore?: number };

function loadMeta(pdaStr: string): ContractMeta | null {
  try {
    const raw = localStorage.getItem(`cgmeta_${pdaStr}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveMeta(pdaStr: string, meta: ContractMeta): void {
  try {
    localStorage.setItem(`cgmeta_${pdaStr}`, JSON.stringify(meta));
  } catch { /* ignore quota errors */ }
}

async function fetchSupabaseMeta(pdaStr: string): Promise<ContractMeta | null> {
  try {
    const res = await fetch(`/api/contracts/${pdaStr}/metadata`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json() as { title?: string; fairness_score?: number; contractor_wallet?: string };
    if (!data.title) return null;
    return {
      title: data.title,
      fairnessScore: data.fairness_score ?? 0,
    };
  } catch {
    return null;
  }
}

export function useContracts() {
  const { program, wallet } = useContractProgram();
  const [contracts, setContracts] = useState<OnChainContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = useCallback(async () => {
    if (!program || !wallet.publicKey) {
      setContracts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pk = wallet.publicKey;
      const accounts = program.account as unknown as ProgramAccountNamespace;

      const [asClient, asContractor] = await Promise.all([
        accounts.contractAccount.all([{ memcmp: { offset: 8, bytes: pk.toBase58() } }]),
        accounts.contractAccount.all([{ memcmp: { offset: 40, bytes: pk.toBase58() } }]),
      ]);

      const seen = new Set<string>();
      const all = [
        ...asClient.map(a => ({ ...a, role: "client" as const })),
        ...asContractor.map(a => ({ ...a, role: "contractor" as const })),
      ].filter(({ publicKey }) => {
        const k = publicKey.toBase58();
        return seen.has(k) ? false : (seen.add(k), true);
      });

      // Sort by createdAt descending (newest first)
      all.sort((a, b) => b.account.createdAt.toNumber() - a.account.createdAt.toNumber());

      // Fetch metadata: localStorage first (fast), Supabase fallback (untuk title yang belum di-cache)
      const mapped: OnChainContract[] = await Promise.all(all.map(async ({ publicKey, account, role }) => {
        const pdaStr = publicKey.toBase58();
        let meta = loadMeta(pdaStr);
        if (!meta?.title) {
          const remote = await fetchSupabaseMeta(pdaStr);
          if (remote?.title) {
            meta = { ...meta, ...remote };
            saveMeta(pdaStr, meta); // cache untuk load berikutnya
          }
        }
        const status = deriveStatus(account);

        const activeCheckpoint = account.checkpoints?.find(cp => {
          const k = Object.keys(cp.status)[0];
          return k !== "approved" && k !== "expired";
        });
        const currentLabel = activeCheckpoint
          ? `Checkpoint ${activeCheckpoint.checkpointNumber + 1}`
          : status === "Completed" ? "All done" : "Not started";

        const totalUsdc = unitsToUsdc(account.totalAmount);
        const createdAt = new Date(account.createdAt.toNumber() * 1000).toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric",
        });

        return {
          id: pdaStr,
          title: meta?.title ?? `Contract ${pdaStr.slice(0, 8)}...`,
          contractor: meta?.contractorName ?? shortKey(account.contractor),
          contractorWallet: shortKey(account.contractor),
          totalAmount: `${totalUsdc.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`,
          status,
          checkpoints: {
            total: account.totalCheckpoints,
            completed: account.completedCheckpoints,
            current: currentLabel,
          },
          createdAt,
          fairnessScore: meta?.fairnessScore ?? 0,
          role,
        };
      }));

      setContracts(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch contracts");
    } finally {
      setLoading(false);
    }
  }, [program, wallet.publicKey]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  return { contracts, loading, error, refetch: fetchContracts };
}
