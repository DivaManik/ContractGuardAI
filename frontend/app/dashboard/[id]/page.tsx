"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { IconCheck, IconX, IconUpload } from "../../components/Icons";
import { toast } from "../../components/Toast";
import {
  useContractProgram, unitsToUsdc, formatUsdc, BN, PublicKey,
  getUsdcMintPDA, getATA, TOKEN_PROGRAM_ID,
} from "../../lib/useContractProgram";
import { Transaction, TransactionInstruction } from "@solana/web3.js";

const glass = {
  background: "var(--surface)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid var(--border)",
  boxShadow: "var(--glass-shadow)",
  borderRadius: "16px",
} as const;

type CPStatus = "approved" | "submitted" | "pending" | "revision" | "awaiting" | "expired" | "disputed";

interface CPEntry {
  id: number;
  name: string;
  description: string;
  payment: string;
  status: CPStatus;
  deadline: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  evidence: string | null;
  aiReport: { status: string; score: number; finding: string; details: string[] } | null;
}

interface ContractData {
  id: string;
  title: string;
  contractor: string;
  contractorWallet: string;
  clientWallet: string;
  totalAmount: string;
  currency: string;
  status: string;
  contractHash: string;
  aiReviewHash: string;
  createdAt: string;
  fairnessScore: number;
  checkpoints: CPEntry[];
}

const CP_STATUS: Record<CPStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  approved: { label: "APPROVED",        bg: "rgba(80,220,140,0.10)",  text: "rgba(80,220,140,0.90)",   border: "rgba(80,220,140,0.28)",  dot: "rgba(80,220,140,0.90)" },
  submitted:{ label: "SUBMITTED",       bg: "rgba(255,210,80,0.10)",  text: "rgba(255,210,80,0.90)",   border: "rgba(255,210,80,0.28)",  dot: "rgba(255,210,80,0.90)" },
  pending:  { label: "PENDING",         bg: "var(--surface-2)",       text: "var(--text-3)",            border: "var(--border)",          dot: "var(--text-4)" },
  revision: { label: "NEEDS REVISION",  bg: "rgba(255,80,80,0.10)",   text: "rgba(255,120,120,0.90)",  border: "rgba(255,80,80,0.28)",   dot: "rgba(255,120,120,0.90)" },
  awaiting: { label: "AWAITING AI",     bg: "rgba(160,80,255,0.10)",  text: "rgba(200,140,255,0.90)",  border: "rgba(160,80,255,0.28)",  dot: "rgba(200,140,255,0.90)" },
  expired:  { label: "EXPIRED",         bg: "rgba(120,120,120,0.10)", text: "rgba(160,160,160,0.90)",  border: "rgba(120,120,120,0.25)", dot: "rgba(160,160,160,0.90)" },
  disputed: { label: "DISPUTED",        bg: "rgba(255,140,0,0.10)",   text: "rgba(255,180,60,0.90)",   border: "rgba(255,140,0,0.28)",   dot: "rgba(255,180,60,0.90)" },
};

const PROGRAM_ID = "2Htsz7Xf4YWZTc8tupBTgsFHwZNZDzi59FRr9AWmxdNq";

const CONTRACT: ContractData = {
  id: "cg-001",
  title: "Renovasi Rumah Tingkat 2 — Jl. Sudirman",
  contractor: "PT. Bangun Jaya",
  contractorWallet: "7mXpLk9...3kRw",
  clientWallet: "8xKmPq2...9dFQ",
  totalAmount: "12.5",
  currency: "SOL",
  status: "Active",
  contractHash: "a7f3c92d1e8b4f56a2d0c3e7b1f9a4d8",
  aiReviewHash: "3b8f1a2c9d4e5f7a0b3c6e9f2a5b8c1d",
  createdAt: "Apr 20, 2025",
  fairnessScore: 6,
  checkpoints: [
    {
      id: 1,
      name: "Foundation & Structure",
      description: "Pondasi, kolom, dan struktur bangunan utama selesai. Termasuk penggalian, pengecoran fondasi, dan pemasangan kolom beton bertulang.",
      payment: "30",
      status: "approved" as CPStatus,
      deadline: "30 Apr 2025",
      submittedAt: "Apr 25, 2025",
      approvedAt: "Apr 26, 2025",
      evidence: "Foto fondasi sudah dicor + laporan pengawas lapangan.pdf",
      aiReport: {
        status: "APPROVED",
        score: 9,
        finding: "Bukti kerja sesuai spesifikasi kontrak. Pengecoran fondasi sudah dilakukan dengan tulangan yang benar. Tidak ada temuan signifikan.",
        details: ["Foto pengecoran fondasi menunjukkan ketebalan minimal 25cm sesuai kontrak", "Laporan pengawas menyatakan kualitas beton K-250 sesuai spesifikasi", "Tidak ada tanda-tanda keropos atau cacat struktural"],
      },
    },
    {
      id: 2,
      name: "Roofing & Walls",
      description: "Pemasangan atap, dinding bata, dan plester. Termasuk rangka atap baja ringan dan genteng metal.",
      payment: "40",
      status: "submitted" as CPStatus,
      deadline: "30 May 2025",
      submittedAt: "May 2, 2025",
      approvedAt: null,
      evidence: "Video progress atap + foto dinding.zip",
      aiReport: {
        status: "NEEDS_REVIEW",
        score: 7,
        finding: "Sebagian besar pekerjaan sesuai spesifikasi, namun ditemukan ketidaksesuaian pada pemasangan genteng di area pojok atap.",
        details: ["Rangka atap baja ringan terpasang sesuai spesifikasi", "Dinding bata sudah diplester rata", "PERHATIAN: Area pojok atap barat daya menunjukkan celah yang berpotensi menyebabkan kebocoran — perlu perbaikan sebelum approval"],
      },
    },
    {
      id: 3,
      name: "Finishing",
      description: "Pengecatan, pemasangan lantai keramik, dan finishing akhir.",
      payment: "30",
      status: "pending" as CPStatus,
      deadline: null,
      submittedAt: null,
      approvedAt: null,
      evidence: null,
      aiReport: null,
    },
  ],
};

