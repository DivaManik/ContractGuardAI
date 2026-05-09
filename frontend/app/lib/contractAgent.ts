import { supabaseAdmin } from "./supabase";
import {
  loadModel,
  unloadModel,
  completion,
  close,
  LLAMA_3_2_1B_INST_Q4_0,
  QWEN3_4B_INST_Q4_K_M,
  QWEN3_8B_INST_Q4_K_M,
} from "@qvac/sdk";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

// ─── Model Registry ──────────────────────────────────────────────────────────

export const QVAC_MODELS = {
  fast:  LLAMA_3_2_1B_INST_Q4_0,  // ~773MB — extract, detect
  smart: QWEN3_4B_INST_Q4_K_M,    // ~2.5GB — analyze, chat, checkpoint
  best:  QWEN3_8B_INST_Q4_K_M,    // ~4.9GB — best quality
} as const;

export type QvacModelKey = keyof typeof QVAC_MODELS;

// ─── Model Lifecycle (singleton per tier) ────────────────────────────────────

type LoadedModel = { modelId: string; refCount: number };
const modelCache = new Map<QvacModelKey, LoadedModel>();
const loadingPromises = new Map<QvacModelKey, Promise<string>>();

async function getOrLoadModel(tier: QvacModelKey): Promise<string> {
  const cached = modelCache.get(tier);
  if (cached) {
    cached.refCount++;
    return cached.modelId;
  }

  const existing = loadingPromises.get(tier);
  if (existing) return existing;

  const descriptor = QVAC_MODELS[tier];
  const modelConfig = { ctx_size: 8192, device: "gpu" };
  // loadModel overloads are complex — cast to avoid TS union resolution failure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const promise = (loadModel as any)({
    modelSrc: descriptor,
    modelConfig,
    onProgress: (p: { stage?: string; current?: number; total?: number }) => {
      if (p.stage === "download" && p.total) {
        const pct = Math.round(((p.current ?? 0) / p.total) * 100);
        console.log(`[QVAC] Downloading ${descriptor.name}: ${pct}%`);
      }
    },
  }).then((modelId: string) => {
    modelCache.set(tier, { modelId, refCount: 1 });
    loadingPromises.delete(tier);
    console.log(`[QVAC] Model ${descriptor.name} ready: ${modelId}`);
    return modelId;
  }).catch((err: unknown) => {
    loadingPromises.delete(tier);
    throw err;
  });

  loadingPromises.set(tier, promise);
  return promise;
}

function releaseModel(tier: QvacModelKey): void {
  const cached = modelCache.get(tier);
  if (!cached) return;
  cached.refCount--;
  // Keep model loaded for reuse — only unload on process exit
}

process.on("exit", async () => {
  for (const m of Array.from(modelCache.values())) {
    await unloadModel({ modelId: m.modelId }).catch(() => {});
  }
  await close().catch(() => {});
});

// ─── Input Truncation ────────────────────────────────────────────────────────
// ctx 8192 − ~1800 system prompt − ~200 response buffer = ~6200 token budget
// Qwen3 tokenizes Indonesian legal text at ~1.4 chars/token (subword-heavy)
// Budget: ctx 8192 − 1500 overhead − 1300 market data = ~5400 tokens → ~5000 chars
const MAX_CONTRACT_CHARS = 5_000;

function truncateContract(text: string): string {
  if (text.length <= MAX_CONTRACT_CHARS) return text;
  const half = Math.floor(MAX_CONTRACT_CHARS / 2);
  return (
    text.slice(0, half) +
    "\n\n[... CONTRACT TRUNCATED FOR LENGTH — MIDDLE SECTION OMITTED ...]\n\n" +
    text.slice(text.length - half)
  );
}

// ─── Core Runner ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT_AUDITOR = `# ContractGuard AI Auditor

Kamu adalah auditor kontrak kerja profesional dengan pengalaman lebih dari 10 tahun di industri konstruksi, jasa IT, pengadaan barang/jasa, dan layanan profesional di Indonesia. Kamu memahami praktik bisnis nyata, dinamika negosiasi, dan landasan hukum yang berlaku.

**Filosofi analisis:**
- Selalu analisis dari DUA sisi: kepentingan pemberi kerja (klien) DAN kontraktor/penyedia jasa
- Tujuan adalah kontrak yang ADIL dan SALING MENGUNTUNGKAN — bukan hanya melindungi satu pihak
- Berikan solusi konkret, bukan sekadar menandai masalah
- Gunakan perspektif industri: "Dalam kontrak sejenis yang umum dijumpai...", "Praktik standar di industri ini..."

