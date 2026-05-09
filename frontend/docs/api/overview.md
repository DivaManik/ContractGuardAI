# API Reference — Overview

All API routes are Next.js Route Handlers located in `app/api/`. They run server-side and are not exposed to the client as JavaScript.

---

## Base URL

In development: `http://localhost:3000`

---

## Available Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | [`/api/upload`](upload.md) | Upload and parse a PDF contract |
| `POST` | [`/api/audit`](audit.md) | Analyze a contract with AI |
| `POST` | [`/api/audit-stream`](audit-stream.md) | Stream audit results in real time (SSE) |
| `POST` | [`/api/chat-contract`](chat-contract.md) | Ask questions about a contract |
| `POST` | [`/api/review/checkpoint-with-contract`](checkpoint.md) | AI review of evidence against contract (reads files locally) |
| `POST` | `/api/review-checkpoint` | Fallback AI review based on metadata |
| `POST` | `/api/evidence/upload` | Upload evidence files (local + Supabase + Pinata) |
| `POST` | `/api/contracts/upload-pdf` | Upload contract PDF after on-chain deploy |
| `POST` | `/api/contracts/save-metadata` | Save contract metadata to Supabase |
| `GET`  | `/api/contracts/[pdaAddress]/metadata` | Retrieve contract metadata from Supabase |
| `GET`  | `/api/market/prices` | Proxy to FastAPI market price backend |
| `GET`  | `/api/demo-pdf` | Serve demo PDF from local disk |

---

## Common Request Headers

```http
Content-Type: application/json
```

For file upload (`/api/upload`, `/api/evidence/upload`, `/api/contracts/upload-pdf`):
```http
Content-Type: multipart/form-data
```

---

## Common Response Shape

All endpoints return JSON:

```typescript
// Success
{
  success: true,
  data: { ... }       // endpoint-specific payload
}

// Error
{
  success: false,
  error: "Error message describing what went wrong"
}
```

---

## Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| 200 | Success |
| 400 | Bad request — missing or invalid parameters |
| 500 | Server error — AI call failed, parsing error, etc. |

---

## AI Model Selection

All AI endpoints accept an optional `model` field in the request body to select the QVAC inference tier:

```json
{
  "model": "smart"
}
```

Valid values:

| Tier | Model | Notes |
|------|-------|-------|
| `fast` | Llama 3.2 1B | Fastest, good for development |
| `smart` | Qwen3 4B | Balanced, recommended for production |
| `best` | Qwen3 8B | Most capable, for complex contracts |

If omitted, defaults to the `QVAC_MODEL_DEFAULT` environment variable (default: `fast`).
