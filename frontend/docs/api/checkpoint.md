# POST /api/review/checkpoint-with-contract

Verify a contractor's milestone submission against the contract specification using the QVAC AI engine. This is the primary checkpoint review endpoint — it reads evidence files from the local filesystem and cross-references them with the stored contract PDF.

A simpler fallback endpoint (`POST /api/review-checkpoint`) is also available for metadata-only reviews without file access.

---

## Request

```http
POST /api/review/checkpoint-with-contract
Content-Type: application/json
```

**Body:**

```typescript
{
  pdaAddress: string,        // Required — on-chain contract PDA address (used to locate local files)
  checkpointIndex: number,   // Required — which milestone to review (0-based)
  model?: string,            // Optional — QVAC tier: "fast" | "smart" | "best"
  lang?: "en" | "id"         // Optional — response language (default: "id")
}
```

The API reads evidence files from:
```
D:\frontier\evidence\{pdaAddress}\{checkpointIndex}\
```

And the contract PDF from:
```
D:\frontier\evidence\{pdaAddress}\contract\
```

---

## Response

```typescript
// 200 OK
{
  success: true,
  data: CheckpointReviewResult
}
```

### `CheckpointReviewResult` Schema

```typescript
{
  analysis_type: "checkpoint_review",
  status: "APPROVED" | "NEEDS_REVISION" | "MAJOR_ISSUE",
  compliance_score: number,      // 0–100
  findings: string,              // Summary of what the AI found
  required_fixes: string[],      // Specific items that must be corrected
  approved_items: string[]       // Items that meet the specification
}
```

---

## Fallback: POST /api/review-checkpoint

For cases where local files are not available, this endpoint accepts metadata directly:

```typescript
{
  contractSpec: string,    // Required — contract text or milestone specification
  evidenceText: string,    // Required — contractor's submitted evidence description
  model?: string,
  lang?: "en" | "id"
}
```

---

## Example

```bash
curl -X POST http://localhost:3000/api/review-checkpoint \
  -H "Content-Type: application/json" \
  -d '{
    "contractSpec": "Milestone 1: Deliver UI mockups for 5 screens in Figma with responsive design",
    "evidenceText": "Figma link: figma.com/file/xxx — Contains 5 screens: Home, Login, Dashboard, Profile, Settings. Desktop and mobile variants included.",
    "lang": "en"
  }'
```

```json
{
  "success": true,
  "data": {
    "analysis_type": "checkpoint_review",
    "status": "APPROVED",
    "compliance_score": 92,
    "findings": "All 5 required screens are present with both desktop and mobile variants. Design quality is consistent and responsive.",
    "required_fixes": [],
    "approved_items": [
      "5 screens delivered as specified",
      "Desktop and mobile variants included",
      "Figma file is accessible and organized"
    ]
  }
}
```

---

## Status Meanings

| Status | Score Range | Action |
|--------|-------------|--------|
| `APPROVED` | 80–100 | Client may approve payment release |
| `NEEDS_REVISION` | 50–79 | Contractor must fix specific items |
| `MAJOR_ISSUE` | 0–49 | Significant non-compliance; review required |

---

## Notes

- The primary endpoint (`checkpoint-with-contract`) requires that evidence files have already been uploaded via `POST /api/evidence/upload` and the contract PDF via `POST /api/contracts/upload-pdf`
- All AI inference runs locally via QVAC SDK (`reviewCheckpoint` function in `app/lib/contractAgent.ts`)
