"""Raw scraper endpoints — no caching, always fresh data."""
from fastapi import APIRouter, Query
from services.blibli import search_blibli
from services.serpapi_service import search_serpapi

router = APIRouter(prefix="/scrape", tags=["scraper"])


@router.get("/blibli")
def scrape_blibli(
    q: str = Query(..., description="Keyword pencarian"),
    limit: int = Query(8, ge=1, le=20),
):
    results = search_blibli(q, limit)
    return {"query": q, "source": "blibli", "count": len(results), "results": results}


@router.get("/serpapi")
def scrape_serpapi(
    q: str = Query(..., description="Keyword pencarian"),
    limit: int = Query(8, ge=1, le=20),
):
    results = search_serpapi(q, limit)
    return {"query": q, "source": "serpapi", "count": len(results), "results": results}
