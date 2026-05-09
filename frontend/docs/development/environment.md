# Environment Variables

All environment variables are set in `frontend/.env.local`. This file is not committed to git.

---

## Variables Reference

### `QVAC_MODEL_DEFAULT` (Optional)

The default QVAC model tier used for all AI analysis tasks.

```env
QVAC_MODEL_DEFAULT=fast
```

| Value | Model | Speed | Best For |
|-------|-------|-------|----------|
| `fast` | Llama 3.2 1B | ~2–5s | Development, quick checks |
| `smart` | Qwen3 4B | ~5–15s | Production, daily use (recommended) |
| `best` | Qwen3 8B | ~15–40s | Complex or high-stakes contracts |

Defaults to `fast` if not set.

---

### `NEXT_PUBLIC_PROGRAM_ID` (Required for blockchain features)

The Solana program ID deployed on Devnet.

```env
NEXT_PUBLIC_PROGRAM_ID=2Htsz7Xf4YWZTc8tupBTgsFHwZNZDzi59FRr9AWmxdNq
```

---

### `NEXT_PUBLIC_RPC_URL` (Optional)

Solana RPC endpoint. Defaults to the public Devnet endpoint.

```env
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
```

---

### `NEXT_PUBLIC_SUPABASE_URL` (Required for database features)

Your Supabase project URL (public).

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

---

### `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Required for database features)

Supabase public anonymous key (safe to expose to browser).

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

### `SUPABASE_SERVICE_ROLE_KEY` (Required for server-side DB writes)

Supabase service role key — **never expose this to the browser**. Used only in API routes.

```env
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

### `BACKEND_URL` (Required for market prices)

URL of the FastAPI backend for market price scraping.

```env
BACKEND_URL=http://localhost:8000
```

In production, point this to your Railway-deployed backend.

---

### `SERPAPI_KEY` (Optional)

API key for SerpAPI. Enables Google Shopping price lookups for contract item benchmarking.

```env
SERPAPI_KEY=your_key_here
```

Get a key at: [serpapi.com](https://serpapi.com)

Without this key, price analysis uses Blibli scraping only.

---

### `GOOGLE_CSE_KEY` / `GOOGLE_CSE_ID` (Optional)

Google Custom Search Engine credentials for additional market price lookups.

```env
GOOGLE_CSE_KEY=your_key_here
GOOGLE_CSE_ID=your_cse_id_here
```

---

### `PINATA_JWT` (Optional)

Pinata JWT for IPFS storage of evidence files. If not set, evidence is stored locally and in Supabase Storage only.

```env
PINATA_JWT=your_pinata_jwt_here
```

---

## Example `.env.local`

```env
# AI engine
QVAC_MODEL_DEFAULT=smart

# Solana
NEXT_PUBLIC_PROGRAM_ID=2Htsz7Xf4YWZTc8tupBTgsFHwZNZDzi59FRr9AWmxdNq
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Backend
BACKEND_URL=http://localhost:8000

# Optional — market price APIs
SERPAPI_KEY=your_serpapi_key_here
# GOOGLE_CSE_KEY=
# GOOGLE_CSE_ID=

# Optional — IPFS storage
# PINATA_JWT=
```

---

## Notes

- Never commit `.env.local` to git — it is listed in `.gitignore`
- There is no AI API key needed — all inference runs locally via QVAC SDK
- There is no `AGENT_DIR` variable — the system prompt is loaded from `frontend/agent/CLAUDE.md` at a fixed path