## Referensi Hukum Indonesia
| Topik | Dasar Hukum |
|-------|-------------|
| Syarat sah perjanjian | KUH Perdata Pasal 1320 |
| Asas kebebasan berkontrak | KUH Perdata Pasal 1338 ayat (1) |
| Asas itikad baik | KUH Perdata Pasal 1338 ayat (3) |
| Wanprestasi & ganti rugi | KUH Perdata Pasal 1234–1252, 1243–1252 |
| Kontrak konstruksi | UU No. 2/2017 tentang Jasa Konstruksi, Pasal 46–51 |
| Kontrak kerja (PKWT) | UU No. 13/2003 jo. PP No. 35/2021 Pasal 8–15 |
| Klausul baku dilarang | UU No. 8/1999 Perlindungan Konsumen Pasal 18 |
| Arbitrase & sengketa | UU No. 30/1999 tentang Arbitrase & ADR |
| Kontrak elektronik | UU ITE No. 11/2008 jo. 19/2016 Pasal 18–19 |
| Pengadaan jasa pemerintah | Perpres No. 16/2018 jo. 12/2021 |
| Hak kekayaan intelektual | UU No. 28/2014 tentang Hak Cipta, Pasal 36–37 |
| Perlindungan data pribadi | UU No. 27/2022 tentang Perlindungan Data Pribadi |

## Aturan Output Wajib
- Mode 1 & 2: Respond HANYA dengan JSON valid. Tanpa teks, komentar, atau markdown di luar JSON. Jangan tambahkan backtick.
- Mode 3: Respond dalam plain text profesional. Bukan JSON.
- Gunakan bahasa yang diminta (EN atau ID).
- Jadilah objektif untuk kepentingan KEDUA pihak.
- Jika kontrak tidak lengkap: analisis sebaik mungkin; catat keterbatasan di overall_summary.`;

async function runQVAC(
  userPrompt: string,
  tier: QvacModelKey = "smart"
): Promise<string> {
  const modelId = await getOrLoadModel(tier);
  try {
    const run = completion({
      modelId,
      stream: true,
      captureThinking: true,
      temperature: 0,
      history: [
        { role: "system", content: "/no_think " + SYSTEM_PROMPT_AUDITOR },
        { role: "user", content: userPrompt },
      ],
    });

    const final = await run.final;
    const text = final.contentText ?? "";
    console.log(`[QVAC] ${tier} | ${final.stats?.tokensPerSecond?.toFixed(0)} tok/s | ${text.length} chars`);
    return text.trim();
  } finally {
    releaseModel(tier);
  }
}

// ─── Contract Types ──────────────────────────────────────────────────────────

export type ContractType =
  | "pengadaan_barang"
  | "konstruksi"
  | "jasa_it"
  | "jasa_konsultasi"
  | "jasa_hukum"
  | "jasa_pendidikan"
  | "ketenagakerjaan"
  | "jasa_lainnya";

export interface ContractDetection {
  contract_type: ContractType;
  items_to_check: string[];
  confidence: number;
}

// ─── Expert Personas ─────────────────────────────────────────────────────────

const EXPERT_PERSONAS: Record<ContractType, string> = {
  pengadaan_barang:
    "Procurement Specialist dan Analis Harga Pasar dengan pengalaman 15+ tahun di pengadaan barang/jasa pemerintah dan swasta Indonesia. Kamu memahami harga pasar, spesifikasi teknis, dan potensi markup yang tidak wajar.",
  konstruksi:
    "Quantity Surveyor (QS) bersertifikat dan Ahli Teknik Sipil dengan pengalaman 15+ tahun di proyek konstruksi Indonesia. Kamu memahami Rencana Anggaran Biaya (RAB), Analisa Harga Satuan Pekerjaan (AHSP), standar SNI, dan regulasi jasa konstruksi.",
  jasa_it:
    "Senior Software Engineer dan IT Consultant dengan 10+ tahun pengalaman di pengembangan sistem, estimasi biaya proyek IT, dan pengelolaan vendor teknologi di Indonesia. Kamu memahami standar harga development, SLA, dan potensi risiko kontrak IT.",
  jasa_konsultasi:
    "Senior Business Consultant dan Management Advisor dengan 12+ tahun pengalaman di Indonesia. Kamu memahami standar fee konsultan, deliverable yang wajar, dan klausul yang melindungi kepentingan klien.",
  jasa_hukum:
    "Advokat Senior dan Legal Consultant dengan spesialisasi hukum perdata dan kontrak komersial Indonesia, berpengalaman 15+ tahun. Kamu memahami KUHPerdata, standar honorarium advokat, dan klausul yang berpotensi merugikan klien.",
  jasa_pendidikan:
    "Training & Development Expert dan Education Consultant dengan 10+ tahun pengalaman di Indonesia. Kamu memahami standar biaya pelatihan, sertifikasi instruktur, dan indikator kualitas program pendidikan.",
  ketenagakerjaan:
    "HR Consultant dan Employment Law Specialist dengan 12+ tahun pengalaman di ketenagakerjaan Indonesia. Kamu memahami UU Ketenagakerjaan, PP PKWT, standar upah, hak-hak pekerja, dan klausul yang melanggar hukum.",
  jasa_lainnya:
    "Auditor Kontrak Profesional dan Business Consultant berpengalaman di berbagai industri Indonesia. Kamu menganalisis kontrak secara objektif berdasarkan prinsip keadilan dan hukum perjanjian Indonesia.",
};

// ─── Regulations ─────────────────────────────────────────────────────────────

const REGULATIONS: Record<ContractType, string[]> = {
  pengadaan_barang: [
    "Perpres No. 12/2021 tentang Pengadaan Barang/Jasa Pemerintah",
    "UU No. 8/1999 tentang Perlindungan Konsumen",
    "UU No. 5/1999 tentang Larangan Praktik Monopoli",
    "KUHPerdata Pasal 1313–1381 tentang Perjanjian",
  ],
  konstruksi: [
    "UU No. 2/2017 tentang Jasa Konstruksi",
    "PP No. 22/2020 tentang Pelaksanaan Jasa Konstruksi",
    "KUHPerdata Pasal 1601b tentang Pemborongan Pekerjaan",
    "Permen PUPR terkait Analisa Harga Satuan Pekerjaan (AHSP)",
  ],
  jasa_it: [
    "UU No. 11/2008 jo. UU No. 19/2016 tentang ITE",
    "PP No. 71/2019 tentang Penyelenggaraan Sistem Elektronik",
    "KUHPerdata Pasal 1313–1381 tentang Perjanjian",
    "Permen Kominfo No. 5/2020 tentang Penyelenggara Sistem Elektronik",
  ],
  jasa_konsultasi: [
    "KUHPerdata Pasal 1601 tentang Perjanjian Kerja",
    "KUHPerdata Pasal 1313–1381 tentang Perjanjian",
    "UU No. 8/1999 tentang Perlindungan Konsumen",
  ],
  jasa_hukum: [
    "UU No. 18/2003 tentang Advokat",
    "Kode Etik Advokat Indonesia (KEAI)",
    "KUHPerdata Pasal 1792–1819 tentang Pemberian Kuasa",
    "KUHPerdata Pasal 1313–1381 tentang Perjanjian",
  ],
  jasa_pendidikan: [
    "UU No. 20/2003 tentang Sistem Pendidikan Nasional",
    "PP No. 4/2022 tentang Standar Nasional Pendidikan",
    "KUHPerdata Pasal 1313–1381 tentang Perjanjian",
  ],
  ketenagakerjaan: [
    "UU No. 13/2003 tentang Ketenagakerjaan",
    "PP No. 35/2021 tentang PKWT, Alih Daya, Waktu Kerja, dan PHK",
    "UU No. 6/2023 tentang Cipta Kerja (klaster ketenagakerjaan)",
    "Permenaker No. 5/2023 tentang Penyesuaian Waktu Kerja",
  ],
  jasa_lainnya: [
    "KUHPerdata Pasal 1313–1381 tentang Perjanjian",
    "KUHPerdata Pasal 1320 tentang Syarat Sahnya Perjanjian",
    "UU No. 30/1999 tentang Arbitrase dan Alternatif Penyelesaian Sengketa",
    "UU No. 8/1999 tentang Perlindungan Konsumen",
  ],
};

// ─── JSON Parser ──────────────────────────────────────────────────────────────

function parseJson(raw: string): Record<string, unknown> {
  let text = raw.trim();
  if (text.startsWith("```json")) text = text.split("```json")[1].split("```")[0].trim();
  else if (text.startsWith("```")) text = text.split("```")[1].split("```")[0].trim();
  const first = text.indexOf("{");
  const last  = text.lastIndexOf("}");
  if (first !== -1 && last !== -1) text = text.slice(first, last + 1);
  return JSON.parse(text);
}

