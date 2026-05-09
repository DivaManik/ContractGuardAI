# Quick Start

## Start the Development Server

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## User Flow

Follow this path to test all features end-to-end:

### Step 1 — Audit a Contract

1. Navigate to `/audit`
2. Upload a PDF contract, paste contract text, **or** click **Coba Demo Kontrak** to load the sample contract
3. Click **Analyze Contract** (or analysis starts automatically after upload)
4. Wait 3–20 seconds (depends on QVAC model tier and contract length)
5. Review the results:
   - **Fairness Score** (1–10)
   - **Risky Clauses** — highlighted by risk level
   - **Price Analysis** — each line item vs. Indonesian market price
   - **Revision Suggestions**

> **Tip:** The analysis is also returned as a structured JSON hash you can record on-chain.

---

### Step 2 — Connect Your Wallet

1. Click **Connect Wallet** in the navbar (top right)
2. Select **Phantom** from the wallet modal
3. Approve the connection in the Phantom popup
4. Your wallet address will appear in the navbar

**Claim Mock USDC** (for testing escrow):
- A **Claim 1,000** button appears next to your wallet address
- Click it to receive 1,000 mock USDC on Devnet
- There is a 24-hour cooldown per wallet

---

### Step 3 — Deploy a Contract On-Chain

1. Click **Create Contract** in the audit results, or navigate to `/create`
2. Fill in contract details:
   - Client wallet address
   - Contractor wallet address
   - Contract title & description
   - Total amount (in USDC)
   - Milestones (title + amount each)
3. Paste the audit hash from Step 1 (optional but recommended)
4. Click **Deploy Contract**
5. Approve the Solana transaction in Phantom
6. Contract is now live on Devnet

---

### Step 4 — Manage Contracts on Dashboard

1. Navigate to `/dashboard`
2. All contracts where you are client or contractor appear here
3. Click a contract to open the detail page
4. **As contractor:**
   - Click **Submit Evidence** on a milestone card
   - Upload files and/or add a description
   - QVAC AI reviews automatically — verdict appears within seconds
5. **As client:**
   - Review AI-verified milestone → Click **Approve Release** → Approve transaction in Phantom
   - USDC releases to contractor immediately

---

## Available Scripts

```bash
npm run dev      # Start dev server (hot reload) on http://localhost:3000
npm run build    # Build for production
npm run start    # Run production build
```

---

## Backend (Optional)

To enable market price fetching during audit, start the FastAPI backend:

```bash
cd D:\frontier\backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Then set `BACKEND_URL=http://localhost:8000` in `frontend/.env.local`.
