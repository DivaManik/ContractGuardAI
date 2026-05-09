import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "File tidak ditemukan." },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, error: "Hanya file PDF yang diterima." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Hash file asli untuk on-chain proof
    const fileHash = createHash("sha256").update(buffer).digest("hex");

    // Extract teks dari PDF
    // Require ke lib langsung untuk bypass bug test file pdf-parse@1.x
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse");

    let pdfData;
    try {
      pdfData = await pdfParse(buffer);
    } catch (firstErr) {
      const firstMsg = firstErr instanceof Error ? firstErr.message : "";
      // Bad XRef / corrupted structure — retry dengan opsi lebih toleran
      if (/xref|xObject|bad|corrupt|invalid structure/i.test(firstMsg)) {
        try {
          pdfData = await pdfParse(buffer, { max: 0 });
        } catch {
          throw new Error(
            "PDF memiliki struktur yang rusak atau terenkripsi. " +
            "Coba buka PDF di Adobe Reader / browser lalu Save As PDF baru, kemudian upload lagi."
          );
        }
      } else {
        throw firstErr;
      }
    }

    const extractedText = pdfData.text?.trim() ?? "";

    if (extractedText.length < 50) {
      return NextResponse.json(
        { success: false, error: "Gagal mengekstrak teks dari PDF. Pastikan PDF bukan hasil scan gambar." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        file_name: file.name,
        file_hash: fileHash,
        page_count: pdfData.numpages,
        char_count: extractedText.length,
        contract_text: extractedText,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memproses file.";
    console.error("[upload/route] Error:", message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
