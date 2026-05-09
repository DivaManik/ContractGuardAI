# Smart Contract Overview

ContractGuard uses a Solana program written with the Anchor framework, deployed on **Devnet**.

---

## Program Details

| Property | Value |
|----------|-------|
| Program ID | `2Htsz7Xf4YWZTc8tupBTgsFHwZNZDzi59FRr9AWmxdNq` |
| Network | Solana Devnet |
| Framework | Anchor |
| Token Program | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` |
| Associated Token Program | `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` |

---

## Key Concepts

### Mock USDC

A custom SPL token minted by the ContractGuard program. It mimics USDC (6 decimals) for testing escrow without real money. Any connected wallet can claim 1,000 mock USDC every 24 hours.

### Program Derived Addresses (PDAs)

All accounts are derived deterministically from seeds — no private keys, no central registry. See [PDAs & Accounts](pdas.md) for details.

### Escrow Model

When a contract is created:
1. Client's USDC is transferred to the **Contract PDA's escrow**
2. Funds remain locked until each milestone is approved
3. Per-milestone approval releases only that milestone's USDC to the contractor

---

## Account Types

| Account | Description | PDA? |
|---------|-------------|------|
| `Config` | Global program config (admin, mint address) | Yes |
| `UsdcMint` | Mock USDC token mint | Yes |
| `UserMintRecord` | Per-user claim cooldown tracker | Yes |
| `Contract` | On-chain contract data + milestones + escrow | Yes |
| User ATA | User's mock USDC token balance | Yes (derived by SPL) |

---

## Frontend Integration

The frontend interacts with the program via:

1. **`useContractProgram` hook** (`app/lib/useContractProgram.ts`) — Anchor `Program` client
2. **`idl.ts`** — Type-safe program interface definition
3. **Manual `TransactionInstruction`** — For the claim USDC flow (bypasses Anchor for direct byte-level control)

See [Instructions](instructions.md) for the full instruction reference.

---

## Supabase Integration

Contract metadata is mirrored to Supabase for fast querying from the frontend:

| Table | Purpose |
|-------|---------|
| `contracts` | Contract metadata (title, description, PDA address, status) |
| `checkpoints` | Milestone data per contract |
| `evidence_submissions` | Evidence file records per checkpoint |
| `market_price_cache` | Cached market price lookup results |

On-chain data is the source of truth; Supabase is used for display and search purposes.
