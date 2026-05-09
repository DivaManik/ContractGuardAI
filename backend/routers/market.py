"""Market price endpoint — checks Supabase cache before scraping."""
from fastapi import APIRouter, Query
from typing import Literal
from services.blibli import search_blibli
from services.serpapi_service import search_serpapi
from services.supabase_client import get_cached_prices, save_cached_prices

router = APIRouter(prefix="/market", tags=["market"])

SourceType = Literal["blibli", "serpapi", "all"]


def _fetch_and_cache(query: str, source: str) -> tuple[list[dict], bool]:
    """Check cache first, scrape if miss. Returns (results, from_cache)."""
    cached = get_cached_prices(query, source)
    if cached is not None:
        return cached, True

    if source == "blibli":
        results = search_blibli(query)
    else:
        results = search_serpapi(query)

    if results:
        save_cached_prices(query, source, results)

    return results, False


@router.get("/prices")
def get_market_prices(
    q: str = Query(..., description="Keyword harga yang dicari"),
    source: SourceType = Query("all", description="blibli | serpapi | all"),
):
    """
    Cek cache Supabase dulu. Kalau ada → return cache.
    Kalau tidak ada → scrape → simpan ke cache → return hasil.
    """
    if source == "all":
        blibli_results, blibli_cached = _fetch_and_cache(q, "blibli")
        serpapi_results, serpapi_cached = _fetch_and_cache(q, "serpapi")
        all_results = blibli_results + serpapi_results
        return {
            "query": q,
            "source": "all",
            "count": len(all_results),
            "from_cache": blibli_cached and serpapi_cached,
            "results": all_results,
            "breakdown": {
                "blibli": {"count": len(blibli_results), "from_cache": blibli_cached},
                "serpapi": {"count": len(serpapi_results), "from_cache": serpapi_cached},
            },
        }

    results, from_cache = _fetch_and_cache(q, source)
    return {
        "query": q,
        "source": source,
        "count": len(results),
        "from_cache": from_cache,
        "results": results,
    }
