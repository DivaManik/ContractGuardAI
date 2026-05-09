import { NextRequest, NextResponse } from "next/server";
import { reviewCheckpoint } from "../../lib/contractAgent";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contractSpec, evidenceText, model, lang } = body as {
      contractSpec?: string;
      evidenceText?: string;
      model?: string;
      lang?: "en" | "id";
    };

    if (!contractSpec || contractSpec.trim().length < 20) {
      return NextResponse.json(
        { success: false, error: "Spesifikasi kontrak tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (!evidenceText || evidenceText.trim().length < 20) {
      return NextResponse.json(
        { success: false, error: "Bukti pekerjaan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const result = await reviewCheckpoint(
      contractSpec.trim(),
      evidenceText.trim(),
      model,
      lang ?? "id"
    );

    const reportHash = createHash("sha256")
      .update(JSON.stringify(result))
      .digest("hex");

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        report_hash: reportHash,
        reviewed_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan tidak terduga.";
    console.error("[checkpoint/route] Error:", message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
