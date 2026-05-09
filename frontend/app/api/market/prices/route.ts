import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";

export const runtime = "nodejs";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

type Source = "blibli" | "serpapi" | "all";

async function getCached(query: string, source: string) {
  const { data } = await supabaseAdmin
    .from("market_price_cache")
    .select("results, scraped_at")
    .eq("query", query)
    .eq("source", source)
    .maybeSingle();
  return data ?? null;
}

async function saveCache(query: string, source: string, results: object[]) {
  await supabaseAdmin
    .from("market_price_cache")
    .upsert({ query, source, results }, { onConflict: "query,source" });
}

async function fetchFromBackend(query: string, source: string): Promise<object[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/scrape/${source}?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { results?: object[] };
    return data.results ?? [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const source = (searchParams.get("source") ?? "all") as Source;

  if (!query) return Response.json({ error: "q is required" }, { status: 400 });

  if (source === "all") {
    const [blibliCache, serpCache] = await Promise.all([
      getCached(query, "blibli"),
      getCached(query, "serpapi"),
    ]);

    const needsBlibli = !blibliCache;
    const needsSerp = !serpCache;

    const [blibliResults, serpResults] = await Promise.all([
      needsBlibli ? fetchFromBackend(query, "blibli") : Promise.resolve(blibliCache!.results),
      needsSerp   ? fetchFromBackend(query, "serpapi") : Promise.resolve(serpCache!.results),
    ]);

    // Simpan ke cache kalau baru di-scrape
    await Promise.all([
      needsBlibli && blibliResults.length ? saveCache(query, "blibli", blibliResults) : null,
      needsSerp   && serpResults.length   ? saveCache(query, "serpapi", serpResults)  : null,
    ]);

    const all = [...blibliResults, ...serpResults];
    return Response.json({
      query,
      source: "all",
      count: all.length,
      from_cache: !needsBlibli && !needsSerp,
      results: all,
      breakdown: {
        blibli:  { count: blibliResults.length, from_cache: !needsBlibli },
        serpapi: { count: serpResults.length,   from_cache: !needsSerp },
      },
    });
  }

  // Single source
  const cached = await getCached(query, source);
  if (cached) {
    return Response.json({ query, source, count: cached.results.length, from_cache: true, results: cached.results });
  }

  const results = await fetchFromBackend(query, source);
  if (results.length) await saveCache(query, source, results);

  return Response.json({ query, source, count: results.length, from_cache: false, results });
}
