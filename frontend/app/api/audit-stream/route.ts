import { NextRequest } from "next/server";
import {
  analyzeContract,
  detectContractType,
  fetchBlibliPrices,
  fetchSerpApiPrices,
  fetchGoogleCsePrices,
  summarizePrices,
  type PriceDataPoint,
} from "../../lib/contractAgent";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 300;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Jailbreak / prompt-injection detection ────────────────────────────────────
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above)\s+(instructions?|rules?|prompt)/i,
  /disregard\s+.{0,15}instructions?/i,
  /forget\s+(all|previous)\s+(instructions?|rules?|training)/i,
  /override\s+(?:all\s+)?(?:previous\s+)?instructions?/i,
  /\[INST\]|\[\/INST\]|<\|system\|>|<\|user\|>|<\|im_start\|>/,
  /<<SYS>>|<\/SYS>/,
  /reveal\s+(your\s+)?(system\s+)?(prompt|instructions?)/i,
  /you\s+are\s+now\s+(?:a\s+)?(?:different\s+|new\s+)?(?:ai|assistant|model|bot|gpt)/i,
  /new\s+instructions?:\s/i,
];

function hasInjection(text: string): boolean {
  return INJECTION_PATTERNS.some(p => p.test(text));
}

const CONTRACT_TYPE_LABELS: Record<string, { id: string; en: string; icon: string }> = {
  pengadaan_barang: { id: "Pengadaan Barang",      en: "Goods Procurement",    icon: "📦" },
  konstruksi:       { id: "Konstruksi / Sipil",    en: "Construction",         icon: "🏗️" },
  jasa_it:          { id: "Jasa IT / Software",    en: "IT / Software",        icon: "💻" },
  jasa_konsultasi:  { id: "Jasa Konsultasi",        en: "Consulting Services",  icon: "📊" },
  jasa_hukum:       { id: "Jasa Hukum",            en: "Legal Services",       icon: "⚖️" },
  jasa_pendidikan:  { id: "Pelatihan / Pendidikan", en: "Education / Training", icon: "📚" },
  ketenagakerjaan:  { id: "Kontrak Kerja",          en: "Employment",           icon: "👔" },
  jasa_lainnya:     { id: "Jasa Lainnya",           en: "Other Services",       icon: "📋" },
};

