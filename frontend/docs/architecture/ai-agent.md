# AI Engine Architecture

## How the AI Works

ContractGuard uses the **QVAC SDK** (`@qvac/sdk`) to run local AI inference via Qwen3 models. All AI logic is contained in `app/lib/contractAgent.ts`. There is no subprocess spawning, no external AI API calls, and no API key needed for inference.

Key characteristics:
- All inference is local (Qwen3 models via QVAC runtime)
- Temperature is always `0` — deterministic, consistent output
- Three model tiers: `fast`, `smart`, `best`
- Structured JSON output enforced via prompt engineering

---

## System Prompt

The AI system prompt lives at `frontend/agent/CLAUDE.md`. It defines:

1. **Expert persona** — Senior auditor with 10+ years in Indonesian procurement contracts
2. **Three operating modes** (triggered by prompt structure):
   - **Mode 1: Contract Review** → Full analysis, returns `ContractReviewResult` JSON
   - **Mode 2: Checkpoint Review** → Milestone verification, returns `CheckpointReviewResult` JSON
   - **Mode 3: Contract Q&A** → Conversational answers about a specific contract
3. **Indonesian law references** (UU, PP, Perpres, KUH Perdata) for compliance checks

This file is loaded as the system prompt for every QVAC call.

---

## Model Tiers

| Tier key | Model | Speed | Best For |
|----------|-------|-------|----------|
| `fast` | Llama 3.2 1B | ~2–5s | Development, quick checks |
| `smart` | Qwen3 4B | ~5–15s | Production, daily use |
| `best` | Qwen3 8B | ~15–40s | Complex or high-stakes contracts |

Configured via `QVAC_MODEL_DEFAULT` environment variable (default: `fast`).

---

## How `contractAgent.ts` Works

**File:** `app/lib/contractAgent.ts`

### Core Execution — `runQVAC(prompt, tier)`

```typescript
async function runQVAC(prompt: string, tier?: string): Promise<string>
```

Internally calls the QVAC SDK with:
- The system prompt loaded from `agent/CLAUDE.md`
- The user prompt passed as argument
- Temperature `0`
- Selected model tier

---

### Contract Text Extraction — `runClaudeExtract()`

```typescript
async function runClaudeExtract(
  pdfText: string,
  model?: string
): Promise<ExtractResult>
```

Extracts structured metadata (title, parties, dates, amounts) from raw PDF text.

---

### Contract Type Detection — `detectContractType()`

```typescript
async function detectContractType(
  contractText: string,
  model?: string
): Promise<ContractDetectionResult>
```

Classifies the contract into one of the supported types and selects the appropriate expert persona.

**Returns:**
```typescript
interface ContractDetectionResult {
  contract_type: ContractType
  expert_role: string
  key_regulations: string[]
}
```

---

### Contract Analysis — `analyzeContract()`

```typescript
async function analyzeContract(
  contractText: string,
  model?: string,
  lang?: "en" | "id",
  detection?: ContractDetectionResult,
  preloadedMarketData?: Record<string, string>
): Promise<ContractReviewResult>
```

**Execution steps:**
1. Detect contract type via `detectContractType(contractText)` (separate QVAC call)
2. Optionally inject market price data fetched from Blibli/SerpAPI
3. Build a structured prompt injecting contract text + market data + language + expert persona
4. Call `runQVAC(prompt, model)` → parse JSON output

**Returns:**
```typescript
interface ContractReviewResult {
  analysis_type: "contract_review"
  contract_type?: ContractType        // e.g. "jasa_it"
  expert_role?: string
  fairness_score: number              // 1–10
  price_analysis: PriceItem[]
  risky_clauses: RiskyClause[]        // risk: "high" | "medium" | "low"
  regulation_compliance?: RegulationCheck[]
  revision_suggestions: string[]
  uncertainty_questions?: string[]
  overall_summary: string
}
```

---

### Checkpoint Verification — `reviewCheckpoint()`

```typescript
async function reviewCheckpoint(
  contractSpec: string,
  evidenceText: string,
  model?: string,
  lang?: "en" | "id"
): Promise<CheckpointReviewResult>
```

**Returns:**
```typescript
interface CheckpointReviewResult {
  analysis_type: "checkpoint_review"
  status: "APPROVED" | "NEEDS_REVISION" | "MAJOR_ISSUE"
  compliance_score: number            // 0–100
  findings: string
  required_fixes: string[]
  approved_items: string[]
}
```

---

### Contract Q&A — `chatContract()`

```typescript
async function chatContract(
  contractText: string,
  analysisResult?: ContractReviewResult | null,
  userQuestion: string,
  model?: string,
  lang?: "en" | "id"
): Promise<string>          // plain text answer
```

---

## Market Price Integration

When the AI reviews pricing in a contract, it benchmarks against real market data:

| Source | Function | API Required |
|--------|----------|-------------|
| Blibli.com | `fetchBlibliPrices(keyword)` | No (web scraping via FastAPI backend) |
| Google Shopping | `fetchSerpApiPrices(keyword)` | `SERPAPI_KEY` |
| Google CSE | `fetchGoogleCSEPrices(keyword)` | `GOOGLE_CSE_KEY` + `GOOGLE_CSE_ID` |

All sources run in parallel via `fetchAllMarketPrices(keywords)`. Results are summarized by `summarizePrices()` which filters outliers and formats a human-readable price range, then injected into the QVAC analysis prompt.

---

## Supported Contract Types

```typescript
type ContractType =
  | "pengadaan_barang"    // Goods procurement
  | "konstruksi"           // Construction
  | "jasa_it"              // IT services
  | "jasa_konsultasi"      // Consulting
  | "jasa_hukum"           // Legal services
  | "jasa_pendidikan"      // Education/training
  | "ketenagakerjaan"      // Employment
  | "jasa_lainnya"         // Other services
```

Each type maps to a specific expert persona and a set of Indonesian regulations used for compliance checking. The persona selection is done automatically by `detectContractType()`.
