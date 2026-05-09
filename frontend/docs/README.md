# ContractGuard AI

### Stop signing contracts blind. Deploy trustless escrow in minutes.

---

ContractGuard AI is the first platform that combines **AI contract auditing** with **on-chain escrow** — built specifically for freelancers, vendors, and procurement teams in Indonesia.

Before you sign anything, ContractGuard tells you exactly what's risky, what's unfair, and what the market price should be. After you sign, your payment is locked on Solana and released automatically when work is verified.

> **Live at:** [contractguard.site](https://contractguard.site) (via Cloudflare Tunnel)

---

## The Problem We Solve

Every year, thousands of freelancers and vendors in Indonesia sign contracts they don't fully understand — and lose money because of it.

- Risky clauses buried in legal language
- Payment disputes with no enforcement
- Contract prices that are 2–3× above market rate
- No way to prove deliverables were met

[Read the full problem breakdown →](product/problem.md)

---

## How It Works

```mermaid
flowchart LR
    A([Upload Contract]) --> B([AI Audit])
    B --> C([Deploy Escrow])
    C --> D([Submit Evidence])
    D --> E([Release Funds])

    style A fill:#1a1a2e,stroke:#9945FF,color:#f0f0ff
    style B fill:#1a1a2e,stroke:#9945FF,color:#f0f0ff
    style C fill:#1a1a2e,stroke:#14F195,color:#f0f0ff
    style D fill:#1a1a2e,stroke:#14F195,color:#f0f0ff
    style E fill:#1a1a2e,stroke:#14F195,color:#f0f0ff
```

[See the full solution →](product/solution.md)

---

## Why ContractGuard

- **Built for Indonesia** — understands Indonesian law, Indonesian market prices, Bahasa Indonesia
- **AI-powered by QVAC (Qwen3 local)** — fast local inference, no external API dependency
- **Trustless escrow** — Solana smart contract enforces payment, not a third party
- **No fees, no middleman** — open, permissionless, free during beta

[Why us over alternatives →](product/why-us.md)

---

## Get Started

```bash
cd frontend
npm install
npm run dev
```

[Full installation guide →](getting-started/installation.md)