const AGENT_TIMEOUT_MS = 600_000; // 10 min — local QVAC inference can be slow

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { contractText, model, charCount, lang } = body as {
    contractText?: string;
    model?: string;
    charCount?: number;
    lang?: "en" | "id";
  };

  const isEn = lang === "en";

  if (!contractText || contractText.trim().length < 50) {
    return new Response(
      JSON.stringify({ success: false, error: isEn ? "Contract text is empty." : "Teks kontrak tidak boleh kosong." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (hasInjection(contractText)) {
    const errMsg = isEn
      ? "Suspicious content detected in the contract. Analysis aborted for security."
      : "Konten mencurigakan terdeteksi dalam kontrak. Analisis dihentikan demi keamanan.";
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: errMsg })}\n\n`,
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }
    );
  }

  const wordCount = Math.ceil((charCount ?? contractText.length) / 5);
  const encoder   = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)); }
        catch { /* stream closed */ }
      };

      const timers: ReturnType<typeof setTimeout>[] = [];

      try {
        // ── Stage 1: Acknowledge ────────────────────────────────────────────
        send({
          type: "progress",
          message: isEn
            ? `Contract received. Scanning ~${wordCount} words...`
            : `Kontrak diterima. Memindai ~${wordCount} kata...`,
        });
        await sleep(300);

        // ── Stage 2: Detect contract type ───────────────────────────────────
        send({
          type: "progress",
          message: isEn ? "Identifying contract type..." : "Mengidentifikasi jenis kontrak...",
        });

        const detection = await detectContractType(contractText.trim());
        const typeLabel = CONTRACT_TYPE_LABELS[detection.contract_type] ?? CONTRACT_TYPE_LABELS.jasa_lainnya;

        send({
          type: "progress",
          message: isEn
            ? `${typeLabel.icon} Detected: ${typeLabel.en} — loading expert profile...`
            : `${typeLabel.icon} Terdeteksi: ${typeLabel.id} — memuat profil expert...`,
        });
        await sleep(300);

        // ── Stage 3: Market price fetch per source with live progress ──────
        // Only scrape e-commerce for physical goods/construction — not for services
        const GOODS_TYPES = new Set(["pengadaan_barang", "konstruksi"]);
        const canScrapeMarket = GOODS_TYPES.has(detection.contract_type);

        let preloadedMarketData = "";

        if (!canScrapeMarket && detection.items_to_check.length > 0) {
          send({
            type: "progress",
            message: isEn
              ? "Service contract — AI will use internal knowledge for rate benchmarks"
              : "Kontrak jasa — AI akan menggunakan pengetahuan internal untuk estimasi tarif",
          });
        }

        if (canScrapeMarket && detection.items_to_check.length > 0) {
          const keywords = Array.from(new Set(detection.items_to_check)).slice(0, 4);

          send({
            type: "progress",
            message: isEn
              ? `Found ${keywords.length} item(s) to price-check: ${keywords.join(", ")}`
              : `Ditemukan ${keywords.length} item untuk dicek harga: ${keywords.join(", ")}`,
          });

          // Fetch semua sumber secara paralel sekaligus
          const allPoints: Record<string, PriceDataPoint[]> = {};

          send({ type: "fetching", source: "Blibli", status: "loading",
            message: isEn ? "Blibli — fetching prices..." : "Blibli — mengambil data harga..." });
          if (process.env.SERPAPI_KEY)
            send({ type: "fetching", source: "Google Shopping", status: "loading",
              message: isEn ? "Google Shopping — fetching prices..." : "Google Shopping — mengambil data harga..." });
          if (process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_ID)
            send({ type: "fetching", source: "Google Search", status: "loading",
              message: isEn ? "Google Search — fetching prices..." : "Google Search — mengambil data harga..." });

          // Semua sumber jalan paralel
          const [blibliResults, serpResults, cseResults] = await Promise.all([
            Promise.all(keywords.map(kw => fetchBlibliPrices(kw))),
            process.env.SERPAPI_KEY
              ? Promise.all(keywords.map(kw => fetchSerpApiPrices(kw)))
              : Promise.resolve(keywords.map(() => [] as PriceDataPoint[])),
            process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_ID
              ? Promise.all(keywords.map(kw => fetchGoogleCsePrices(kw)))
              : Promise.resolve(keywords.map(() => [] as PriceDataPoint[])),
          ]);

          // Gabungkan per keyword — cross-validate Blibli vs SerpAPI
          keywords.forEach((kw, i) => {
            const serp   = serpResults[i];
            const blibli = blibliResults[i];

            let validBlibli = blibli;

            if (blibli.length > 0) {
              const blibliPrices = blibli.map(p => p.price).sort((a, b) => a - b);
              const bm = blibliPrices[Math.floor(blibliPrices.length / 2)];

              if (serp.length > 0) {
                // Case 1: SerpAPI ada data — buang Blibli kalau mediannya < 5% median SerpAPI
                const serpPrices = serp.map(p => p.price).sort((a, b) => a - b);
                const serpMedian = serpPrices[Math.floor(serpPrices.length / 2)];
                if (bm < serpMedian * 0.05) {
                  console.log(`[cross-validate] "${kw}" Blibli median Rp ${bm.toLocaleString("id-ID")} << SerpAPI Rp ${serpMedian.toLocaleString("id-ID")} → Blibli dibuang`);
                  validBlibli = [];
                }
              } else {
                // Case 2: SerpAPI tidak ada data — cek apakah semua harga Blibli clustered rendah
                // Jika max harga < 5x min harga DAN max < Rp 5 juta → kemungkinan semua aksesori
                const maxP = blibliPrices[blibliPrices.length - 1];
                const minP = blibliPrices[0];
                if (maxP < 5_000_000 && maxP < minP * 5) {
                  console.log(`[cross-validate] "${kw}" tidak ada SerpAPI, Blibli clustered rendah (max Rp ${maxP.toLocaleString("id-ID")}) → kemungkinan aksesori, dibuang`);
                  validBlibli = [];
                }
              }
            }

            allPoints[kw] = [...validBlibli, ...serp, ...cseResults[i]];
          });

          // Kirim status per sumber
          const blibliTotal = blibliResults.reduce((s, r) => s + r.length, 0);
          send({ type: "fetching", source: "Blibli", status: blibliTotal > 0 ? "done" : "empty",
            message: blibliTotal > 0
              ? (isEn ? `Blibli — ${blibliTotal} prices found` : `Blibli — ${blibliTotal} data harga ditemukan`)
              : (isEn ? "Blibli — no data found" : "Blibli — tidak ada data"),
          });
          if (process.env.SERPAPI_KEY) {
            const serpTotal = serpResults.reduce((s, r) => s + r.length, 0);
            send({ type: "fetching", source: "Google Shopping", status: serpTotal > 0 ? "done" : "empty",
              message: serpTotal > 0
                ? (isEn ? `Google Shopping — ${serpTotal} prices found` : `Google Shopping — ${serpTotal} data harga ditemukan`)
                : (isEn ? "Google Shopping — no data found" : "Google Shopping — tidak ada data"),
            });
          }
          if (process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_ID) {
            const cseTotal = cseResults.reduce((s, r) => s + r.length, 0);
            send({ type: "fetching", source: "Google Search", status: cseTotal > 0 ? "done" : "empty",
              message: cseTotal > 0
                ? (isEn ? `Google Search — ${cseTotal} prices found` : `Google Search — ${cseTotal} data harga ditemukan`)
                : (isEn ? "Google Search — no data found" : "Google Search — tidak ada data"),
            });
          }

          // Gabungkan semua data per keyword
          const summaries = keywords.map(kw => summarizePrices(allPoints[kw] ?? [], kw)).filter(Boolean) as string[];
          if (summaries.length > 0) {
            const sources = ["Blibli", process.env.SERPAPI_KEY ? "Google Shopping" : null, process.env.GOOGLE_CSE_KEY ? "Google Search" : null]
              .filter(Boolean).join(", ");
            preloadedMarketData = `=== DATA HARGA PASAR REAL (${sources}) ===\n\n${summaries.join("\n\n")}\n`;
            send({
              type: "progress",
              message: isEn
                ? "Market price data collected — passing to AI expert..."
                : "Data harga pasar terkumpul — meneruskan ke AI expert...",
            });
          } else {
            send({
              type: "progress",
              message: isEn
                ? "No market price data found — AI will use internal knowledge"
                : "Data harga pasar tidak ditemukan — AI akan menggunakan pengetahuan internal",
            });
          }
        }

        // ── Stage 4: Background progress ticks ─────────────────────────────
        const stages = isEn ? [
          { delay: 2000,  message: "Reviewing clauses against relevant regulations..." },
          { delay: 4500,  message: "Detecting one-sided clauses and risky terms..." },
          { delay: 7000,  message: "Evaluating payment security and protection gaps..." },
          { delay: 10000, message: "Calculating fairness score and drafting report..." },
        ] : [
          { delay: 2000,  message: "Memeriksa klausul terhadap regulasi yang berlaku..." },
          { delay: 4500,  message: "Mendeteksi klausul sepihak dan terms berisiko..." },
          { delay: 7000,  message: "Mengevaluasi keamanan pembayaran dan celah perlindungan..." },
          { delay: 10000, message: "Menghitung fairness score dan menyusun laporan..." },
        ];

        for (const s of stages) {
          timers.push(setTimeout(() => send({ type: "progress", message: s.message }), s.delay));
        }

        // ── Stage 5: Full analysis ──────────────────────────────────────────
        let agentDone = false;
        const agentPromise = analyzeContract(
          contractText.trim(), model, lang ?? "id", detection, preloadedMarketData
        ).then(r => { agentDone = true; return r; });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => {
            if (!agentDone) reject(new Error(isEn ? "Analysis timed out." : "Analisis timeout."));
          }, AGENT_TIMEOUT_MS)
        );

        const result = await Promise.race([agentPromise, timeoutPromise]);
        timers.forEach(clearTimeout);

        const analysisHash = createHash("sha256").update(JSON.stringify(result)).digest("hex");

        send({
          type: "result",
          data: result,
          meta: {
            analysis_hash:  analysisHash,
            analyzed_at:    new Date().toISOString(),
            char_count:     contractText.length,
            contract_type:  detection.contract_type,
            model_used:     model ?? process.env.QVAC_MODEL_DEFAULT ?? "smart",
          },
        });

      } catch (err) {
        timers.forEach(clearTimeout);
        const raw = err instanceof Error ? err.message : String(err);

        let message: string;
        if (raw.includes("timed out") || raw.includes("timeout")) {
          message = isEn
            ? "Analysis timed out. The contract may be too long. Please try again."
            : "Analisis timeout. Kontrak mungkin terlalu panjang. Coba lagi.";
        } else if (raw.includes("format") || raw.includes("JSON") || raw.includes("parse")) {
          message = isEn
            ? "AI returned an unexpected format. Please try again."
            : "AI mengembalikan format yang tidak terduga. Coba lagi.";
        } else {
          message = isEn ? `Analysis failed: ${raw}` : `Analisis gagal: ${raw}`;
        }

        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
