"""Blibli product search — adapted from neru-scrapper/blibli_json.py."""
import re
import requests

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Origin": "https://www.blibli.com",
}

BLIBLI_API = "https://www.blibli.com/backend/search/products"


def search_blibli(keyword: str, limit: int = 8) -> list[dict]:
    headers = {
        **HEADERS,
        "Referer": f"https://www.blibli.com/jual/{keyword.replace(' ', '-')}",
    }
    params = {
        "searchTerm": keyword,
        "channelId": "web",
        "start": 0,
        "itemPerPage": limit,
        "intent": "false",
    }
    try:
        r = requests.get(BLIBLI_API, headers=headers, params=params, timeout=15)
        if r.status_code != 200:
            return []
        data = r.json()
        items = data.get("data", {}).get("products", [])
        results = []
        for item in items[:limit]:
            price_raw = item.get("price", {})
            if isinstance(price_raw, dict):
                display = price_raw.get("priceDisplay", "0")
                clean = re.sub(r"[^\d]", "", display)
                price = int(clean) if clean else 0
            else:
                clean = re.sub(r"[^\d]", "", str(price_raw))
                price = int(clean) if clean else 0
            if price > 500_000:
                results.append({
                    "name": item.get("name", "")[:60],
                    "price": price,
                    "source": "Blibli",
                })
        return results
    except Exception as e:
        print(f"[Blibli] Error scraping '{keyword}': {e}")
        return []
