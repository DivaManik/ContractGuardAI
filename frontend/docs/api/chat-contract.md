# POST /api/chat-contract

Ask natural language questions about a specific contract. The QVAC AI engine answers based on the contract text and optionally the prior audit analysis.

---

## Request

```http
POST /api/chat-contract
Content-Type: application/json
```

**Body:**

```typescript
{
  contractText: string,          // Required — full contract text
  userQuestion: string,          // Required — the user's question
  analysisResult?: object,       // Optional — prior ContractReviewResult (improves answers)
  model?: string,                // Optional — QVAC tier: "fast" | "smart" | "best"
  lang?: "en" | "id"             // Optional — response language (default: "id")
}
```

---

## Response

```typescript
// 200 OK
{
  success: true,
  data: {
    answer: string              // Plain text answer from AI
  }
}
```

---

## Example

```bash
curl -X POST http://localhost:3000/api/chat-contract \
  -H "Content-Type: application/json" \
  -d '{
    "contractText": "PERJANJIAN JASA IT\n...",
    "userQuestion": "Apakah ada klausul penalti jika proyek terlambat?",
    "lang": "id"
  }'
```

```json
{
  "success": true,
  "data": {
    "answer": "Berdasarkan kontrak, klausul penalti keterlambatan terdapat di Pasal 9 ayat 2. Disebutkan bahwa kontraktor dikenakan denda 0.1% per hari keterlambatan dari nilai kontrak, maksimal 5%. Namun perlu diperhatikan bahwa klausul ini hanya berlaku untuk kontraktor — tidak ada penalti setara untuk keterlambatan pembayaran dari klien."
  }
}
```

---

## Suggested Questions

- "Apakah ada klausul yang merugikan kontraktor?"
- "Berapa total nilai kontrak dan jadwal pembayarannya?"
- "Apa kewajiban saya di Pasal 4?"
- "Apakah hak kekayaan intelektual sudah diatur dengan jelas?"
- "Does this contract comply with Indonesian labor law?"

---

## Notes

- Passing `analysisResult` from a prior `/api/audit` call significantly improves answer quality, as the AI has the context of the full analysis
- The AI answers in the same language as the `lang` parameter
- Responses are plain text (not JSON within the answer)
- All inference runs locally via QVAC SDK (`chatContract` function in `app/lib/contractAgent.ts`)
