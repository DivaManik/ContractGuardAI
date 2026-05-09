"""ContractGuard AI — Python Backend Service."""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers.scraper import router as scraper_router
from routers.market import router as market_router

app = FastAPI(
    title="ContractGuard AI — Backend",
    description="Market price scraping + Supabase cache layer",
    version="1.0.0",
)

# Allow Next.js frontend to call this service
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(scraper_router)
app.include_router(market_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "contractguard-backend"}


@app.get("/")
def root():
    return {
        "service": "ContractGuard AI Backend",
        "endpoints": {
            "GET /health": "Health check",
            "GET /scrape/blibli?q={keyword}": "Scrape Blibli langsung (no cache)",
            "GET /scrape/serpapi?q={keyword}": "Scrape SerpAPI langsung (no cache)",
            "GET /market/prices?q={keyword}&source={blibli|serpapi|all}": "Harga pasar dengan cache Supabase",
        },
    }