function StatusBadge({ status }: { status: CPStatus }) {
  const s = CP_STATUS[status];
  return (
    <span style={{
      fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.7px",
      padding: "4px 11px", borderRadius: "999px",
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
    }}>{s.label}</span>
  );
}

// ── On-chain status → UI status mapping ──────────────────────────────────────
function mapCPStatus(s: Record<string, unknown>): CPStatus {
  if (s.approved !== undefined)        return "approved";
  if (s.submitted !== undefined)       return "submitted";
  if (s.needsRevision !== undefined)   return "revision";
  if (s.awaitingAiReview !== undefined) return "awaiting";
  if (s.expired !== undefined)         return "expired";
  if (s.disputed !== undefined)        return "disputed";
  return "pending";
}

export default function ContractDetailPage() {
  const params = useParams();
  const idParam = typeof params?.id === "string" ? params.id : (Array.isArray(params?.id) ? params.id[0] : "");

  const { program, wallet, connection } = useContractProgram();
  const [activeCP, setActiveCP] = useState<number | null>(1);
  const [submitMode, setSubmitMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evidenceHash, setEvidenceHash] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; cid: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [escrowReady, setEscrowReady] = useState(false);
  const [onchainLoaded, setOnchainLoaded] = useState(false);
  const [contract, setContract] = useState<ContractData>(CONTRACT);
  // Raw on-chain data cached for action calls
  const [onchainAcc, setOnchainAcc] = useState<{
    client: PublicKey; contractor: PublicKey; mint: PublicKey; createdAt: BN;
  } | null>(null);

  type ChainAcc = {
    client: PublicKey; contractor: PublicKey; mint: PublicKey;
    contractHash: string; aiReviewHash: string; totalAmount: BN;
    status: Record<string, unknown>; createdAt: BN; bump: number;
    checkpoints: Array<{
      checkpointNumber: number; descriptionHash: string; evidenceHash: string;
      paymentAmount: BN; status: Record<string, unknown>; deadline: BN;
      submittedAt: BN; reviewedAt: BN;
    }>;
  };

  const fetchOnchain = async () => {
    if (!program || !idParam || idParam.length < 32) return;
    let pubkey: PublicKey;
    try { pubkey = new PublicKey(idParam); } catch { return; }
    try {
      const acc = await (program.account as never as {
        contractAccount: { fetch: (pk: PublicKey) => Promise<ChainAcc> }
      }).contractAccount.fetch(pubkey);

      // Resolve title: localStorage cache → Supabase → fallback to PDA prefix
      let resolvedTitle = `Contract ${idParam.slice(0, 8)}...`;
      let resolvedFairness = 0;
      try {
        const cached = localStorage.getItem(`cgmeta_${idParam}`);
        if (cached) {
          const m = JSON.parse(cached) as { title?: string; fairnessScore?: number };
          if (m.title) resolvedTitle = m.title;
          if (m.fairnessScore) resolvedFairness = m.fairnessScore;
        }
      } catch { /* ignore */ }
      // Always check Supabase too (in case cache is stale or missing)
      try {
        const res = await fetch(`/api/contracts/${idParam}/metadata`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const meta = await res.json() as { title?: string; fairness_score?: number };
          if (meta.title) {
            resolvedTitle = meta.title;
            resolvedFairness = meta.fairness_score ?? resolvedFairness;
            // Refresh cache
            try {
              localStorage.setItem(`cgmeta_${idParam}`, JSON.stringify({
                title: meta.title, fairnessScore: meta.fairness_score ?? 0,
              }));
            } catch { /* ignore */ }
          }
        }
      } catch { /* ignore network errors */ }

      const usdcTotal = unitsToUsdc(acc.totalAmount);
      setOnchainAcc({ client: acc.client, contractor: acc.contractor, mint: acc.mint, createdAt: acc.createdAt });
      setContract({
        id: idParam,
        title: resolvedTitle,
        contractor: acc.contractor.toBase58().slice(0, 8) + "...",
        contractorWallet: acc.contractor.toBase58(),
        clientWallet: acc.client.toBase58(),
        totalAmount: usdcTotal.toFixed(2),
        currency: "USDt",
        status: (Object.keys(acc.status)[0] ?? "Active").charAt(0).toUpperCase() + (Object.keys(acc.status)[0] ?? "active").slice(1),
        contractHash: acc.contractHash,
        aiReviewHash: acc.aiReviewHash,
        createdAt: new Date(acc.createdAt.toNumber() * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        fairnessScore: resolvedFairness || 8,
        checkpoints: acc.checkpoints.map((cp, i) => ({
          id: i + 1,
          name: `Checkpoint ${cp.checkpointNumber}`,
          description: cp.descriptionHash,
          payment: usdcTotal > 0 ? ((unitsToUsdc(cp.paymentAmount) / usdcTotal) * 100).toFixed(0) : "0",
          status: mapCPStatus(cp.status),
          deadline: cp.deadline.toNumber() > 0 ? new Date(cp.deadline.toNumber() * 1000).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : null,
          submittedAt: cp.submittedAt.toNumber() > 0 ? new Date(cp.submittedAt.toNumber() * 1000).toLocaleDateString() : null,
          approvedAt: cp.reviewedAt.toNumber() > 0 ? new Date(cp.reviewedAt.toNumber() * 1000).toLocaleDateString() : null,
          evidence: cp.evidenceHash || null,
          aiReport: null,
        })),
      });
      setOnchainLoaded(true);
    } catch { /* fall back to mock */ }
  };

  useEffect(() => { fetchOnchain(); }, [program, idParam]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => setEscrowReady(true), 400);
    return () => clearTimeout(t);
  }, []);

  const totalPaid = contract.checkpoints
    .filter(cp => cp.status === "approved")
    .reduce((sum, cp) => sum + parseFloat(cp.payment), 0);
  const totalAmount = parseFloat(contract.totalAmount);
  const paidAmount  = (totalPaid / 100) * totalAmount;
  const lockedAmount = totalAmount - paidAmount;

  // ── On-chain helpers ──────────────────────────────────────────────────────
  const getTokenAccounts = (mintPk: PublicKey, clientPk: PublicKey, contractorPk: PublicKey, contractPDA: PublicKey) => {
    const escrowATA      = getATA(mintPk, contractPDA);
    const clientATA      = getATA(mintPk, clientPk);
    const contractorATA  = getATA(mintPk, contractorPk);
    return { escrowATA, clientATA, contractorATA };
  };

  const handleAiReview = useCallback(async (cp: CPEntry) => {
    if (!cp.evidence) { toast.error("Tidak ada bukti", "Contractor belum submit evidence"); return; }
    setReviewing(true);
    toast.info("AI Review dimulai...", "Menganalisis bukti kerja vs kontrak");
    try {
      // Selalu pakai route baru — baca file lokal dari evidence/{pdaAddress}/
      const body = {
        submissionId: submissionId ?? undefined,
        pdaAddress: idParam,
        checkpointIndex: cp.id - 1,
      };

      const res = await fetch("/api/review/checkpoint-with-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as {
        recommendation?: string;
        score?: number; finding?: string; details?: string[];
        confidence?: number; summary?: string; notes?: string[];
        status?: string; compliance_score?: number; findings?: string;
        required_fixes?: string[]; approved_items?: string[];
        error?: string;
      };
      if (!res.ok || data.error) throw new Error(data.error ?? "Review gagal");

      const aiReport = {
        status: data.recommendation ?? data.status ?? "REVISION",
        score: data.score ?? Math.round(data.confidence ?? 0) ?? data.compliance_score ?? 0,
        finding: data.finding ?? data.summary ?? data.findings ?? "",
        details: data.details ?? data.notes ?? [
          ...(data.approved_items ?? []),
          ...(data.required_fixes ?? []).map(f => `PERHATIAN: ${f}`),
        ],
      };

      setContract(prev => ({
        ...prev,
        checkpoints: prev.checkpoints.map(c =>
          c.id === cp.id ? { ...c, aiReport, status: "awaiting" as CPStatus } : c
        ),
      }));
      toast.success(`Review selesai: ${aiReport.status}`, `Score: ${aiReport.score}/100`);
    } catch (err) {
      toast.error("Review gagal", err instanceof Error ? err.message.slice(0, 200) : "Coba lagi");
    } finally {
      setReviewing(false);
    }
  }, [submissionId, idParam, contract.title, contract.totalAmount]);

  const handleFileUpload = useCallback(async (file: File) => {
    const ALLOWED = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!ALLOWED.includes(file.type)) {
      setUploadError("Format tidak didukung. Gunakan JPG, PNG, atau PDF.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("File terlalu besar (max 50MB).");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadedFile(null);
    setEvidenceHash("");
    setSubmissionId(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("pdaAddress", idParam);
      fd.append("checkpointIndex", String((activeCP ?? 1) - 1));
      fd.append("contractorWallet", wallet.publicKey?.toBase58() ?? "");

      // Pakai endpoint baru yang upload ke Supabase + Pinata sekaligus
      const res = await fetch("/api/evidence/upload", { method: "POST", body: fd });
      const json = await res.json() as { ipfsCid?: string; submissionId?: string; error?: string };
      if (!res.ok || !json.ipfsCid) throw new Error(json.error ?? "Upload gagal");

      setUploadedFile({ name: file.name, cid: json.ipfsCid });
      setEvidenceHash(json.ipfsCid);
      if (json.submissionId) setSubmissionId(json.submissionId);
      toast.success("File ter-upload!", `CID: ${json.ipfsCid.slice(0, 20)}...`);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  }, [idParam, activeCP, wallet.publicKey]);

  const handleSubmit = async () => {
    const cpIdx = activeCP !== null ? activeCP - 1 : -1;
    if (!program || !wallet.publicKey) {
      toast.error("Wallet tidak terhubung", "Hubungkan Phantom wallet terlebih dahulu");
      return;
    }
    if (!onchainAcc || cpIdx < 0) {
      toast.error("Data kontrak belum dimuat", "Refresh halaman dan coba lagi");
      return;
    }
    if (!evidenceHash.trim()) { toast.error("Missing hash", "Enter an evidence hash"); return; }
    setSubmitting(true);
    toast.info("Submitting checkpoint...", "Awaiting wallet signature");
    try {
      const pdaPubkey = new PublicKey(idParam);
      type M = { submitCheckpoint: (i: number, h: string) => { accounts: (a: object) => { rpc: () => Promise<string> } } };
      await (program.methods as never as M).submitCheckpoint(cpIdx, evidenceHash.trim()).accounts({
        contractor: wallet.publicKey,
        contract: pdaPubkey,
      }).rpc();
      toast.success("Checkpoint submitted!", "Client will be notified");
      setSubmitMode(false);
      setEvidenceHash("");
      await fetchOnchain();
    } catch (err: unknown) {
      toast.error("Submit failed", (err instanceof Error ? err.message : String(err)).slice(0, 200));
    } finally { setSubmitting(false); }
  };

  const handleApprove = async () => {
    const cpIdx = activeCP !== null ? activeCP - 1 : -1;
    if (!program || !wallet.publicKey || !onchainAcc || cpIdx < 0) {
      toast.success("Checkpoint approved", "Payment released to contractor");
      return;
    }
    try {
      const pdaPubkey = new PublicKey(idParam);
      const { escrowATA, clientATA, contractorATA } = getTokenAccounts(
        onchainAcc.mint, onchainAcc.client, onchainAcc.contractor, pdaPubkey
      );

      // Buat ATA contractor jika belum ada (create_idempotent)
      const ataInfo = await connection.getAccountInfo(contractorATA);
      if (!ataInfo) {
        toast.info("Menyiapkan wallet contractor...", "Membuat USDt token account");
        const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bE8");
        const SYSTEM_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");
        const createATAIx = new TransactionInstruction({
          programId: ASSOCIATED_TOKEN_PROGRAM_ID,
          keys: [
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: contractorATA, isSigner: false, isWritable: true },
            { pubkey: onchainAcc.contractor, isSigner: false, isWritable: false },
            { pubkey: onchainAcc.mint, isSigner: false, isWritable: false },
            { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          ],
          data: Buffer.from([1]), // create_idempotent
        });
        const tx = new Transaction().add(createATAIx);
        const sig = await wallet.sendTransaction(tx, connection);
        await connection.confirmTransaction(sig, "confirmed");
      }

      type M = { approveCheckpoint: (i: number, h: string) => { accounts: (a: object) => { rpc: () => Promise<string> } } };
      await (program.methods as never as M).approveCheckpoint(cpIdx, "ai_approved").accounts({
        client: wallet.publicKey, contractor: onchainAcc.contractor, contract: pdaPubkey,
        mint: onchainAcc.mint, escrowTokenAccount: escrowATA,
        contractorTokenAccount: contractorATA, clientTokenAccount: clientATA,
        tokenProgram: TOKEN_PROGRAM_ID,
      }).rpc();
      toast.success("Checkpoint approved!", "USDt released to contractor");
      await fetchOnchain();
    } catch (err: unknown) {
      toast.error("Approve failed", (err instanceof Error ? err.message : String(err)).slice(0, 200));
    }
  };

  const handleRevision = async () => {
    const cpIdx = activeCP !== null ? activeCP - 1 : -1;
    if (!program || !wallet.publicKey || !onchainAcc || cpIdx < 0) {
      toast.warning("Revision requested", "Contractor will be notified");
      return;
    }
    try {
      const pdaPubkey = new PublicKey(idParam);
      type M = { requestRevision: (i: number, h: string) => { accounts: (a: object) => { rpc: () => Promise<string> } } };
      await (program.methods as never as M).requestRevision(cpIdx, "revision_requested").accounts({
        client: wallet.publicKey, contractor: onchainAcc.contractor, contract: pdaPubkey,
      }).rpc();
      toast.warning("Revision requested!", "Contractor notified on-chain");
      await fetchOnchain();
    } catch (err: unknown) {
      toast.error("Revision failed", (err instanceof Error ? err.message : String(err)).slice(0, 200));
    }
  };

  const handleAccept = async () => {
    if (!program || !wallet.publicKey || !onchainAcc) {
      toast.error("Wallet tidak terhubung", "Hubungkan Phantom wallet terlebih dahulu");
      return;
    }
    try {
      const pdaPubkey = new PublicKey(idParam);
      type M = { acceptContract: () => { accounts: (a: object) => { rpc: () => Promise<string> } } };
      await (program.methods as never as M).acceptContract().accounts({
        contractor: wallet.publicKey,
        contract: pdaPubkey,
      }).rpc();
      toast.success("Kontrak diterima!", "Status berubah ke Active — kamu bisa submit checkpoint sekarang");
      await fetchOnchain();
    } catch (err: unknown) {
      toast.error("Accept failed", (err instanceof Error ? err.message : String(err)).slice(0, 200));
    }
  };

  const handleCancel = async () => {
    if (!program || !wallet.publicKey || !onchainAcc) {
      toast.warning("Cancel not available", "Connect wallet first");
      return;
    }
    try {
      const pdaPubkey = new PublicKey(idParam);
      const { escrowATA, clientATA } = getTokenAccounts(
        onchainAcc.mint, onchainAcc.client, onchainAcc.contractor, pdaPubkey
      );
      type M = { cancelContract: () => { accounts: (a: object) => { rpc: () => Promise<string> } } };
      await (program.methods as never as M).cancelContract().accounts({
        client: wallet.publicKey, contractor: onchainAcc.contractor, contract: pdaPubkey,
        mint: onchainAcc.mint, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
        tokenProgram: TOKEN_PROGRAM_ID,
      }).rpc();
      toast.success("Contract cancelled", "USDt refunded to client");
      await fetchOnchain();
    } catch (err: unknown) {
      toast.error("Cancel failed", (err instanceof Error ? err.message : String(err)).slice(0, 200));
    }
  };

  const currentCP = activeCP !== null ? contract.checkpoints.find(c => c.id === activeCP) : null;

  const walletAddress = wallet.publicKey?.toBase58() ?? "";
  const isContractor = !!walletAddress && (
    walletAddress === onchainAcc?.contractor.toBase58() ||
    (!onchainAcc && walletAddress === contract.contractorWallet)
  );
  const isClient = !!walletAddress && (
    walletAddress === onchainAcc?.client.toBase58() ||
    (!onchainAcc && walletAddress === contract.clientWallet)
  );

  return (
    <main style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--text)" }}>
      <Navbar />

      <div style={{
        position: "fixed", pointerEvents: "none", zIndex: 0,
        top: "30%", left: "50%", transform: "translate(-50%,-50%)",
        width: "65%", height: "60%",
        background: "radial-gradient(ellipse, var(--orb) 0%, transparent 65%)",
        filter: "blur(70px)",
      }} />

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "110px 80px 80px", position: "relative", zIndex: 1 }}>

        {/* Back link */}
        <Link href="/dashboard" className="page-in p0" style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          color: "var(--text-3)", textDecoration: "none",
          fontSize: "13px", marginBottom: "28px",
          transition: "color 0.2s, transform 0.2s",
        }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)";
            (e.currentTarget as HTMLAnchorElement).style.transform = "translateX(-3px)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-3)";
            (e.currentTarget as HTMLAnchorElement).style.transform = "translateX(0)";
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10 7H2M2 7L6 3M2 7L6 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Contract header */}
        <div className="page-in p1" style={{ ...glass, padding: "28px 32px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <span style={{
                  fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.7px", padding: "4px 11px",
                  borderRadius: "999px", background: "rgba(80,220,140,0.10)",
                  color: "rgba(80,220,140,0.90)", border: "1px solid rgba(80,220,140,0.28)",
                }}>{contract.status.toUpperCase()}</span>
                {onchainLoaded && (
                  <span style={{
                    fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px", padding: "3px 9px",
                    borderRadius: "999px", background: "rgba(80,160,255,0.10)",
                    color: "rgba(100,180,255,0.90)", border: "1px solid rgba(80,160,255,0.25)",
                    display: "inline-flex", alignItems: "center", gap: "5px",
                  }}>
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "rgba(100,180,255,0.90)", display: "inline-block" }} />
                    LIVE ON-CHAIN
                  </span>
                )}
                <span style={{ fontSize: "11.5px", color: "var(--text-4)" }}>{contract.createdAt}</span>
              </div>
              <h1 style={{
                fontSize: "clamp(20px,2.5vw,28px)", fontWeight: 900,
                letterSpacing: "-0.03em", color: "var(--text)", marginBottom: "12px",
              }}>{contract.title}</h1>
              <div style={{ display: "flex", gap: "24px" }}>
                {[
                  { label: "CLIENT", value: contract.clientWallet },
                  { label: "CONTRACTOR", value: `${contract.contractor} (${contract.contractorWallet})` },
                ].map((p, i) => (
                  <div key={i}>
                    <div style={{ fontSize: "9.5px", letterSpacing: "1.5px", color: "var(--text-4)", marginBottom: "3px" }}>{p.label}</div>
                    <div style={{ fontSize: "12.5px", fontFamily: "monospace", color: "var(--text-2)" }}>{p.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Escrow summary */}
            <div style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "12px", padding: "20px 24px", minWidth: "220px",
              boxShadow: "inset 0 1px 0 var(--border)",
            }}>
              <div style={{ fontSize: "10px", letterSpacing: "1.5px", color: "var(--accent-text-dim)", marginBottom: "6px" }}>ESCROW STATUS</div>
              <div style={{ fontSize: "26px", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: "12px", background: "linear-gradient(135deg, var(--accent-2), var(--accent))", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {contract.totalAmount} USDt
              </div>
              {/* Escrow bar */}
              <div style={{ height: "5px", borderRadius: "999px", background: "var(--border-light)", overflow: "hidden", marginBottom: "8px" }}>
                <div style={{
                  height: "100%", borderRadius: "999px",
                  width: escrowReady ? `${totalPaid}%` : "0%",
                  background: "linear-gradient(to right, rgba(80,220,140,0.85), rgba(80,220,140,0.50))",
                  transition: "width 1.4s cubic-bezier(0.16,1,0.3,1)",
                  boxShadow: "0 0 8px rgba(80,220,140,0.40)",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "14px" }}>
                <span style={{ color: "rgba(80,220,140,0.70)" }}>Released: {paidAmount.toFixed(2)} USDt</span>
                <span style={{ color: "var(--text-4)" }}>Locked: {lockedAmount.toFixed(2)} USDt</span>
              </div>
              {/* Accept Contract — hanya untuk contractor saat status Draft */}
              {contract.status === "Draft" && onchainAcc && wallet.publicKey?.toBase58() === onchainAcc.contractor.toBase58() && (
                <button onClick={handleAccept} style={{
                  width: "100%", padding: "9px", borderRadius: "7px",
                  background: "rgba(80,220,140,0.12)",
                  border: "1px solid rgba(80,220,140,0.35)",
                  color: "rgba(80,220,140,0.95)",
                  fontSize: "12px", fontWeight: 700, cursor: "pointer",
                  fontFamily: "var(--font-dm), 'DM Sans', sans-serif",
                  marginBottom: "8px",
                  transition: "background 0.2s, border-color 0.2s",
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(80,220,140,0.20)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(80,220,140,0.55)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(80,220,140,0.12)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(80,220,140,0.35)";
                  }}
                >
                  ✓ Accept Contract
                </button>
              )}

              {(contract.status === "Active" || contract.status === "Draft") && (
                <button onClick={handleCancel} style={{
                  width: "100%", padding: "9px", borderRadius: "7px",
                  background: "rgba(255,60,60,0.08)",
                  border: "1px solid rgba(255,60,60,0.25)",
                  color: "rgba(255,100,100,0.85)",
                  fontSize: "12px", fontWeight: 600, cursor: "pointer",
                  fontFamily: "var(--font-dm), 'DM Sans', sans-serif",
                  transition: "background 0.2s, border-color 0.2s",
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,60,60,0.15)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,60,60,0.40)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,60,60,0.08)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,60,60,0.25)";
                  }}
                >Cancel Contract</button>
              )}
            </div>
          </div>
        </div>

        {/* Main content: 2 columns */}
        <div className="page-in p2" style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: "20px" }}>

          {/* LEFT: Checkpoint timeline */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: "var(--accent-text-dim)", marginBottom: "4px", paddingLeft: "4px" }}>
              CHECKPOINTS
            </div>
            {contract.checkpoints.map((cp, i) => {
              const st = CP_STATUS[cp.status];
              const isActive = activeCP === cp.id;
              return (
                <div key={cp.id} style={{ position: "relative" }}>
                  {/* Connector line */}
                  {i < contract.checkpoints.length - 1 && (
                    <div style={{
                      position: "absolute", left: "20px", top: "100%",
                      width: "2px", height: "10px",
                      background: `linear-gradient(to bottom, ${st.dot}, transparent)`,
                      zIndex: 2,
                    }} />
                  )}
                  <div
                    onClick={() => setActiveCP(isActive ? null : cp.id)}
                    style={{
                      ...glass, padding: "20px 22px",
                      cursor: "pointer",
                      border: isActive ? "1px solid var(--border-strong)" : "1px solid var(--border-light)",
                      background: isActive ? "var(--surface)" : "var(--surface-2)",
                      transition: "all 0.2s",
                      animation: `fadeSlideUp 0.42s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s both`,
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                        (e.currentTarget as HTMLDivElement).style.background = "var(--surface)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-light)";
                        (e.currentTarget as HTMLDivElement).style.background = "var(--surface-2)";
                      }
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                        {/* Step indicator */}
                        <div style={{
                          width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: cp.status === "approved" ? "rgba(80,220,140,0.12)" : "var(--surface-2)",
                          border: `1px solid ${st.dot}44`,
                          boxShadow: `0 0 12px ${st.dot}20`,
                        }}>
                          {cp.status === "approved" ? (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M2 7 L5.5 10.5 L12 4" stroke="rgba(80,220,140,0.90)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : (
                            <span style={{ fontSize: "12px", fontWeight: 700, color: st.dot }}>{cp.id}</span>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>{cp.name}</div>
                          <div style={{ fontSize: "12px", color: "var(--text-3)", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <span>{(parseFloat(cp.payment) / 100 * totalAmount).toFixed(2)} USDt ({cp.payment}%)</span>
                            {cp.deadline && (
                              <span style={{
                                color: cp.status === "pending" || cp.status === "revision"
                                  ? new Date(cp.deadline) < new Date() ? "rgba(255,100,100,0.85)" : "rgba(255,210,80,0.80)"
                                  : "var(--text-4)",
                              }}>
                                · Deadline: {cp.deadline}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={cp.status} />
                    </div>

                    {isActive && (
                      <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border-light)" }}>
                        <p style={{ fontSize: "13px", color: "var(--text-3)", lineHeight: 1.65, marginBottom: "16px" }}>
                          {cp.description}
                        </p>

                        {/* Action buttons */}
                        {cp.status === "submitted" && isClient && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

                            {/* Evidence link + AI Review */}
                            <div style={{ display: "flex", gap: "8px" }}>
                              {cp.evidence && (
                                <a
                                  href={`https://gateway.pinata.cloud/ipfs/${cp.evidence}`}
                                  target="_blank" rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  style={{
                                    flex: 1, padding: "9px 0", borderRadius: "7px", textDecoration: "none",
                                    background: "var(--surface-2)", border: "1px solid var(--border)",
                                    color: "var(--text-3)", fontWeight: 600, fontSize: "12.5px",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                                    transition: "border-color 0.2s, color 0.2s",
                                  }}
                                  onMouseEnter={e => {
                                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border-strong)";
                                    (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)";
                                  }}
                                  onMouseLeave={e => {
                                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)";
                                    (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-3)";
                                  }}
                                >
                                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                    <path d="M1 6a5 5 0 1 0 10 0A5 5 0 0 0 1 6Z" stroke="currentColor" strokeWidth="1.3"/>
                                    <path d="M6 3v3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                                  </svg>
                                  Lihat Bukti
                                </a>
                              )}
                              {!cp.aiReport && (
                                <button
                                  onClick={e => { e.stopPropagation(); handleAiReview(cp); }}
                                  disabled={reviewing}
                                  style={{
                                    flex: 2, padding: "9px 0", borderRadius: "7px",
                                    background: reviewing ? "var(--surface-2)" : "rgba(160,80,255,0.12)",
                                    border: `1px solid ${reviewing ? "var(--border)" : "rgba(160,80,255,0.30)"}`,
                                    color: reviewing ? "var(--text-4)" : "rgba(200,140,255,0.90)",
                                    fontWeight: 700, fontSize: "12.5px", cursor: reviewing ? "not-allowed" : "pointer",
                                    fontFamily: "var(--font-dm), 'DM Sans', sans-serif",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                                    transition: "background 0.2s, transform 0.15s",
                                  } as React.CSSProperties}
                                  onMouseEnter={e => { if (!reviewing) (e.currentTarget as HTMLButtonElement).style.background = "rgba(160,80,255,0.20)"; }}
                                  onMouseLeave={e => { if (!reviewing) (e.currentTarget as HTMLButtonElement).style.background = "rgba(160,80,255,0.12)"; }}
                                >
                                  {reviewing ? (
                                    <>
                                      <svg width="12" height="12" viewBox="0 0 44 44" fill="none" style={{ animation: "spinRing 1s linear infinite" }}>
                                        <circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="5" strokeOpacity="0.3"/>
                                        <path d="M22 4 A18 18 0 0 1 40 22" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
                                      </svg>
                                      AI sedang menganalisis...
                                    </>
                                  ) : (
                                    <>
                                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                                        <path d="M7 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z" stroke="currentColor" strokeWidth="1.5"/>
                                        <path d="M5 7l1.5 1.5L9.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                      Start AI Review
                                    </>
                                  )}
                                </button>
                              )}
                              {cp.aiReport && (
                                <div style={{
                                  flex: 2, padding: "9px 0", borderRadius: "7px", textAlign: "center",
                                  background: "rgba(80,220,140,0.08)", border: "1px solid rgba(80,220,140,0.25)",
                                  color: "rgba(80,220,140,0.80)", fontSize: "12.5px", fontWeight: 600,
                                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                                }}>
                                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                                    <path d="M2 7L5.5 10.5L12 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  AI Review selesai
                                </div>
                              )}
                            </div>

                            {/* Approve / Revision */}
                            <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={e => { e.stopPropagation(); handleApprove(); }}
                              style={{
                                flex: 1, padding: "10px 0", borderRadius: "7px",
                                background: "rgba(80,220,140,0.15)",
                                border: "1px solid rgba(80,220,140,0.30)",
                                color: "rgba(80,220,140,0.90)", fontWeight: 700, fontSize: "13px",
                                cursor: "pointer",
                                fontFamily: "var(--font-dm), 'DM Sans', sans-serif",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                                transition: "background 0.2s, border-color 0.2s, transform 0.15s",
                              } as React.CSSProperties}
                              onMouseEnter={e => {
                                (e.currentTarget as HTMLButtonElement).style.background = "rgba(80,220,140,0.24)";
                                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                              }}
                              onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.background = "rgba(80,220,140,0.15)";
                                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                              }}
                              onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
                              onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
                            >
                              <IconCheck size={14} color="rgba(80,220,140,0.90)" strokeWidth={2.2} />
                              Approve
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleRevision(); }}
                              style={{
                                flex: 1, padding: "10px 0", borderRadius: "7px",
                                background: "rgba(255,80,80,0.08)",
                                border: "1px solid rgba(255,80,80,0.22)",
                                color: "rgba(255,120,120,0.90)", fontWeight: 700, fontSize: "13px",
                                cursor: "pointer",
                                fontFamily: "var(--font-dm), 'DM Sans', sans-serif",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                                transition: "background 0.2s, border-color 0.2s, transform 0.15s",
                              } as React.CSSProperties}
                              onMouseEnter={e => {
                                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,80,80,0.16)";
                                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                              }}
                              onMouseLeave={e => {
                                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,80,80,0.08)";
                                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                              }}
                              onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
                              onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
                            >
                              <IconX size={14} color="rgba(255,120,120,0.90)" strokeWidth={2.2} />
                              Request Revision
                            </button>
                            </div>
                          </div>
                        )}

                        {(cp.status === "pending" || cp.status === "revision") && isContractor && (
                          <button
                            onClick={e => { e.stopPropagation(); setSubmitMode(true); }}
                            style={{
                              width: "100%", padding: "11px", borderRadius: "7px",
                              background: "var(--btn-ghost-bg)",
                              border: "1px solid var(--btn-ghost-border)",
                              color: "var(--text)", fontWeight: 700, fontSize: "13.5px",
                              cursor: "pointer",
                              fontFamily: "var(--font-dm), 'DM Sans', sans-serif",
                              boxShadow: "inset 0 1px 0 var(--border)",
                              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                              transition: "background 0.2s, transform 0.15s",
                            } as React.CSSProperties}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)";
                              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLButtonElement).style.background = "var(--btn-ghost-bg)";
                              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                            }}
                            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
                            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
                          >
                            <IconUpload size={15} color="currentColor" strokeWidth={1.8} />
                            Submit Evidence
                          </button>
                        )}

                        {/* Role hint — shown when wallet is connected but not a party */}
                        {!isClient && !isContractor && walletAddress && (cp.status === "submitted" || cp.status === "pending" || cp.status === "revision") && (
                          <div style={{ fontSize: "12px", color: "var(--text-4)", padding: "8px 12px", background: "var(--surface-2)", borderRadius: "7px", border: "1px solid var(--border-light)" }}>
                            Kamu bukan pihak dalam kontrak ini
                          </div>
                        )}

                        {cp.status === "approved" && (
                          <div style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            fontSize: "12.5px", color: "rgba(80,220,140,0.70)",
                          }}>
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                              <path d="M2 7 L5.5 10.5 L12 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Payment released · {(parseFloat(cp.payment) / 100 * totalAmount).toFixed(2)} USDt sent to contractor
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT: AI report + contract info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Submit evidence modal overlay — contractor only */}
            {submitMode && isContractor && (
              <div style={{
                ...glass, padding: "28px 30px",
                border: "1px solid var(--border-strong)",
                animation: "fadeSlideUp 0.32s cubic-bezier(0.16,1,0.3,1) both",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
                    Submit Evidence
                  </h3>
                  <button onClick={() => {
                    setSubmitMode(false);
                    setUploadedFile(null);
                    setEvidenceHash("");
                    setUploadError(null);
                    setSubmissionId(null);
                  }} style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    color: "var(--text-3)", padding: "4px",
                    transition: "color 0.2s",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)"; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  style={{ display: "none" }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                    e.target.value = "";
                  }}
                />

                {/* Drop zone */}
                <div
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  style={{
                    background: dragOver ? "var(--surface)" : uploadedFile ? "rgba(80,220,140,0.06)" : "var(--surface-2)",
                    border: `1px dashed ${dragOver ? "var(--accent)" : uploadedFile ? "rgba(80,220,140,0.40)" : "var(--border)"}`,
                    borderRadius: "10px", padding: "28px 24px",
                    textAlign: "center", marginBottom: "14px",
                    cursor: uploading ? "wait" : "pointer",
                    transition: "border-color 0.2s, background 0.2s",
                  }}
                >
                  {uploading ? (
                    <>
                      <svg width="24" height="24" viewBox="0 0 44 44" fill="none" style={{ animation: "spinRing 1s linear infinite", margin: "0 auto 10px" }}>
                        <circle cx="22" cy="22" r="18" stroke="var(--text-4)" strokeWidth="5" />
                        <path d="M22 4 A18 18 0 0 1 40 22" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" />
                      </svg>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-3)" }}>Uploading ke IPFS...</div>
                    </>
                  ) : uploadedFile ? (
                    <>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 8px", display: "block" }}>
                        <circle cx="12" cy="12" r="11" stroke="rgba(80,220,140,0.70)" strokeWidth="1.5" />
                        <path d="M7 12.5L10.5 16L17 9" stroke="rgba(80,220,140,0.90)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "rgba(80,220,140,0.90)", marginBottom: "4px" }}>
                        {uploadedFile.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-4)", fontFamily: "monospace" }}>
                        {uploadedFile.cid.slice(0, 24)}...
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-4)", marginTop: "6px" }}>
                        Klik untuk ganti file
                      </div>
                    </>
                  ) : (
                    <>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 10px", display: "block", opacity: 0.4 }}>
                        <path d="M12 16V8M12 8L9 11M12 8L15 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M20 16.7A4 4 0 0 0 18 9h-1.26A7 7 0 1 0 4 15.65" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-2)", marginBottom: "4px" }}>
                        Klik atau drag file ke sini
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-4)" }}>
                        JPG, PNG, PDF · Max 50MB · Disimpan di IPFS
                      </div>
                    </>
                  )}
                </div>

                {/* Upload error */}
                {uploadError && (
                  <div style={{ fontSize: "12px", color: "rgba(255,100,100,0.90)", marginBottom: "10px", padding: "8px 12px", background: "rgba(255,80,80,0.08)", borderRadius: "7px", border: "1px solid rgba(255,80,80,0.20)" }}>
                    {uploadError}
                  </div>
                )}

                {/* CID field (readonly setelah upload, manual jika belum upload) */}
                <input
                  style={{
                    width: "100%", background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    borderRadius: "8px", padding: "12px 14px",
                    color: uploadedFile ? "rgba(80,220,140,0.85)" : "var(--input-text)",
                    fontSize: "12px", outline: "none",
                    fontFamily: "monospace", boxSizing: "border-box" as const,
                    marginBottom: "14px", transition: "border-color 0.2s",
                  }}
                  placeholder="IPFS CID akan otomatis terisi setelah upload..."
                  value={evidenceHash}
                  onChange={e => { setEvidenceHash(e.target.value); setUploadedFile(null); }}
                  readOnly={!!uploadedFile}
                />

                {/* Submit button */}
                {(() => {
                  const needsHash = !!program && !!wallet.publicKey && !evidenceHash.trim();
                  const isDisabled = submitting || uploading || needsHash;
                  return (
                    <button
                      onClick={handleSubmit}
                      disabled={isDisabled}
                      style={{
                        width: "100%", padding: "13px", borderRadius: "7px", border: "none",
                        background: isDisabled ? "var(--surface-2)" : "var(--btn-primary-bg)",
                        color: isDisabled ? "var(--text-4)" : "var(--btn-primary-text)",
                        fontWeight: 700, fontSize: "14px",
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        fontFamily: "var(--font-dm), 'DM Sans', sans-serif",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                        transition: "opacity 0.2s, transform 0.15s, background 0.2s",
                        boxShadow: isDisabled ? "none" : "var(--glass-shadow)",
                        opacity: isDisabled && !submitting ? 0.5 : 1,
                      } as React.CSSProperties}
                      onMouseEnter={e => { if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
                      onMouseLeave={e => { if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                      onMouseDown={e => { if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)"; }}
                      onMouseUp={e => { if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
                    >
                      {submitting ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 44 44" fill="none" style={{ animation: "spinRing 1s linear infinite" }}>
                            <circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="5" strokeOpacity="0.3" />
                            <path d="M22 4 A18 18 0 0 1 40 22" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                          </svg>
                          Submitting on-chain...
                        </>
                      ) : uploading ? "Uploading ke IPFS..."
                        : needsHash ? "Upload file bukti terlebih dahulu"
                        : "Submit for AI Review"}
                    </button>
                  );
                })()}
              </div>
            )}

            {/* AI Report card */}
            {currentCP?.aiReport ? (
              <div style={{ ...glass, padding: "24px 28px" }}>
                <div style={{ fontSize: "10.5px", letterSpacing: "1.5px", color: "var(--accent-text-dim)", marginBottom: "14px" }}>
                  AI REVIEW — {currentCP.name}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <div style={{ fontSize: "22px", fontWeight: 900, color: "var(--text)", letterSpacing: "-0.04em" }}>
                      {currentCP.aiReport.score}/100
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--text-3)" }}>
                      Compliance Score
                    </div>
                  </div>
                  <span style={{
                    fontSize: "11px", fontWeight: 700, letterSpacing: "0.6px",
                    padding: "5px 13px", borderRadius: "999px",
                    background: currentCP.aiReport.status === "APPROVED" ? "rgba(80,220,140,0.10)" : "rgba(255,210,80,0.10)",
                    color: currentCP.aiReport.status === "APPROVED" ? "rgba(80,220,140,0.90)" : "rgba(255,210,80,0.90)",
                    border: currentCP.aiReport.status === "APPROVED" ? "1px solid rgba(80,220,140,0.28)" : "1px solid rgba(255,210,80,0.28)",
                  }}>
                    {currentCP.aiReport.status}
                  </span>
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: 1.65, marginBottom: "16px" }}>
                  {currentCP.aiReport.finding}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {currentCP.aiReport.details.map((d, i) => (
                    <div key={i} style={{
                      display: "flex", gap: "10px", alignItems: "flex-start",
                      fontSize: "12.5px", color: "var(--text-3)", lineHeight: 1.55,
                    }}>
                      <div style={{
                        width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0,
                        marginTop: "7px",
                        background: d.startsWith("PERHATIAN") ? "rgba(255,210,80,0.80)" : "var(--text-4)",
                      }} />
                      {d}
                    </div>
                  ))}
                </div>
              </div>
            ) : currentCP && (
              <div style={{ ...glass, padding: "36px 28px", textAlign: "center" }}>
                <div style={{ fontSize: "13.5px", color: "var(--text-4)", marginBottom: "6px" }}>
                  No AI report yet
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-5)" }}>
                  Submit evidence to trigger AI review
                </div>
              </div>
            )}

            {/* Contract on-chain info */}
            <div style={{ ...glass, padding: "22px 26px" }}>
              <div style={{ fontSize: "10.5px", letterSpacing: "1.5px", color: "var(--accent-text-dim)", marginBottom: "16px" }}>
                ON-CHAIN RECORD
              </div>
              {[
                { label: "PROGRAM ID",     value: PROGRAM_ID, mono: true },
                { label: "CONTRACT HASH",  value: contract.contractHash, mono: true },
                { label: "AI REVIEW HASH", value: contract.aiReviewHash, mono: true },
                { label: "NETWORK",        value: "Solana Devnet", mono: false },
                { label: "FAIRNESS SCORE", value: `${contract.fairnessScore}/10`, mono: false },
              ].map((row, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0",
                  borderBottom: i < 4 ? "1px solid var(--border-light)" : "none",
                }}>
                  <span style={{ fontSize: "11px", letterSpacing: "1px", color: "var(--text-4)", flexShrink: 0 }}>{row.label}</span>
                  <span style={{
                    fontSize: "12px", fontFamily: row.mono ? "monospace" : "inherit",
                    color: row.label === "FAIRNESS SCORE" ? "var(--accent)" : row.label === "PROGRAM ID" ? "var(--accent-text)" : "var(--text-2)",
                    fontWeight: row.label === "FAIRNESS SCORE" ? 700 : 400,
                    maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{row.value}</span>
                </div>
              ))}
              <a href={`https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`} target="_blank" rel="noopener noreferrer" style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                marginTop: "14px",
                fontSize: "12.5px", color: "var(--text-3)",
                textDecoration: "none",
                transition: "color 0.2s, transform 0.2s",
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)";
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateX(2px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-3)";
                  (e.currentTarget as HTMLAnchorElement).style.transform = "translateX(0)";
                }}
              >
                View on Solana Explorer
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M2 10 L10 2 M10 2 H5 M10 2 V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>

          </div>
        </div>
      </div>
      <Footer />
      <style>{`
        @keyframes spinRing {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
