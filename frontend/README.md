# ContractGuard AI

AI-powered contract auditing and on-chain escrow platform built on Solana. Upload a service contract PDF, get a detailed AI audit in seconds, then lock the payment in a Solana smart contract with milestone-based release — all in one flow.

---

## How It Works

```
PDF Upload → AI Audit (QVAC) → Review Results → Create On-Chain Contract → Milestone Escrow
```

1. **Audit** — User uploads a PDF contract. The backend extracts text and passes it to the QVAC AI engine, which analyzes clauses, detects price markups, and flags risky terms.
2. **Create Contract** — After the audit, the user clicks "Create Contract". The form is pre-filled from audit results. User sets the USDC amount, contractor wallet, and milestones, then deploys to Solana Devnet.
3. **Dashboard** — Both client and contractor track progress. Contractor submits evidence per milestone; the AI engine reviews it; client approves or requests revision.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript |
| Styling | TailwindCSS (via CSS variables) |
| Blockchain | Solana Devnet, Anchor 1.0 |
| Wallet | Phantom via `@solana/wallet-adapter` |
| AI Engine | QVAC SDK (`@qvac/sdk`) — Qwen3 local models |
| Token | Mock USDC (custom SPL mint on Devnet) |
| PDF parsing | pdf-parse |
| Database | Supabase (PostgreSQL) |
| Storage | Local `evidence/` directory + Supabase Storage + Pinata/IPFS (optional) |

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| [Node.js](https://nodejs.org) | 18+ | |
| [Phantom Wallet](https://phantom.app) | latest | Browser extension for Solana |
| QVAC runtime | latest | Local AI inference server (Qwen3 models) |

---

## Folder Structure

This project is part of a monorepo:

```
D:\frontier\
├── frontend/              ← Next.js app (this folder)
│   ├── app/
│   │   ├── api/           ← API routes (upload, audit, audit-stream, checkpoint, evidence, etc.)
│   │   ├── audit/         ← Audit page
│   │   ├── create/        ← Create contract page
│   │   ├── dashboard/     ← Dashboard + contract detail
│   │   └── lib/
│   │       ├── contractAgent.ts   ← All AI logic via QVAC SDK
│   │       ├── useContractProgram.ts  ← Solana/Anchor hooks & PDAs
│   │       └── idl.ts             ← Anchor IDL
│   └── .env.local
│
├── backend/               ← FastAPI — market price scraping (Blibli + SerpAPI)
├── smartcontract/         ← Solana Anchor program (deployed on Devnet)
└── evidence/              ← Local evidence file storage
    └── {pdaAddress}/
        ├── contract/      ← PDF contract uploaded after on-chain deploy
        ├── 0/             ← Evidence for checkpoint index 0
        └── 1/             ← Evidence for checkpoint index 1
```

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd D:\frontier\frontend
npm install
```

### 2. Set up environment variables

Create `frontend/.env.local`:

```env
# QVAC AI model tier
# fast  → Llama 3.2 1B (fastest)
# smart → Qwen3 4B (recommended)
# best  → Qwen3 8B (most capable)
QVAC_MODEL_DEFAULT=smart

# Solana
NEXT_PUBLIC_PROGRAM_ID=2Htsz7Xf4YWZTc8tupBTgsFHwZNZDzi59FRr9AWmxdNq
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Backend
BACKEND_URL=http://localhost:8000

# Optional — market price APIs
SERPAPI_KEY=
GOOGLE_CSE_KEY=
GOOGLE_CSE_ID=

# Optional — IPFS storage
PINATA_JWT=
```

### 3. Set up Phantom Wallet on Devnet

1. Install [Phantom](https://phantom.app)
2. Go to **Settings → Developer Settings → Change Network → Devnet**
3. Get free testnet SOL: [faucet.solana.com](https://faucet.solana.com)

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How the AI Engine Works

All AI logic runs through the **QVAC SDK** (`@qvac/sdk`), which calls a local Qwen3 model. There is no external AI API and no subprocess spawning.

`app/lib/contractAgent.ts` exposes the following functions, all powered by `runQVAC()` internally:

| Function | Purpose |
|----------|---------|
| `runClaudeExtract` | Extract contract metadata |
| `detectContractType` | Classify contract type |
| `analyzeContract` | Full contract audit (fairness score, risky clauses, price analysis) |
| `chatContract` | Q&A about a specific contract |
| `reviewCheckpoint` | Verify milestone evidence against contract spec |

**Model tiers:**

| Tier | Model | Speed |
|------|-------|-------|
| `fast` | Llama 3.2 1B | Fastest |
| `smart` | Qwen3 4B | Balanced (default) |
| `best` | Qwen3 8B | Most capable |

All AI calls use temperature `0` for deterministic, consistent output.

---

## Testing the Full Flow

### Step 1 — Audit a contract
1. Go to `/audit`
2. Click **Coba Demo Kontrak** to load the demo PDF, or upload your own PDF
3. Wait for the AI to analyze (~5–20 seconds depending on model tier)
4. Review the fairness score, risky clauses, and overpriced items

### Step 2 — Create an on-chain contract
1. Click **Create Contract** in the audit results (form is pre-filled from the audit)
2. On `/create`, connect your Phantom wallet
3. Click **Claim 1,000 USDC** to get mock USDC for testing (24h cooldown per wallet)
4. Fill in the contractor wallet address and USDC amount
5. Adjust milestones if needed, then click **Deploy Contract**
6. Approve the transaction in Phantom

### Step 3 — Manage on the dashboard
1. Go to `/dashboard` to see your deployed contract
2. From the contract detail page you can submit evidence, approve milestones, or cancel

---

## On-Chain Details

- **Network:** Solana Devnet
- **Program ID:** `2Htsz7Xf4YWZTc8tupBTgsFHwZNZDzi59FRr9AWmxdNq`
- **Token:** Mock USDC (custom SPL mint, 6 decimals, 1,000 per claim, 24h cooldown)
- **Escrow:** USDC locked in a PDA escrow token account on contract creation, released per approved milestone

---

## Deployment

ContractGuard is deployed via **Cloudflare Tunnel** (Zero Trust) at `contractguard.site`.

- Auto-start configured via Windows Task Scheduler: `C:\Users\user\start-contractguard.bat`
- Cloudflared runs as a Windows Service

---

## Production Build

```bash
npm run build
npm start
```

---

## Troubleshooting

**AI analysis fails or returns empty result**
→ Verify the QVAC local inference server is running and reachable. Check `QVAC_MODEL_DEFAULT` is set to a valid tier (`fast`, `smart`, `best`).

**PDF upload fails with "failed to extract text"**
→ The PDF is likely a scanned image. Use a PDF with real selectable text.

**`[Fast Refresh] rebuilding` is very slow on first load**
→ Normal — Solana/Anchor dependencies are heavy. Subsequent navigations are fast once compiled.

**Wallet won't connect**
→ Install Phantom, set it to **Devnet**, and refresh the page.

**Transaction fails**
→ You need SOL for fees (~0.01 SOL minimum). Claim at [faucet.solana.com](https://faucet.solana.com).

**Claim USDC fails with "cooldown active"**
→ Each wallet can only claim once every 24 hours. Use a different wallet for testing.
