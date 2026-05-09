"""Supabase client — used for market_price_cache."""
import os
from supabase import create_client, Client

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        _client = create_client(url, key)
    return _client


def get_cached_prices(query: str, source: str) -> list[dict] | None:
    """Return cached results if they exist, otherwise None."""
    try:
        db = get_client()
        res = (
            db.table("market_price_cache")
            .select("results")
            .eq("query", query)
            .eq("source", source)
            .limit(1)
            .execute()
        )
        if res.data:
            return res.data[0]["results"]
        return None
    except Exception as e:
        print(f"[Supabase] Cache read error: {e}")
        return None


def save_cached_prices(query: str, source: str, results: list[dict]) -> None:
    """Upsert scraping results into cache."""
    try:
        db = get_client()
        db.table("market_price_cache").upsert(
            {"query": query, "source": source, "results": results},
            on_conflict="query,source",
        ).execute()
    except Exception as e:
        print(f"[Supabase] Cache write error: {e}")
