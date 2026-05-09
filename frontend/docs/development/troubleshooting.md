# Troubleshooting

Common issues and how to fix them.

---

## AI Engine Issues

### AI analysis returns empty or garbled JSON

**Cause:** The QVAC model returned non-JSON output or a partial response.

**Fix:**
1. Try a higher-capability tier — set `QVAC_MODEL_DEFAULT=smart` or `best` in `.env.local`
2. Verify the QVAC local inference server is running and accessible
3. Try a shorter or simpler contract text input to isolate the issue
4. Check that `frontend/agent/CLAUDE.md` is intact — this file is the AI system prompt

---

### Analysis is very slow (> 30 seconds)

**Cause:** Large contract text + capable model = slow local inference.

**Fix:**
- Switch `QVAC_MODEL_DEFAULT` to `fast` for development
- Use `/api/audit-stream` so the user sees live progress instead of a blank screen
- Consider chunking very long contracts before passing to the AI

---

### "QVAC inference server not reachable"

**Cause:** The local QVAC runtime is not running.

**Fix:**
- Start the QVAC local inference server (refer to QVAC SDK documentation)
- Verify it is listening on the expected port
- Check firewall rules if running on a separate machine

---

## Wallet & Solana Issues

### "WalletSendTransactionError"

**Possible causes:**
1. **Insufficient SOL** — Need ~0.01 SOL for transaction fees. Get Devnet SOL from a faucet.
2. **Wrong network** — Phantom must be set to **Devnet**, not Mainnet or Testnet
3. **Stale blockhash** — Transaction expired. Try again.
4. **Mint address mismatch** — The `getUsdcMintPDA()` derived address may differ from `config.mint` on-chain. This can happen if the program was redeployed.

**Check Phantom network:**
> Phantom → Settings → Developer Settings → Network → Devnet

**Get Devnet SOL:**
```bash
solana airdrop 2 <YOUR_WALLET_ADDRESS> --url devnet
```

---

### "Wallet not connected" errors in components

**Cause:** Component is trying to access `wallet.publicKey` before connection.

**Fix:** All wallet-dependent actions are guarded by `if (!wallet.publicKey) return;`. If you see this in a custom component, add the same guard.

---

### Claim USDC button shows cooldown immediately after connect

**Cause:** The `UserMintRecord` account already exists for this wallet from a previous claim.

**Fix:** This is expected behavior. Wait for the 24-hour cooldown to expire, or use a different wallet for testing.

---

## Evidence & File Storage Issues

### Evidence upload fails

**Cause:** The target directory `D:\frontier\evidence\{pdaAddress}\{checkpointIndex}\` may not exist or the process may not have write permissions.

**Fix:**
- Verify the `D:\frontier\evidence\` base directory exists
- Check that the Next.js process has write access to that directory
- Ensure `pdaAddress` and `checkpointIndex` are passed correctly in the upload request

---

### Checkpoint review returns "contract file not found"

**Cause:** The contract PDF has not been uploaded for this PDA via `POST /api/contracts/upload-pdf`.

**Fix:** After deploying the contract on-chain, upload the contract PDF from the dashboard. This stores the file at `D:\frontier\evidence\{pdaAddress}\contract\`.

---

## PDF Upload Issues

### "Failed to parse PDF"

**Cause:** Scanned PDF (image-only) or password-protected PDF.

**Fix:**
- Use a PDF with a real text layer
- If scanned, run OCR first (e.g., Adobe Acrobat, Google Drive's OCR feature)
- Remove password protection before uploading

---

### "File too large"

**Cause:** Default Next.js API route body limit is 4 MB.

**Fix:** Increase the limit in `app/api/upload/route.ts`:

```typescript
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
```

---

## Supabase Issues

### "Supabase: Invalid JWT" or "Unauthorized"

**Cause:** Incorrect or expired Supabase keys in `.env.local`.

**Fix:**
- Verify `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are correctly set
- Get fresh keys from your Supabase project dashboard → Settings → API

---

### Missing Supabase tables

**Cause:** The required tables have not been created in your Supabase project.

**Required tables:** `contracts`, `checkpoints`, `evidence_submissions`, `market_price_cache`

**Fix:** Run the table creation SQL from your Supabase SQL editor, or use the Supabase dashboard to create these tables according to the schema expected by the API routes.

---

## Build Issues

### TypeScript errors on build

```bash
cd frontend
npx tsc --noEmit
```

Review any type errors and fix them. Common issues:
- Missing type annotations on API response handlers
- Using `any` where a specific type is expected

---

### `next build` fails with "Module not found"

Check that all dependencies are installed:

```bash
npm install
```

If the issue is with `@anchor-lang/core` or Solana packages, ensure you're on Node 18+:

```bash
node --version  # must be v18+
```
