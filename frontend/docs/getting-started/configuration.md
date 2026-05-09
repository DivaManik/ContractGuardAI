# Configuration

## Environment Variables

Create `.env.local` in the `frontend/` directory:

```bash
cp .env.example .env.local   # if example exists
# or create manually
```

### AI Engine

```env
# QVAC model tier for AI contract analysis
# Options: fast | smart | best
QVAC_MODEL_DEFAULT=smart
```

| Value | Model | Speed | Best For |
|-------|-------|-------|----------|
| `fast` | Llama 3.2 1B | ~2–5s | Development, testing |
| `smart` | Qwen3 4B | ~5–15s | Production, demos (recommended) |
| `best` | Qwen3 8B | ~15–40s | Complex or high-stakes contracts |

### Solana

```env
NEXT_PUBLIC_PROGRAM_ID=2Htsz7Xf4YWZTc8tupBTgsFHwZNZDzi59FRr9AWmxdNq
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
```

### Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Backend

```env
# FastAPI backend for market price scraping
BACKEND_URL=http://localhost:8000
```

### Optional — Price Scraping

ContractGuard benchmarks contract prices against real market data. To enable additional sources:

```env
# SerpAPI — Google Shopping results
SERPAPI_KEY=your_serpapi_key_here

# Google Custom Search Engine (additional source)
GOOGLE_CSE_KEY=your_key_here
GOOGLE_CSE_ID=your_cse_id_here
```

> Without these keys, price analysis uses Blibli scraping only (via the FastAPI backend).

### Optional — IPFS Storage

```env
# Pinata for IPFS evidence storage
PINATA_JWT=your_pinata_jwt_here
```

---

## Supabase Tables

Your Supabase project must have these tables:

| Table | Purpose |
|-------|---------|
| `contracts` | Contract metadata |
| `checkpoints` | Milestone data per contract |
| `evidence_submissions` | Evidence file records |
| `market_price_cache` | Cached market price results |

---

## Solana Network

The app connects to **Solana Devnet** by default. No additional configuration is needed beyond setting `NEXT_PUBLIC_RPC_URL`.

Program ID (deployed on Devnet):
```
2Htsz7Xf4YWZTc8tupBTgsFHwZNZDzi59FRr9AWmxdNq
```

To test on-chain features, configure Phantom Wallet to **Devnet**:
1. Open Phantom → Settings → Developer Settings → Change Network → Devnet
2. Get Devnet SOL from [faucet.solana.com](https://faucet.solana.com) or the Solana CLI faucet

---

## Next Step

Run the development server → [Quick Start](quick-start.md)