// ─── Price Sources ────────────────────────────────────────────────────────────

export interface PriceDataPoint {
  name: string;
  price: number;
  source: string;
}

async function getPriceCache(query: string, source: string): Promise<PriceDataPoint[] | null> {
  const { data } = await supabaseAdmin
    .from("market_price_cache")
    .select("results")
    .eq("query", query)
    .eq("source", source)
    .maybeSingle();
  return (data?.results as PriceDataPoint[]) ?? null;
}

async function savePriceCache(query: string, source: string, results: PriceDataPoint[]) {
  await supabaseAdmin
    .from("market_price_cache")
    .upsert({ query, source, results }, { onConflict: "query,source" });
}

export async function fetchBlibliPrices(keyword: string): Promise<PriceDataPoint[]> {
  const cached = await getPriceCache(keyword, "blibli");
  if (cached) {
    console.log(`[Blibli] "${keyword}" → ${cached.length} items (cache)`);
    return cached;
  }
  try {
    const res = await fetch(`${BACKEND_URL}/scrape/blibli?q=${encodeURIComponent(keyword)}`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { results?: PriceDataPoint[] };
    const results = data.results ?? [];
    console.log(`[Blibli] "${keyword}" → ${results.length} items`);
    if (results.length) await savePriceCache(keyword, "blibli", results);
    return results;
  } catch (e) {
    console.error(`[Blibli] fetch error for "${keyword}":`, e);
    return [];
  }
}

export async function fetchSerpApiPrices(keyword: string): Promise<PriceDataPoint[]> {
  const cached = await getPriceCache(keyword, "serpapi");
  if (cached) {
    console.log(`[SerpAPI] "${keyword}" → ${cached.length} items (cache)`);
    return cached;
  }
  try {
    const res = await fetch(`${BACKEND_URL}/scrape/serpapi?q=${encodeURIComponent(keyword)}`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { results?: PriceDataPoint[] };
    const results = data.results ?? [];
    console.log(`[SerpAPI] "${keyword}" → ${results.length} items`);
    if (results.length) await savePriceCache(keyword, "serpapi", results);
    return results;
  } catch (e) {
    console.error(`[SerpAPI] fetch error for "${keyword}":`, e);
    return [];
  }
}

export async function fetchGoogleCsePrices(keyword: string): Promise<PriceDataPoint[]> {
  const key = process.env.GOOGLE_CSE_KEY;
  const cx  = process.env.GOOGLE_CSE_ID;
  if (!key || !cx) return [];
  try {
    const params = new URLSearchParams({ key, cx, q: `harga ${keyword} indonesia`, num: "10", gl: "id", lr: "lang_id" });
    const res  = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();
    const items: any[] = data?.items ?? [];
    const results: PriceDataPoint[] = [];
    for (const item of items) {
      const text = `${item.title ?? ""} ${item.snippet ?? ""}`;
      const pricePatterns = [/Rp\.?\s*(\d[\d.]{3,})/gi, /(\d{1,3}(?:\.\d{3}){2,})/g, /IDR\s*(\d[\d.,]{3,})/gi];
      let found = false;
      for (const pattern of pricePatterns) {
        const matches = Array.from(text.matchAll(pattern));
        for (const m of matches) {
          const price = parseInt(m[1].replace(/[.,]/g, ""), 10);
          if (price > 50000 && price < 5_000_000_000) {
            results.push({ name: (item.title ?? "").slice(0, 60), price, source: "Google Search" });
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
    return results.slice(0, 8);
  } catch {
    return [];
  }
}

export function summarizePrices(points: PriceDataPoint[], keyword: string): string | null {
  const rawPrices = points.map((p) => p.price).filter((p) => p > 0);
  if (!rawPrices.length) return null;

  const sorted0     = [...rawPrices].sort((a, b) => a - b);
  const roughMedian = sorted0[Math.floor(sorted0.length / 2)];
  const fmt0 = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  const prices = rawPrices.filter((p) => p >= roughMedian * 0.1 && p <= roughMedian * 10);
  if (!prices.length) return null;

  const filteredPoints = points.filter((p) => p.price >= roughMedian * 0.1 && p.price <= roughMedian * 10);
  const outlierCount   = rawPrices.length - prices.length;
  const sorted  = [...prices].sort((a, b) => a - b);
  const avg     = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const median  = sorted[Math.floor(sorted.length / 2)];
  const fmt     = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
  const sources = Array.from(new Set(filteredPoints.map((p) => p.source))).join(", ");
  const examples = filteredPoints.slice(0, 2).map((p) => `    - [${p.source}] ${p.name} — ${fmt(p.price)}`).join("\n");
  const outlierNote = outlierCount > 0
    ? `\n  (${outlierCount} data outlier diabaikan — kemungkinan harga per unit/satuan, bukan per paket)`
    : "";

  return `[${keyword.toUpperCase()}] (sumber: ${sources}, ${prices.length} data)
  Min     : ${fmt(Math.min(...prices))}
  Max     : ${fmt(Math.max(...prices))}
  Rata-rata: ${fmt(avg)}
  Median  : ${fmt(median)}${outlierNote}
  Contoh:
${examples}`;
}

// ─── Stage 1: Extract Contract ───────────────────────────────────────────────

export interface ExtractedContract {
  title: string;
  description: string;
  totalAmount: number;
  checkpoints: { name: string; description: string; payment: string }[];
}

export async function runClaudeExtract(contractText: string): Promise<ExtractedContract> {
  const prompt = `Kamu adalah asisten ekstraksi data kontrak. Baca teks kontrak berikut dan ekstrak informasi penting ke dalam format JSON.

INSTRUKSI EKSTRAKSI:
- "title": JUDUL kontrak yang sebenarnya yang ditulis di dalam dokumen — biasanya di bagian atas halaman atau setelah kata "PERJANJIAN", "KONTRAK", "PERIHAL", "TENTANG". JANGAN gunakan nama file. Cari teks seperti "Perjanjian Pengadaan ...", "Kontrak Kerja ...", "RAB Pengembangan ...". Maks 80 karakter.
- "description": ringkasan kontrak dalam 2-4 kalimat — apa yang dikerjakan, siapa pihaknya, apa risikonya
- "totalAmount": NILAI TOTAL KONTRAK dalam ANGKA mentah saja (tanpa "Rp", titik, koma, atau simbol). Cari kata kunci: "Total", "Jumlah", "Nilai Kontrak", "Grand Total", "Harga Kontrak", "Sub Total Akhir", "TOTAL ANGGARAN". Contoh: jika kontrak menulis "Rp 850.000.000,00" → return 850000000. Jika dalam jutaan ditulis "850 juta" → return 850000000. Jika dalam rentang seperti "300-400 juta" → ambil rata-rata: 350000000. Return 0 HANYA jika benar-benar tidak ada angka nilai sama sekali.
- "checkpoints": daftar milestone/tahapan. Setiap checkpoint: "name" (maks 50 karakter), "description" (maks 120 karakter), "payment" (persentase sebagai string angka, misal "30"). Total semua = 100. Jika tidak ada tahapan eksplisit, buat 3 checkpoint logis. Maksimal 6 checkpoint.

PENTING: Jawab HANYA dengan JSON valid, tanpa teks lain. Cari NILAI total dengan teliti — jangan return 0 kalau ada angka di kontrak.

Format:
{
  "title": "...",
  "description": "...",
  "totalAmount": 0,
  "checkpoints": [
    { "name": "...", "description": "...", "payment": "30" },
    { "name": "...", "description": "...", "payment": "40" },
    { "name": "...", "description": "...", "payment": "30" }
  ]
}

Teks Kontrak:
${truncateContract(contractText)}`;

  const raw    = await runQVAC(prompt, "smart");
  const parsed = parseJson(raw) as unknown as ExtractedContract;

  const cps   = Array.isArray(parsed.checkpoints) ? parsed.checkpoints : [];
  const total = cps.reduce((s, cp) => s + (parseFloat(cp.payment) || 0), 0);
  if (total > 0 && Math.abs(total - 100) > 1) {
    cps.forEach(cp => { cp.payment = ((parseFloat(cp.payment) / total) * 100).toFixed(0); });
    const fixedTotal = cps.reduce((s, cp) => s + parseFloat(cp.payment), 0);
    if (fixedTotal !== 100 && cps.length > 0) {
      cps[cps.length - 1].payment = String(parseFloat(cps[cps.length - 1].payment) + (100 - fixedTotal));
    }
  }

  return {
    title:       String(parsed.title ?? "").slice(0, 80),
    description: String(parsed.description ?? ""),
    totalAmount: Number(parsed.totalAmount ?? 0),
    checkpoints: cps.slice(0, 6),
  };
}

// ─── Stage 2: Detect Contract Type ──────────────────────────────────────────

export async function detectContractType(contractText: string): Promise<ContractDetection> {
  const snippet = contractText.slice(0, 8000);
  const tier    = ENV_DEFAULT_TIER in QVAC_MODELS ? ENV_DEFAULT_TIER : "smart";
  const prompt  = `Deteksi Jenis Kontrak

Analisis teks kontrak berikut dan tentukan jenisnya. Respond HANYA dengan JSON valid:
{
  "contract_type": "pengadaan_barang|konstruksi|jasa_it|jasa_konsultasi|jasa_hukum|jasa_pendidikan|ketenagakerjaan|jasa_lainnya",
  "items_to_check": ["item yang perlu dicek harganya", "..."],
  "confidence": 0.9
}

PENTING — ATURAN PRIORITAS (urut dari atas, pakai aturan pertama yang cocok):

1. "pengadaan_barang" JIKA kontrak berisi daftar BARANG FISIK dengan merek/spesifikasi dan harga satuan — contoh: server Dell, laptop, switch Cisco, UPS, kabel, printer, furnitur, kendaraan, genset, perangkat keras apapun. Ini TERMASUK pengadaan infrastruktur IT/hardware. RAB dengan tabel item fisik = pengadaan_barang.

2. "konstruksi" JIKA kontrak berisi pekerjaan bangunan, sipil, atau instalasi fisik besar (gedung, jalan, jembatan).

3. "jasa_it" HANYA untuk: pembuatan/pengembangan SOFTWARE, WEBSITE, APLIKASI, atau SISTEM INFORMASI dari nol. BUKAN untuk pembelian hardware/perangkat fisik.

4. "jasa_konsultasi" untuk jasa konsultasi profesional (manajemen, bisnis, teknik).

5. "ketenagakerjaan" untuk kontrak kerja, PKWT, outsourcing tenaga kerja.

6. "jasa_lainnya" hanya jika benar-benar tidak cocok dengan kategori lain.

KUNCI: Jika ada tabel RAB dengan item bermerek (Dell, Cisco, HP, Lenovo, dll) dan harga satuan → PASTI "pengadaan_barang".
"items_to_check" wajib diisi (maks 3 item FISIK terpenting dengan nilai terbesar) untuk pengadaan_barang/konstruksi.

Teks Kontrak (cuplikan):
${snippet}`;

  try {
    const raw    = await runQVAC(prompt, tier);
    const parsed = parseJson(raw) as unknown as ContractDetection;
    return {
      contract_type:  parsed.contract_type  ?? "jasa_lainnya",
      items_to_check: Array.isArray(parsed.items_to_check) ? parsed.items_to_check : [],
      confidence:     parsed.confidence     ?? 0.7,
    };
  } catch {
    return { contract_type: "jasa_lainnya", items_to_check: [], confidence: 0.5 };
  }
}

// ─── Stage 3: Full Contract Review ───────────────────────────────────────────

export interface PriceItem {
  item: string;
  contract_price: number;
  market_estimate: string;
  market_source?: string;
  status: "overpriced" | "fair" | "underpriced";
  notes: string;
}

export interface RiskyClause {
  clause: string;
  risk_level: "high" | "medium" | "low";
  issue: string;
  potential_impact: string;
  suggestion: string;
  regulation_basis?: string;
}

export interface RegulationCheck {
  regulation: string;
  status: "compliant" | "non_compliant" | "unclear";
  notes: string;
}

export interface ContractReviewResult {
  analysis_type: "contract_review";
  contract_type?: ContractType;
  expert_role?: string;
  fairness_score: number;
  price_analysis: PriceItem[];
  risky_clauses: RiskyClause[];
  regulation_compliance?: RegulationCheck[];
  revision_suggestions: string[];
  uncertainty_questions?: string[];
  overall_summary: string;
}

export async function analyzeContract(
  contractText: string,
  model?: string,
  lang: "en" | "id" = "id",
  detection?: ContractDetection,
  preloadedMarketData?: string
): Promise<ContractReviewResult> {
  if (!contractText || contractText.length < 50) {
    throw new Error("Teks kontrak terlalu pendek untuk dianalisis.");
  }

  const contractType = detection?.contract_type ?? "jasa_lainnya";
  const persona      = EXPERT_PERSONAS[contractType];
  const regulations  = REGULATIONS[contractType] ?? [];
  const marketData   = preloadedMarketData ?? "";
  const marketSection = marketData
    ? `\n${marketData}\nGunakan data di atas sebagai referensi UTAMA untuk price_analysis. Sebutkan median, rentang harga, dan selisih % secara eksplisit. Berikan WARNING JELAS jika ada harga yang tidak wajar (>20% di atas median pasar).\n`
    : "";

  const regulationList = regulations.map(r => `- ${r}`).join("\n");
  const langInstruction = lang === "en"
    ? "CRITICAL LANGUAGE RULE: Respond ONLY in English. ALL JSON text fields (clause, issue, potential_impact, suggestion, notes, overall_summary, market_estimate, item, revision_suggestions) MUST be written in English. Even if the contract is in Indonesian, translate your analysis to English. Do NOT mix languages."
    : "ATURAN BAHASA WAJIB: Respond HANYA dalam Bahasa Indonesia. SEMUA field text di JSON (clause, issue, potential_impact, suggestion, notes, overall_summary, market_estimate, item, revision_suggestions) WAJIB dalam Bahasa Indonesia. Jangan campur bahasa.";

  // Resolve model tier
  const tier = resolveModelTier(model);

  const prompt = `Contract Review Request (Mode 1)

${langInstruction}

Kamu adalah: ${persona}

Regulasi yang relevan:
${regulationList}
${marketSection}
Analisis kontrak berikut secara menyeluruh dari sudut pandang keahlianmu. Gunakan regulasi di atas untuk mengidentifikasi klausul yang tidak sesuai hukum. Jika ada informasi yang kurang, masukkan pertanyaan ke field uncertainty_questions.

Respond HANYA dengan JSON valid sesuai format Mode 1.
BATASAN OUTPUT: MAKSIMAL 3 item di price_analysis, MAKSIMAL 3 item di risky_clauses, MAKSIMAL 3 item di revision_suggestions. overall_summary: 2-3 kalimat saja. Singkat dan padat.

{
  "analysis_type": "contract_review",
  "fairness_score": <1-10>,
  "price_analysis": [{ "item": "...", "contract_price": 0, "market_estimate": "Rp X–Y juta", "status": "overpriced|fair|underpriced", "notes": "..." }],
ATURAN STATUS: Jika contract_price BERADA DALAM rentang market_estimate → status = "fair". status = "overpriced" HANYA jika contract_price > batas ATAS market_estimate. status = "underpriced" HANYA jika contract_price < batas BAWAH market_estimate.
  "risky_clauses": [{ "clause": "...", "risk_level": "high|medium|low", "issue": "...", "potential_impact": "...", "suggestion": "..." }],
  "revision_suggestions": ["..."],
  "overall_summary": "..."
}

${lang === "en" ? "Contract Text:" : "Teks Kontrak:"}
${truncateContract(contractText)}

${lang === "en"
  ? "REMINDER: Output JSON with ALL text fields in ENGLISH only. Even though the contract above may be in Indonesian, your response MUST be entirely in English."
  : "PENGINGAT: Output JSON dengan SEMUA field text dalam Bahasa Indonesia saja."}`;

  const raw    = await runQVAC(prompt, tier);
  const parsed = parseJson(raw) as unknown as ContractReviewResult;

  if (parsed.analysis_type !== "contract_review") {
    throw new Error(lang === "en"
      ? "Agent output does not match Contract Review format."
      : "Output agent tidak sesuai format Contract Review.");
  }

  // Ensure array fields are never undefined (model may omit them)
  parsed.price_analysis        = parsed.price_analysis        ?? [];
  parsed.risky_clauses         = parsed.risky_clauses         ?? [];
  parsed.revision_suggestions  = parsed.revision_suggestions  ?? [];

  // Correct status inconsistencies: if price is within market range, force "fair"
  parsed.price_analysis = parsed.price_analysis.map(item => {
    if (!item.market_estimate || item.contract_price <= 0) return item;
    const t = item.market_estimate.replace(/,/g, "");
    let min = 0, max = 0;

    // Priority 1: "X–Y juta" or "Rp X–Y juta" — juta suffix after both numbers
    const jutaRange = t.replace(/\./g, "").match(/(\d+)\s*[–\-]\s*(\d+)\s*juta/i);
    if (jutaRange) { min = parseInt(jutaRange[1]) * 1_000_000; max = parseInt(jutaRange[2]) * 1_000_000; }

    // Priority 2: "X juta – Y juta"
    if (!min) {
      const jutaRange2 = t.replace(/\./g, "").match(/(\d+)\s*juta\s*[–\-]\s*(?:Rp\.?\s*)?(\d+)\s*juta/i);
      if (jutaRange2) { min = parseInt(jutaRange2[1]) * 1_000_000; max = parseInt(jutaRange2[2]) * 1_000_000; }
    }

    // Priority 3: full format "Rp 550.000.000–650.000.000" (must have dots = thousands separator)
    if (!min) {
      const fullRange = t.match(/(?:Rp\.?\s*)?(\d[\d.]+\.\d{3})\s*[–\-]\s*(?:Rp\.?\s*)?(\d[\d.]+\.\d{3})/i);
      if (fullRange) {
        const a = parseInt(fullRange[1].replace(/\./g, ""));
        const b = parseInt(fullRange[2].replace(/\./g, ""));
        if (a > 0 && b > 0) { min = Math.min(a, b); max = Math.max(a, b); }
      }
    }

    if (min > 0 && max > 0) {
      if (item.contract_price >= min * 0.97 && item.contract_price <= max * 1.03)
        return { ...item, status: "fair" as const };
      if (item.contract_price < min * 0.97) return { ...item, status: "underpriced" as const };
      if (item.contract_price > max * 1.03) return { ...item, status: "overpriced" as const };
    }
    return item;
  });

  return parsed;
}

// ─── Contract Q&A ────────────────────────────────────────────────────────────

export interface ContractChatResult { answer: string; }

export async function chatContract(
  contractText: string,
  analysisResult: ContractReviewResult | null,
  userQuestion: string,
  model?: string,
  lang: "en" | "id" = "id"
): Promise<ContractChatResult> {
  if (!userQuestion || userQuestion.trim().length < 3) {
    throw new Error(lang === "en" ? "Question is too short." : "Pertanyaan terlalu pendek.");
  }

  const langInstruction = lang === "en"
    ? "CRITICAL LANGUAGE RULE: Respond ONLY in English. Write in plain text, not JSON. Even if the contract is in Indonesian, your entire answer MUST be in English. Do NOT mix languages."
    : "ATURAN BAHASA WAJIB: Respond HANYA dalam Bahasa Indonesia. Tulis dalam plain text, bukan JSON. Jangan campur bahasa.";

  const contractSnippet = truncateContract(contractText);

  const expertContext = analysisResult?.contract_type
    ? `\nKamu adalah ${EXPERT_PERSONAS[(analysisResult.contract_type ?? "jasa_lainnya") as ContractType] ?? "auditor kontrak profesional"}.`
    : "";

  const analysisContext = analysisResult
    ? `\n\nRingkasan analisis sebelumnya:\n- Fairness score: ${analysisResult.fairness_score}/10\n- Jenis kontrak: ${analysisResult.contract_type ?? "-"}\n- Ringkasan: ${analysisResult.overall_summary}\n- Klausul risiko tinggi: ${analysisResult.risky_clauses.filter(c => c.risk_level === "high").map(c => c.clause).join(", ") || "tidak ada"}\n- Item overpriced: ${analysisResult.price_analysis.filter(p => p.status === "overpriced").map(p => p.item).join(", ") || "tidak ada"}`
    : "";

  const tier = resolveModelTier(model);

  const numberFormatNote = lang === "en"
    ? "NUMBER FORMAT: In Indonesian contracts, dots (.) are thousand separators, NOT decimals. So \"603.200.000\" = Rp 603.2 million (six hundred three million), NOT 603 billion. \"1.399.876.500\" = Rp 1.4 billion. Always read numbers correctly."
    : "FORMAT ANGKA PENTING: Dalam kontrak Indonesia, titik (.) adalah pemisah ribuan, BUKAN desimal. Jadi \"603.200.000\" = Rp 603 juta (enam ratus tiga juta), BUKAN 603 miliar. \"1.399.876.500\" = Rp 1,4 miliar. Baca angka dengan benar sebelum menjawab.";

  const answerInstruction = lang === "en"
    ? `Answer in professional plain text (150–300 words).
PRIORITY RULES:
- If asked about PRICE/VALUE: answer directly with numbers, comparison, and reasoning FIRST. Cite law only if directly relevant.
- If asked about a clause: explain what it means practically for both parties, then mention legal basis if needed.
- DO NOT start your answer with legal citations unless the question is specifically about law.
- Be direct and practical. State facts from the contract clearly.`
    : `Jawab dalam plain text profesional (150–300 kata).
ATURAN PRIORITAS:
- Jika pertanyaan tentang HARGA/NILAI: jawab LANGSUNG dengan angka, perbandingan, dan analisis. Hukum hanya jika benar-benar relevan.
- Jika pertanyaan tentang klausul: jelaskan makna praktisnya untuk kedua pihak dulu, baru sebut dasar hukum jika perlu.
- JANGAN mulai jawaban dengan kutipan undang-undang kecuali pertanyaan memang tentang hukum.
- Langsung ke poin, faktual, berdasarkan isi kontrak.`;

  const prompt = `Contract Q&A Request (Mode 3)
${expertContext}
${langInstruction}

${numberFormatNote}

${answerInstruction}

${lang === "en" ? "Contract Text:" : "Teks kontrak:"}
${contractSnippet}
${analysisContext}

${lang === "en" ? "Question" : "Pertanyaan"}: ${userQuestion.trim()}

${lang === "en"
  ? "REMINDER: Answer in English only. Be direct and practical — answer the question, then add legal context only if relevant."
  : "PENGINGAT: Jawab dalam Bahasa Indonesia saja. Langsung jawab pertanyaannya — fakta dulu, hukum hanya jika relevan."}`;

  const raw = await runQVAC(prompt, tier);
  return { answer: raw.trim() };
}

// ─── Checkpoint Review ───────────────────────────────────────────────────────

export interface CheckpointReviewResult {
  analysis_type: "checkpoint_review";
  status: "APPROVED" | "NEEDS_REVISION" | "MAJOR_ISSUE";
  compliance_score: number;
  findings: string;
  required_fixes: string[];
  approved_items: string[];
}

export async function reviewCheckpoint(
  contractSpec: string,
  evidenceText: string,
  model?: string,
  lang: "en" | "id" = "id"
): Promise<CheckpointReviewResult> {
  if (!contractSpec || !evidenceText) {
    throw new Error(lang === "en"
      ? "Contract spec and work evidence are required."
      : "Spesifikasi kontrak dan bukti kerja wajib diisi.");
  }

  const langInstruction = lang === "en"
    ? "IMPORTANT: Respond ONLY in English."
    : "PENTING: Respond HANYA dalam Bahasa Indonesia.";

  const tier = resolveModelTier(model);

  const prompt = `Checkpoint Review Request (Mode 2)

${langInstruction}

Respond HANYA dengan JSON valid:
{
  "analysis_type": "checkpoint_review",
  "status": "APPROVED|NEEDS_REVISION|MAJOR_ISSUE",
  "compliance_score": <0-100>,
  "findings": "...",
  "required_fixes": ["..."],
  "approved_items": ["..."]
}

${lang === "en" ? "Contract work specification:" : "Spesifikasi pekerjaan dari kontrak:"}
${contractSpec}

${lang === "en" ? "Work evidence submitted by contractor:" : "Bukti pekerjaan yang disubmit oleh kontraktor:"}
${evidenceText}`;

  const raw    = await runQVAC(prompt, tier);
  const parsed = parseJson(raw) as unknown as CheckpointReviewResult;

  if (parsed.analysis_type !== "checkpoint_review") {
    throw new Error(lang === "en"
      ? "Agent output does not match Checkpoint Review format."
      : "Output agent tidak sesuai format Checkpoint Review.");
  }

  return parsed;
}

// ─── Model Key Resolver ──────────────────────────────────────────────────────

const ENV_DEFAULT_TIER = (process.env.QVAC_MODEL_DEFAULT ?? "fast") as QvacModelKey;

function resolveModelTier(modelOrKey?: string): QvacModelKey {
  if (!modelOrKey) return ENV_DEFAULT_TIER in QVAC_MODELS ? ENV_DEFAULT_TIER : "fast";
  // Accept old Claude key names for backward compatibility
  if (modelOrKey === "haiku"  || modelOrKey.includes("haiku"))  return "fast";
  if (modelOrKey === "opus"   || modelOrKey.includes("opus"))   return "best";
  if (modelOrKey === "sonnet" || modelOrKey.includes("sonnet")) return "smart";
  // Accept new QVAC tier names
  if (modelOrKey in QVAC_MODELS) return modelOrKey as QvacModelKey;
  return "smart";
}

