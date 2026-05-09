# POST /api/audit

Analyze a contract using the QVAC AI engine. Returns a full structured review including fairness score, risky clauses, price analysis, and revision suggestions.

---

## Request

```http
POST /api/audit
Content-Type: application/json
```

**Body:**

```typescript
{
  contractText: string,     // Required — full contract text
  model?: string,           // Optional — QVAC tier: "fast" | "smart" | "best"
  lang?: "en" | "id"        // Optional — response language (default: "id")
}
```

---

## Response

```typescript
// 200 OK
{
  success: true,
  data: ContractReviewResult,
  meta: {
    analysis_hash: string,   // SHA-256 of the result JSON (for on-chain recording)
    analyzed_at: string,     // ISO 8601 timestamp
    char_count: number,      // Length of input contract text
    model_used: string       // Which QVAC tier was used
  }
}
```

### `ContractReviewResult` Schema

```typescript
{
  analysis_type: "contract_review",
  contract_type?: ContractType,       // e.g. "jasa_it"
  expert_role?: string,               // e.g. "IT Contract Specialist"
  fairness_score: number,             // 1–10

  price_analysis: Array<{
    item: string,
    contracted_price: number,
    market_min: number,
    market_max: number,
    status: "overpriced" | "fair" | "underpriced",
    notes: string
  }>,

  risky_clauses: Array<{
    clause_number?: string,
    text: string,
    risk: "high" | "medium" | "low",
    reason: string,
    suggestion: string
  }>,

  regulation_compliance?: Array<{
    regulation: string,               // e.g. "UU No. 2/2017 Pasal 47"
    compliant: boolean,
    notes: string
  }>,

  revision_suggestions: string[],
  uncertainty_questions?: string[],
  overall_summary: string
}
```

---

## Example

```bash
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{
    "contractText": "PERJANJIAN JASA IT\n\nPasal 1...",
    "lang": "id"
  }'
```

```json
{
  "success": true,
  "data": {
    "analysis_type": "contract_review",
    "contract_type": "jasa_it",
    "expert_role": "IT Contract Specialist",
    "fairness_score": 6,
    "price_analysis": [
      {
        "item": "Pengembangan Aplikasi Mobile",
        "contracted_price": 50000000,
        "market_min": 35000000,
        "market_max": 60000000,
        "status": "fair",
        "notes": "Harga sesuai pasar untuk skala proyek ini"
      }
    ],
    "risky_clauses": [
      {
        "clause_number": "Pasal 7",
        "text": "Semua kode sumber menjadi milik klien...",
        "risk": "high",
        "reason": "Tidak ada ketentuan hak cipta untuk kontraktor",
        "suggestion": "Tambahkan klausul lisensi bagi kontraktor untuk portofolio"
      }
    ],
    "revision_suggestions": [
      "Tambahkan penalty clause yang setara untuk kedua pihak",
      "Perjelas definisi 'selesai' untuk setiap milestone"
    ],
    "overall_summary": "Kontrak cukup adil namun perlu revisi pada klausul IP dan penalti."
  },
  "meta": {
    "analysis_hash": "a3f9c2d1...",
    "analyzed_at": "2026-05-09T10:30:00.000Z",
    "char_count": 4521,
    "model_used": "smart"
  }
}
```

---

## Notes

- This endpoint is synchronous — it waits for the full AI response before returning
- For large contracts or to show progress during analysis, use `/api/audit-stream` instead
- Processing time: 3–20 seconds depending on QVAC model tier and contract length
- All AI inference is local (QVAC SDK) — no external API calls are made for analysis
