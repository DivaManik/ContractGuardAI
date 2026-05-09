# POST /api/audit-stream

Stream audit results in real time using Server-Sent Events (SSE). This is the primary audit endpoint used by the `/audit` page. It shows live progress, fetches market prices from Blibli/SerpAPI, and runs the full QVAC analysis — all while streaming status updates to the browser.

---

## Request

```http
POST /api/audit-stream
Content-Type: application/json
```

**Body:** Same as [`/api/audit`](audit.md)

```typescript
{
  contractText: string,
  model?: string,           // QVAC tier: "fast" | "smart" | "best"
  lang?: "en" | "id"
}
```

---

## Response

The response is a **text/event-stream** (SSE) where each event is a JSON chunk:

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event format:**

```
data: {"type": "progress", "message": "Detecting contract type..."}

data: {"type": "progress", "message": "Fetching market prices from Blibli..."}

data: {"type": "progress", "message": "Running AI analysis..."}

data: {"type": "result", "data": { ...ContractReviewResult... }, "meta": { ... }}

data: {"type": "done"}
```

### Event Types

| Type | Payload | Description |
|------|---------|-------------|
| `progress` | `{ message: string }` | Status update during processing |
| `result` | `{ data: ContractReviewResult, meta: {...} }` | Final analysis result |
| `error` | `{ error: string }` | Processing error |
| `done` | none | Stream complete |

---

## Processing Steps (in order)

1. Detect contract type via QVAC (`detectContractType`)
2. Fetch market prices from Blibli and/or SerpAPI in parallel
3. Run full contract analysis via QVAC (`analyzeContract`) with market data injected
4. Stream `result` event with the complete `ContractReviewResult`
5. Stream `done` event

---

## Client-Side Usage (JavaScript)

```typescript
const response = await fetch("/api/audit-stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ contractText, lang: "id" })
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const lines = decoder.decode(value).split("\n");
  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const event = JSON.parse(line.slice(6));

    if (event.type === "progress") {
      setStatusMessage(event.message);
    } else if (event.type === "result") {
      setAnalysisResult(event.data);
    }
  }
}
```

---

## Notes

- Prefer this endpoint over `/api/audit` when the contract is long (> 2,000 characters) or when you want to show the user live progress
- The final `result` event contains the same schema as the synchronous `/api/audit` response
- Market price fetching (Blibli/SerpAPI) happens during streaming — results are injected into the QVAC prompt before analysis
- All AI inference runs locally via QVAC SDK; only market price lookups make external network calls
