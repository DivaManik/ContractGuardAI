import { NextRequest } from "next/server";
import { readFile, readdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";

const DEMO_DIR = path.resolve(process.cwd(), "..");

async function findDemoPdf(): Promise<{ buffer: Buffer; name: string } | null> {
  const preferred = [
    "RAB_Pengembangan_Website.pdf",
    "RAB_Revisi01_FAT_SAT.pdf",
  ];

  for (const name of preferred) {
    const filePath = path.join(DEMO_DIR, name);
    if (existsSync(filePath)) {
      const buffer = await readFile(filePath);
      return { buffer, name };
    }
  }

  // Fallback: scan folder root untuk PDF pertama
  try {
    const files = await readdir(DEMO_DIR);
    const pdf = files.find(f => f.toLowerCase().endsWith(".pdf"));
    if (pdf) {
      const buffer = await readFile(path.join(DEMO_DIR, pdf));
      return { buffer, name: pdf };
    }
  } catch { /* ignore */ }

  return null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
  const demo = await findDemoPdf();
  if (!demo) {
    return Response.json({ error: "Demo PDF tidak ditemukan" }, { status: 404 });
  }

  return new Response(demo.buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${demo.name}"`,
      "X-Demo-Filename": demo.name,
    },
  });
}
