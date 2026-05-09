import { NextRequest } from "next/server";
import { reviewCheckpoint } from "@/app/lib/contractAgent";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    cid: string;
    checkpointName: string;
    checkpointDescription: string;
    contractTitle: string;
    totalAmount: number;
    paymentPercent: number;
  };

  const { cid, checkpointName, checkpointDescription, contractTitle, totalAmount, paymentPercent } = body;

  if (!checkpointName || !checkpointDescription) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const paymentAmount = ((paymentPercent / 100) * totalAmount).toFixed(2);

  const contractSpec = `KONTRAK: ${contractTitle}
TOTAL NILAI: ${totalAmount} USDt
CHECKPOINT: ${checkpointName}
PEMBAYARAN: ${paymentAmount} USDt (${paymentPercent}% dari total)

SPESIFIKASI YANG HARUS DIPENUHI:
${checkpointDescription}`;

  const evidenceText = `[EVIDENCE METADATA — CID: ${cid ?? "tidak ada"}]
File bukti telah disubmit oleh kontraktor ke IPFS dengan CID di atas.
File tidak dapat dibaca secara lokal pada saat review ini.
Evaluasi berdasarkan: (1) apakah file berhasil disubmit (CID ada), (2) apakah spesifikasi checkpoint memungkinkan pembuktian, (3) metadata yang tersedia.`;

  try {
    const result = await reviewCheckpoint(contractSpec, evidenceText, undefined, "id");

    return Response.json({
      recommendation: result.status,
      score: result.compliance_score,
      finding: result.findings,
      details: [...(result.approved_items ?? []), ...(result.required_fixes ?? [])],
    });
  } catch (err) {
    console.error("[review-checkpoint] QVAC error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Review gagal" },
      { status: 500 }
    );
  }
}
