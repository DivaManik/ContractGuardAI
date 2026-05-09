#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR/.."
cd "$ROOT"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   ContractGuard AI — Deploy to Devnet          ${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# ─── Step 1: Setup wallet ─────────────────────────────────────────────────
echo -e "${YELLOW}[1/7] Checking wallet...${NC}"
if [ ! -f "my-wallet.json" ]; then
  echo -e "  my-wallet.json not found."
  echo -e "  Paste your base58 private key:"
  read -s PRIVATE_KEY
  node -e "
    const bs58 = require('bs58');
    const fs = require('fs');
    const decoded = bs58.decode('$PRIVATE_KEY');
    fs.writeFileSync('my-wallet.json', JSON.stringify(Array.from(decoded)));
    console.log('Wallet saved.');
  "
  echo "my-wallet.json" >> .gitignore
fi
WALLET_ADDR=$(solana address -k my-wallet.json)
echo -e "${GREEN}✓ Wallet: ${WALLET_ADDR}${NC}"
echo ""

# ─── Step 2: Set CLI to devnet ────────────────────────────────────────────
echo -e "${YELLOW}[2/7] Setting Solana CLI to devnet...${NC}"
solana config set --url devnet --keypair "$(pwd)/my-wallet.json" > /dev/null
echo -e "${GREEN}✓ Cluster: devnet${NC}"
echo ""

# ─── Step 3: Check balance ────────────────────────────────────────────────
echo -e "${YELLOW}[3/7] Checking SOL balance...${NC}"
BALANCE=$(solana balance | awk '{print $1}')
echo -e "  Balance: ${BALANCE} SOL"
BALANCE_INT=$(echo "$BALANCE" | cut -d'.' -f1)
if [ "$BALANCE_INT" -lt 1 ]; then
  echo -e "  Requesting airdrop..."
  solana airdrop 2 || true
  sleep 3
fi
echo -e "${GREEN}✓ Balance OK${NC}"
echo ""

# ─── Step 4: Generate fresh program keypair ───────────────────────────────
echo -e "${YELLOW}[4/7] Generating fresh program keypair...${NC}"
solana-keygen new -o target/deploy/contract-keypair.json --force --no-bip39-passphrase > /dev/null
NEW_PROGRAM_ID=$(solana address -k target/deploy/contract-keypair.json)
echo -e "${GREEN}✓ New Program ID: ${NEW_PROGRAM_ID}${NC}"
echo ""

# ─── Step 5: Update declare_id! and Anchor.toml ───────────────────────────
echo -e "${YELLOW}[5/7] Updating Program ID in source files...${NC}"
# Update lib.rs — replace any existing declare_id
sed -i "s/declare_id!(\"[^\"]*\")/declare_id!(\"${NEW_PROGRAM_ID}\")/" programs/contract/src/lib.rs
# Update Anchor.toml
sed -i "s/contract = \"[^\"]*\"/contract = \"${NEW_PROGRAM_ID}\"/g" Anchor.toml
echo -e "${GREEN}✓ declare_id! and Anchor.toml updated${NC}"
echo ""

# ─── Step 6: Build ────────────────────────────────────────────────────────
echo -e "${YELLOW}[6/7] Building program...${NC}"
anchor build
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# ─── Step 7: Deploy ───────────────────────────────────────────────────────
echo -e "${YELLOW}[7/7] Deploying to devnet...${NC}"
anchor program deploy target/deploy/contract.so \
  --provider.cluster devnet \
  --provider.wallet "$(pwd)/my-wallet.json" \
  --program-keypair target/deploy/contract-keypair.json
echo ""

echo -e "${GREEN}================================================${NC}"
echo -e "  Program ID : ${NEW_PROGRAM_ID}"
echo -e "  Network    : Devnet"
echo -e "  Explorer   : https://explorer.solana.com/address/${NEW_PROGRAM_ID}?cluster=devnet"
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✓ Done! ContractGuard AI is live on devnet.${NC}"
