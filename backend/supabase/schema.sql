-- ============================================================
-- ContractGuard AI — Supabase Schema
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── 1. Contracts ────────────────────────────────────────────
create table if not exists contracts (
  id                uuid primary key default gen_random_uuid(),
  pda_address       text unique not null,
  title             text not null,
  description       text,
  client_wallet     text not null,
  contractor_wallet text not null,
  total_amount      numeric not null,
  contract_type     text,
  pdf_path          text,      -- path di bucket: contracts/{pda}/{filename}.pdf
  fairness_score    numeric,   -- 0-100, hasil audit AI
  created_at        timestamptz default now()
);

create index if not exists idx_contracts_client     on contracts(client_wallet);
create index if not exists idx_contracts_contractor on contracts(contractor_wallet);
create index if not exists idx_contracts_pda        on contracts(pda_address);

-- ─── 2. Checkpoints ──────────────────────────────────────────
create table if not exists checkpoints (
  id               uuid primary key default gen_random_uuid(),
  contract_id      uuid references contracts(id) on delete cascade,
  checkpoint_index int not null,
  name             text not null,
  description      text not null,
  payment_percent  numeric not null,
  unique(contract_id, checkpoint_index)
);

create index if not exists idx_checkpoints_contract on checkpoints(contract_id);

-- ─── 3. Evidence Submissions ─────────────────────────────────
create table if not exists evidence_submissions (
  id             uuid primary key default gen_random_uuid(),
  checkpoint_id  uuid references checkpoints(id) on delete cascade,
  ipfs_cid       text not null,
  supabase_path  text,     -- path di bucket: evidence/{pda}/{cp_index}/{filename}
  file_type      text,     -- "image/jpeg" | "image/png" | "application/pdf"
  file_size      int,      -- bytes
  ai_review      jsonb,    -- { approved, confidence, summary, notes, recommendation }
  submitted_by   text,     -- wallet address contractor
  submitted_at   timestamptz default now()
);

create index if not exists idx_evidence_checkpoint on evidence_submissions(checkpoint_id);

-- ─── 4. Market Price Cache ────────────────────────────────────
create table if not exists market_price_cache (
  id         uuid primary key default gen_random_uuid(),
  query      text not null,
  source     text not null,   -- "blibli" | "serpapi"
  results    jsonb not null,  -- array of { name, price, source }
  scraped_at timestamptz default now()
);

create unique index if not exists idx_market_cache_query_source
  on market_price_cache(query, source);

-- ─── Storage Buckets ─────────────────────────────────────────
-- Jalankan di Storage tab atau via SQL:
-- insert into storage.buckets (id, name, public) values ('contracts', 'contracts', false);
-- insert into storage.buckets (id, name, public) values ('evidence', 'evidence', false);

-- ─── RLS Policies (opsional, skip dulu untuk hackathon) ──────
-- Untuk hackathon: matikan RLS di semua tabel agar service role key bisa akses bebas
-- alter table contracts         disable row level security;
-- alter table checkpoints       disable row level security;
-- alter table evidence_submissions disable row level security;
-- alter table market_price_cache   disable row level security;
