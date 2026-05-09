# Program Accounts & PDAs

All ContractGuard accounts are Program Derived Addresses (PDAs). They are computed deterministically from seeds — no randomness, no keypairs.

All helper functions are exported from `app/lib/useContractProgram.ts`.

---

## Config PDA

**Seeds:** `["config"]`

```typescript
export function getConfigPDA(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  )[0];
}
```

**Stores:**
- Admin public key
- Mock USDC mint address
- Global program settings

---

## USDC Mint PDA

**Seeds:** `["usdc_mint"]`

```typescript
export function getUsdcMintPDA(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("usdc_mint")],
    PROGRAM_ID
  )[0];
}
```

**Stores:**
- The SPL token mint for mock USDC
- Mint authority is the program itself (no external keypair)

---

## User Mint Record PDA

**Seeds:** `["mint_record", user_pubkey]`

```typescript
export function getMintRecordPDA(user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint_record"), user.toBuffer()],
    PROGRAM_ID
  )[0];
}
```

**Stores:**
- `last_claimed_at` timestamp
- Used to enforce 24-hour claim cooldown per wallet

---

## Contract PDA

**Seeds:** `["contract", client_pubkey, contractor_pubkey, created_at (u64 LE)]`

```typescript
export function getContractPDA(
  client: PublicKey,
  contractor: PublicKey,
  createdAt: BN
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("contract"),
      client.toBuffer(),
      contractor.toBuffer(),
      createdAt.toArrayLike(Buffer, "le", 8),
    ],
    PROGRAM_ID
  )[0];
}
```

**Stores:**
- Contract metadata (title, description, audit hash)
- Client and contractor public keys
- `created_at` timestamp (part of the seed — makes each contract unique)
- Array of milestones (title, amount, status, evidence)
- Overall contract status
- Total USDC locked in escrow

> **Note:** The `created_at` value is set at deployment time and must be preserved to re-derive the same PDA later. It is also used to look up local evidence files at `D:\frontier\evidence\{pdaAddress}\`.

---

## Associated Token Account (ATA)

**Standard SPL ATA derivation:**

```typescript
export function getATA(mint: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOC_TOKEN_PID
  )[0];
}
```

- `ASSOC_TOKEN_PID` = `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL`
- Used to derive the mock USDC token account address for any wallet

---

## Constants

```typescript
export const PROGRAM_ID       = new PublicKey("2Htsz7Xf4YWZTc8tupBTgsFHwZNZDzi59FRr9AWmxdNq");
export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const ASSOC_TOKEN_PID  = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
export const USDC_DECIMALS    = 6;
export const MINT_AMOUNT_USDC = 1_000; // per claim
```

---

## Unit Conversion Helpers

```typescript
// 1000 USDC → 1_000_000_000 on-chain units
usdcToUnits(usdc: number): BN

// 1_000_000_000 units → 1000.00
unitsToUsdc(units: BN): number

// "1,000.00"
formatUsdc(units: BN): string
```
