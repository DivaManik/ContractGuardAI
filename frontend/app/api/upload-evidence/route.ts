import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
const MAX_SIZE_MB = 50;

export async function POST(req: NextRequest) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return Response.json({ error: "Pinata not configured" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return Response.json({ error: `File terlalu besar (max ${MAX_SIZE_MB}MB)` }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: "Format tidak didukung. Gunakan JPG, PNG, atau PDF." }, { status: 400 });
  }

  const pinatFormData = new FormData();
  pinatFormData.append("file", file);
  pinatFormData.append(
    "pinataMetadata",
    JSON.stringify({ name: `evidence_${Date.now()}_${file.name}` })
  );
  pinatFormData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: pinatFormData,
  });

  if (!pinataRes.ok) {
    const errText = await pinataRes.text();
    console.error("[Pinata] Upload failed:", errText);
    return Response.json({ error: "Upload ke IPFS gagal. Coba lagi." }, { status: 502 });
  }

  const data = await pinataRes.json() as { IpfsHash: string; PinSize: number };
  return Response.json({ cid: data.IpfsHash, size: data.PinSize });
}
