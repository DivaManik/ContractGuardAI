import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";

interface CheckpointInput {
  index: number;
  name: string;
  description: string;
  paymentPercent: number;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    pdaAddress: string;
    title: string;
    description?: string;
    clientWallet: string;
    contractorWallet: string;
    totalAmount: number;
    contractType?: string;
    fairnessScore?: number;
    checkpoints: CheckpointInput[];
  };

  const { pdaAddress, title, description, clientWallet, contractorWallet, totalAmount, contractType, fairnessScore, checkpoints } = body;

  if (!pdaAddress || !title || !clientWallet || !contractorWallet || !totalAmount) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Upsert contract metadata
  const { data: contract, error: contractErr } = await supabaseAdmin
    .from("contracts")
    .upsert({
      pda_address: pdaAddress,
      title,
      description: description ?? null,
      client_wallet: clientWallet,
      contractor_wallet: contractorWallet,
      total_amount: totalAmount,
      contract_type: contractType ?? null,
      fairness_score: fairnessScore ?? null,
    }, { onConflict: "pda_address" })
    .select("id")
    .single();

  if (contractErr || !contract) {
    console.error("[save-metadata] contract upsert error:", contractErr);
    return Response.json({ error: contractErr?.message ?? "Failed to save contract" }, { status: 500 });
  }

  // Insert checkpoints jika ada
  if (checkpoints?.length) {
    const rows = checkpoints.map((cp) => ({
      contract_id: contract.id,
      checkpoint_index: cp.index,
      name: cp.name,
      description: cp.description,
      payment_percent: cp.paymentPercent,
    }));

    const { error: cpErr } = await supabaseAdmin
      .from("checkpoints")
      .upsert(rows, { onConflict: "contract_id,checkpoint_index" });

    if (cpErr) {
      console.error("[save-metadata] checkpoint upsert error:", cpErr);
    }
  }

  return Response.json({ id: contract.id, success: true });
}
