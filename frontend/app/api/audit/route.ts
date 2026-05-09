import { NextRequest, NextResponse } from "next/server";
import { analyzeContract } from "../../lib/contractAgent";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 menit (cukup untuk Claude Code)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contractText, model, lang } = body as { contractText?: string; model?: string; lang?: "en" | "id" };

    if (!contractText || contractText.trim().length < 50) {
      return NextResponse.json(
        { success: false, error: "Teks kontrak tidak boleh kosong (min 50 karakter)." },
        { status: 400 }
      );
    }

    const result = await analyzeContract(contractText.trim(), model, lang ?? "id");

    // Hash hasil analisis untuk disimpan on-chain
    const analysisHash = createHash("sha256")
      .update(JSON.stringify(result))
      .digest("hex");

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        analysis_hash: analysisHash,
        analyzed_at: new Date().toISOString(),
        char_count: contractText.length,
        model_used: model ?? process.env.QVAC_MODEL_DEFAULT ?? "smart",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan tidak terduga.";
    console.error("[audit/route] Error:", message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
