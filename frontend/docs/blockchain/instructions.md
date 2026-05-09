# Instructions

These are the on-chain instructions exposed by the ContractGuard program. They are defined in the Anchor IDL (`app/lib/idl.ts`).

---

## `initialize`

Set up the global program config. Called once by the admin.

**Accounts:**
- `config` — Config PDA (initialized)
- `usdc_mint` — USDC Mint PDA (initialized)
- `admin` — Signer (pays for account creation)
- `system_program`, `token_program`, `rent`

---

## `mint_usdc`

Mint 1,000 mock USDC to the caller's ATA. Enforces 24-hour cooldown.

**Accounts:**
- `config` — Config PDA (read)
- `usdc_mint` — USDC Mint PDA (writable)
- `mint_record` — UserMintRecord PDA (initialized or updated)
- `user_ata` — Caller's ATA (initialized if needed)
- `user` — Signer
- `system_program`, `token_program`, `associated_token_program`, `rent`

**Discriminator (8 bytes):** `[18, 18, 44, 151, 229, 134, 223, 5]`

**Errors:**
- `CooldownNotExpired` — Less than 24 hours since last claim

---

## `create_contract`

Deploy a new escrow contract on-chain. Locks USDC from client.

**Arguments:**
- `title: string`
- `description: string`
- `audit_hash: [u8; 32]` — SHA-256 of the audit result (optional, can be zeroes)
- `total_amount: u64` — In USDC units (multiply USDC × 10^6)
- `milestones: Vec<MilestoneInput>` — `{ title, amount }`
- `created_at: i64` — Unix timestamp (used in PDA seed)

**Accounts:**
- `contract` — Contract PDA (initialized)
- `client_ata` — Client's USDC ATA (writable, source of funds)
- `escrow_ata` — Contract PDA's ATA (writable, destination)
- `usdc_mint` — USDC Mint
- `client` — Signer
- `contractor` — Contractor's pubkey (passed as account)
- `system_program`, `token_program`, `associated_token_program`

---

## `submit_milestone`

Contractor submits evidence for a milestone.

**Arguments:**
- `milestone_index: u8`
- `evidence: string`

**Accounts:**
- `contract` — Contract PDA (writable)
- `contractor` — Signer (must match contract's contractor field)

---

## `approve_milestone`

Client approves a milestone submission, releasing funds to the contractor.

**Arguments:**
- `milestone_index: u8`

**Accounts:**
- `contract` — Contract PDA (writable)
- `escrow_ata` — Contract PDA's ATA (writable, source)
- `contractor_ata` — Contractor's ATA (writable, destination)
- `usdc_mint` — USDC Mint
- `client` — Signer (must match contract's client field)
- `token_program`

---

## `cancel_contract`

Cancel a contract and return remaining escrowed funds to client.

**Accounts:**
- `contract` — Contract PDA (writable, closed)
- `escrow_ata` — Contract PDA's ATA (writable, drained)
- `client_ata` — Client's ATA (writable, refund destination)
- `usdc_mint` — USDC Mint
- `client` — Signer
- `token_program`

---

## Notes on Manual Instruction Construction

For the `mint_usdc` instruction, the frontend constructs the instruction manually:

```typescript
// Instruction 1: Create ATA (idempotent)
new TransactionInstruction({
  programId: ASSOC_TOKEN_PID,
  keys: [
    { pubkey: user,         isSigner: true,  isWritable: true },
    { pubkey: userAta,      isSigner: false, isWritable: true },
    { pubkey: mint,         isSigner: false, isWritable: false },
    { pubkey: TOKEN_PID,    isSigner: false, isWritable: false },
    { pubkey: SystemPID,    isSigner: false, isWritable: false },
    { pubkey: SysvarRent,   isSigner: false, isWritable: false },
  ],
  data: Buffer.from([1]),  // idempotent create
})

// Instruction 2: mint_usdc
new TransactionInstruction({
  programId: PROGRAM_ID,
  keys: [ config, usdcMint, mintRecord, userAta, user, ... ],
  data: Buffer.from([18, 18, 44, 151, 229, 134, 223, 5]),  // discriminator
})
```
