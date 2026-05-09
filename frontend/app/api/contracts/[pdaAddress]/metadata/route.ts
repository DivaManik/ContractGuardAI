import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pdaAddress: string }> }
) {
  const { pdaAddress } = await params;

  const { data: contract, error } = await supabaseAdmin
    .from("contracts")
    .select(`
      id, pda_address, title, description, client_wallet, contractor_wallet,
      total_amount, contract_type, pdf_path, fairness_score, created_at,
      checkpoints (
        id, checkpoint_index, name, description, payment_percent
      )
    `)
    .eq("pda_address", pdaAddress)
    .single();

  if (error || !contract) {
    return Response.json({ error: "Contract not found" }, { status: 404 });
  }

  // Generate signed URL untuk PDF jika ada
  let pdfSignedUrl: string | null = null;
  if (contract.pdf_path) {
    const { data: signed } = await supabaseAdmin.storage
      .from("contracts")
      .createSignedUrl(contract.pdf_path, 3600); // 1 jam
    pdfSignedUrl = signed?.signedUrl ?? null;
  }

  return Response.json({ ...contract, pdf_signed_url: pdfSignedUrl });
}
