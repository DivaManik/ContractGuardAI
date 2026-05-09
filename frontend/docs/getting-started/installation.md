# Installation

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | LTS recommended |
| npm | 8+ | Included with Node.js |
| QVAC runtime | latest | Local AI inference server (Qwen3 models) |
| Phantom Wallet | latest | Browser extension for Solana |
| Git | any | For cloning the repo |

---

## 1. Clone the Repository

```bash
git clone https://github.com/your-org/contractguard-ai.git
cd contractguard-ai/frontend
```

## 2. Install Dependencies

```bash
npm install
```

This installs:
- `next` 14
- `@solana/web3.js`, `@solana/wallet-adapter-*`
- `@anchor-lang/core`
- `@qvac/sdk`
- `pdf-parse`
- TypeScript + TailwindCSS dev tools

## 3. Set Up the QVAC Runtime

ContractGuard uses the **QVAC SDK** (`@qvac/sdk`) for all AI inference. The QVAC local inference server must be running before starting the app.

1. Install and start the QVAC local runtime (refer to QVAC SDK documentation)
2. Verify it is accessible at the expected endpoint
3. Set `QVAC_MODEL_DEFAULT` in `.env.local` to your preferred model tier (`fast`, `smart`, or `best`)

> **No external AI API key is needed.** All inference is local.

## 4. Verify Installation

```bash
# Check Node.js
node --version     # should be v18+

# Check npm
npm --version

# Check wallet extension
# Open your browser — Phantom extension should be visible
```

---

## Next Step

Configure your environment variables → [Configuration](configuration.md)
