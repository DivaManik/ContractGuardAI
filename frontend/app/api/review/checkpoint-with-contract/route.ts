import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import { reviewCheckpoint } from "@/app/lib/contractAgent";
import { readFile, readdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";
export const maxDuration = 300;

const EVIDENCE_ROOT = path.resolve(process.cwd(), "..", "evidence");

// ── Baca file evidence dari lokal ────────────────────────────────────────────
async function readLocalEvidence(
  pdaAddress: string,
  checkpointIndex: number,
  supabasePath: string | null
): Promise<{ buffer: Buffer; filename: string; contentType: string } | null> {
  if (supabasePath) {
    const localPath = path.join(EVIDENCE_ROOT, supabasePath);
    if (existsSync(localPath)) {
      try {
        const buffer = await readFile(localPath);
        const filename = path.basename(localPath);
        const ext = filename.split(".").pop()?.toLowerCase() ?? "";
        const contentType = ext === "pdf" ? "application/pdf"
          : ext === "png" ? "image/png"
          : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
          : "application/octet-stream";
        console.log(`[review] Read local evidence: ${localPath}`);
        return { buffer, filename, contentType };
      } catch (e) {
        console.error("[review] Local read failed:", e);
      }
    }
  }

  // Fallback: scan folder {pdaAddress}/{checkpointIndex}/
  const dir = path.join(EVIDENCE_ROOT, pdaAddress, String(checkpointIndex));
  if (existsSync(dir)) {
    try {
      const files = (await readdir(dir)).filter(f => !f.startsWith("."));
      if (files.length > 0) {
        const latest = files.sort().reverse()[0];
        const localPath = path.join(dir, latest);
        const buffer = await readFile(localPath);
        const ext = latest.split(".").pop()?.toLowerCase() ?? "";
        const contentType = ext === "pdf" ? "application/pdf"
          : ext === "png" ? "image/png"
          : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
          : "application/octet-stream";
        console.log(`[review] Read latest evidence: ${localPath}`);
        return { buffer, filename: latest, contentType };
      }
    } catch (e) {
      console.error("[review] Dir scan failed:", e);
    }
  }

  return null;
}

// ── Baca PDF kontrak dari lokal: evidence/{pdaAddress}/contract/ ─────────────
async function readLocalContract(pdaAddress: string): Promise<Buffer | null> {
  const contractDir = path.join(EVIDENCE_ROOT, pdaAddress, "contract");
  if (!existsSync(contractDir)) return null;
  try {
    const files = (await readdir(contractDir)).filter(f => f.endsWith(".pdf") && !f.startsWith("."));
    if (files.length === 0) return null;
    // Ambil file terbaru
    const latest = files.sort().reverse()[0];
    const buffer = await readFile(path.join(contractDir, latest));
    console.log(`[review] Read local contract PDF: ${latest}`);
    return buffer;
  } catch (e) {
    console.error("[review] Contract PDF read failed:", e);
    return null;
  }
}

// ── Ekstrak teks dari PDF ─────────────────────────────────────────────────────
async function extractPdfText(buffer: Buffer, maxChars = 4000): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse");
    const data = await pdfParse(buffer);
    return (data.text ?? "").slice(0, maxChars);
  } catch (e) {
    console.error("[review] PDF parse error:", e);
    return "";
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    submissionId?: string;
    pdaAddress: string;
    checkpointIndex: number;
  };

  const { submissionId, pdaAddress, checkpointIndex } = body;
  if (!pdaAddress || checkpointIndex === undefined) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // ── Fetch data dari Supabase ─────────────────────────────────────────────
  // Jika tidak ada submissionId, ambil submission terbaru untuk checkpoint ini
  let submission: { id: string; ipfs_cid: string | null; supabase_path: string | null; file_type: string; file_size: number } | null = null;

  if (submissionId) {
    const { data } = await supabaseAdmin
      .from("evidence_submissions")
      .select("id, ipfs_cid, supabase_path, file_type, file_size")
      .eq("id", submissionId)
      .single();
    submission = data;
  } else {
    // Cari submission terbaru berdasarkan pdaAddress + checkpointIndex
    const { data: contract } = await supabaseAdmin
      .from("contracts")
      .select("id")
      .eq("pda_address", pdaAddress)
      .maybeSingle();

    if (contract) {
      const { data: cp } = await supabaseAdmin
        .from("checkpoints")
        .select("id")
        .eq("contract_id", contract.id)
        .eq("checkpoint_index", checkpointIndex)
        .maybeSingle();

      if (cp) {
        const { data } = await supabaseAdmin
          .from("evidence_submissions")
          .select("id, ipfs_cid, supabase_path, file_type, file_size")
          .eq("checkpoint_id", cp.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        submission = data;
      }
    }
  }

  const { data: contract } = await supabaseAdmin
    .from("contracts")
    .select(`
      title, total_amount, pdf_path,
      checkpoints!inner (name, description, payment_percent)
    `)
    .eq("pda_address", pdaAddress)
    .eq("checkpoints.checkpoint_index", checkpointIndex)
    .single();

  if (!contract) {
    return Response.json({ error: "Data kontrak tidak ditemukan" }, { status: 404 });
  }

  const checkpoint = (contract.checkpoints as { name: string; description: string; payment_percent: number }[])[0];
  const paymentAmount = ((checkpoint.payment_percent / 100) * Number(contract.total_amount)).toFixed(2);

  // ── Baca PDF kontrak dari lokal ─────────────────────────────────────────
  const contractPdfBuffer = await readLocalContract(pdaAddress);
  let fullContractText = "";
  if (contractPdfBuffer) {
    const extracted = await extractPdfText(contractPdfBuffer, 6000);
    if (extracted.trim().length > 50) {
      fullContractText = `\n\nISI LENGKAP DOKUMEN KONTRAK (dari PDF):\n${extracted}`;
    }
  }

  // ── Baca file evidence dari lokal ───────────────────────────────────────
  const evidenceFile = submission
    ? await readLocalEvidence(pdaAddress, checkpointIndex, submission.supabase_path)
    : await readLocalEvidence(pdaAddress, checkpointIndex, null);

  // ── Konversi evidence ke teks ────────────────────────────────────────────
  let evidenceText = "";

  if (!evidenceFile) {
    evidenceText = `[TIDAK ADA FILE LOKAL] ${submission ? `Evidence ID: ${submission.id}, CID: ${submission.ipfs_cid ?? "-"}.` : "Belum ada file evidence di direktori lokal."} Evaluasi berdasarkan metadata checkpoint saja.`;
  } else if (evidenceFile.contentType === "application/pdf") {
    const pdfText = await extractPdfText(evidenceFile.buffer);
    if (pdfText.trim().length > 50) {
      evidenceText = `[PDF EVIDENCE — ${evidenceFile.filename}]\n\n${pdfText}`;
    } else {
      evidenceText = `[PDF EVIDENCE — ${evidenceFile.filename}] Ukuran: ${(evidenceFile.buffer.byteLength / 1024).toFixed(0)}KB. Teks tidak dapat diekstrak.`;
    }
  } else {
    evidenceText = `[GAMBAR EVIDENCE — ${evidenceFile.filename}]
Tipe: ${evidenceFile.contentType}
Ukuran: ${(evidenceFile.buffer.byteLength / 1024).toFixed(0)}KB
File gambar disubmit kontraktor sebagai bukti penyelesaian checkpoint.
Evaluasi: (1) apakah file berhasil disubmit, (2) apakah deskripsi checkpoint memungkinkan pembuktian via foto/gambar.`;
  }

  // ── Bangun contractSpec untuk QVAC ──────────────────────────────────────
  const contractSpec = `KONTRAK: ${contract.title}
TOTAL NILAI: ${contract.total_amount} USDt
CHECKPOINT #${checkpointIndex + 1}: ${checkpoint.name}
PEMBAYARAN CHECKPOINT: ${paymentAmount} USDt (${checkpoint.payment_percent}% dari total)

SPESIFIKASI YANG HARUS DIPENUHI:
${checkpoint.description}${fullContractText}`;

  // ── Jalankan QVAC review ─────────────────────────────────────────────────
  try {
    const result = await reviewCheckpoint(contractSpec, evidenceText, undefined, "id");

    // Simpan hasil ke Supabase
    if (submission) {
      await supabaseAdmin
        .from("evidence_submissions")
        .update({ ai_review: result })
        .eq("id", submission.id);
    }

    return Response.json({
      approved: result.status === "APPROVED",
      recommendation: result.status,
      confidence: result.compliance_score,
      score: result.compliance_score,
      summary: result.findings,
      finding: result.findings,
      notes: result.required_fixes,
      details: [...(result.approved_items ?? []), ...(result.required_fixes ?? [])],
    });
  } catch (err) {
    console.error("[review/checkpoint-with-contract] QVAC error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Review gagal" },
      { status: 500 }
    );
  }
}
