import { NextRequest, NextResponse } from "next/server";
import { chatContract } from "../../lib/contractAgent";
import type { ContractReviewResult } from "../../lib/contractAgent";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_QUESTION_LEN = 500;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contractText, analysisResult, userQuestion, model, lang } = body as {
      contractText?: string;
      analysisResult?: ContractReviewResult;
      userQuestion?: string;
      model?: string;
      lang?: "en" | "id";
    };

    const isEn = lang === "en";

    if (!contractText || contractText.trim().length < 50) {
      return NextResponse.json(
        { success: false, error: isEn ? "Contract text is required." : "Teks kontrak diperlukan." },
        { status: 400 }
      );
    }

    if (!userQuestion || userQuestion.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: isEn ? "Question cannot be empty." : "Pertanyaan tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (userQuestion.trim().length > MAX_QUESTION_LEN) {
      return NextResponse.json(
        { success: false, error: isEn ? `Question too long (max ${MAX_QUESTION_LEN} chars).` : `Pertanyaan terlalu panjang (maks ${MAX_QUESTION_LEN} karakter).` },
        { status: 400 }
      );
    }

    const result = await chatContract(
      contractText.trim(),
      analysisResult ?? null,
      userQuestion.trim(),
      model,
      lang ?? "id"
    );

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    console.error("[chat-contract/route] Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
