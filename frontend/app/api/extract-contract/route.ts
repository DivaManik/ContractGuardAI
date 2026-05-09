import { NextRequest, NextResponse } from "next/server";
import { runClaudeExtract } from "@/app/lib/contractAgent";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { contractText } = await req.json() as { contractText?: string };
    if (!contractText || contractText.trim().length < 50) {
      return NextResponse.json({ success: false, error: "Teks kontrak terlalu pendek." }, { status: 400 });
    }

    const result = await runClaudeExtract(contractText.slice(0, 12000));
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengekstrak data kontrak.";
    console.error("[extract-contract]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
