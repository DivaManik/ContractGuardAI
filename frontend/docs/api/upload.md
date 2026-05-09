# POST /api/upload

Extract text from an uploaded PDF contract. The extracted text is returned in the response and is not persisted to disk — it is intended to be passed directly to `/api/audit` or `/api/audit-stream`.

To upload a contract PDF for permanent storage after on-chain deployment, use `POST /api/contracts/upload-pdf` instead.

---

## Request

```http
POST /api/upload
Content-Type: multipart/form-data
```

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | PDF file to extract text from |

---

## Response

```typescript
// 200 OK
{
  success: true,
  data: {
    text: string,         // Full extracted text from the PDF
    pageCount: number,    // Number of pages
    charCount: number     // Character count of extracted text
  }
}
```

---

## Example

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@contract.pdf"
```

```json
{
  "success": true,
  "data": {
    "text": "PERJANJIAN KERJA SAMA\n\nPasal 1 - Definisi\n...",
    "pageCount": 12,
    "charCount": 8431
  }
}
```

---

## Notes

- Only `.pdf` files are accepted
- Text extraction uses the `pdf-parse` library
- Scanned PDFs (image-based) may return empty or low-quality text — use a PDF with a real text layer when possible
- The file is **not saved to disk** — only the extracted `text` is returned
- Pass the `text` value to `/api/audit-stream` to run the AI analysis
