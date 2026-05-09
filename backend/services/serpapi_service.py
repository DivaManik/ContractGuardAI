"""SerpAPI scraper — tries Google Shopping first, falls back to organic results."""
import os
import re
import requests

SERPAPI_URL = "https://serpapi.com/search"

PRICE_PATTERNS = [
    r"Rp\.?\s*(\d[\d.]{3,})",       # Rp 1.500.000
    r"(\d{1,3}(?:\.\d{3}){2,})",    # 1.500.000 (min 2 separator)
    r"IDR\s*(\d[\d.,]{3,})",         # IDR 1.500.000
]


def _extract_price_from_text(text: str) -> int | None:
    for pattern in PRICE_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            raw = re.sub(r"[.,]", "", m)
            try:
                price = int(raw)
                if 50_000 < price < 5_000_000_000:
                    return price
            except ValueError:
                continue
    return None


def search_serpapi(keyword: str, limit: int = 8) -> list[dict]:
    api_key = os.getenv("SERPAPI_KEY")
    if not api_key:
        print("[SerpAPI] SERPAPI_KEY not set")
        return []

    results = []

    # ── Coba 1: Google Shopping ──────────────────────────────
    try:
        r = requests.get(SERPAPI_URL, params={
            "q": f"harga {keyword}",
            "tbm": "shop",
            "gl": "id",
            "hl": "id",
            "api_key": api_key,
        }, timeout=10)
        if r.status_code == 200:
            data = r.json()
            for item in data.get("shopping_results", [])[:limit]:
                raw = re.sub(r"[^\d]", "", str(item.get("price", "0")))
                price = int(raw) if raw else 0
                if price > 50_000:
                    results.append({
                        "name": str(item.get("title", ""))[:60],
                        "price": price,
                        "source": "Google Shopping",
                    })
            print(f"[SerpAPI] Shopping '{keyword}' → {len(results)} results")
    except Exception as e:
        print(f"[SerpAPI] Shopping error: {e}")

    if results:
        return results

    # ── Coba 2: Google organic search, ekstrak harga dari snippet ──
    try:
        r = requests.get(SERPAPI_URL, params={
            "q": f"harga {keyword} indonesia",
            "gl": "id",
            "hl": "id",
            "num": "10",
            "api_key": api_key,
        }, timeout=10)
        if r.status_code == 200:
            data = r.json()
            for item in data.get("organic_results", [])[:limit * 2]:
                text = f"{item.get('title', '')} {item.get('snippet', '')}"
                price = _extract_price_from_text(text)
                if price:
                    results.append({
                        "name": str(item.get("title", ""))[:60],
                        "price": price,
                        "source": "Google Search",
                    })
                    if len(results) >= limit:
                        break
            print(f"[SerpAPI] Organic '{keyword}' → {len(results)} results")
    except Exception as e:
        print(f"[SerpAPI] Organic error: {e}")

    return results
