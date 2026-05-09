import * as anchor from "@anchor-lang/core";
import { Program, BN } from "@anchor-lang/core";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Contract } from "../target/types/contract";
import fs from "fs";
import path from "path";

// ─── Load wallet ─────────────────────────────────────────────────────────────
const walletPath = path.resolve(__dirname, "../my-wallet.json");
const walletKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
);

// ─── Setup provider ──────────────────────────────────────────────────────────
const connection = new anchor.web3.Connection(
  "https://api.devnet.solana.com",
  "confirmed"
);
const wallet = new anchor.Wallet(walletKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
anchor.setProvider(provider);

const idl = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../target/idl/contract.json"), "utf-8")
);
const PROGRAM_ID = new PublicKey(idl.address);
const program = new Program<Contract>(idl, provider);

// ─── PDAs ────────────────────────────────────────────────────────────────────
const [configPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  PROGRAM_ID
);
const [mintPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("usdc_mint")],
  PROGRAM_ID
);

async function main() {
  console.log("================================================");
  console.log("  ContractGuard AI — Init Devnet");
  console.log("================================================");
  console.log(`Program ID : ${PROGRAM_ID.toBase58()}`);
  console.log(`Admin      : ${walletKeypair.publicKey.toBase58()}`);
  console.log(`Config PDA : ${configPDA.toBase58()}`);
  console.log(`Mint PDA   : ${mintPDA.toBase58()}`);
  console.log("");

  // ─── Step 1: initialize_config ─────────────────────────────────────────────
  console.log("[1/2] initialize_config...");
  try {
    // Generate or load AI agent keypair
    const aiAgentPath = path.resolve(__dirname, "../ai-agent-keypair.json");
    let aiAgentKeypair: Keypair;
    if (fs.existsSync(aiAgentPath)) {
      aiAgentKeypair = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync(aiAgentPath, "utf-8")))
      );
    } else {
      aiAgentKeypair = Keypair.generate();
      fs.writeFileSync(aiAgentPath, JSON.stringify(Array.from(aiAgentKeypair.secretKey)));
      console.log(`  AI Agent keypair generated: ${aiAgentPath}`);
    }
    const aiAgent = aiAgentKeypair.publicKey;
    console.log(`  AI Agent: ${aiAgent.toBase58()}`);

    const tx = await program.methods
      .initializeConfig(aiAgent)
      .accounts({
        admin: walletKeypair.publicKey,
      })
      .signers([walletKeypair])
      .rpc();

    console.log(`✓ initialize_config success`);
    console.log(`  TX: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
  } catch (err: any) {
    if (err.message?.includes("already in use") || err.message?.includes("custom program error: 0x0")) {
      console.log("✓ Config already initialized, skipping.");
    } else {
      console.error("✗ initialize_config failed:", err.message);
      process.exit(1);
    }
  }
  console.log("");

  // ─── Step 2: create_mock_mint ───────────────────────────────────────────────
  console.log("[2/2] create_mock_mint...");
  try {
    const tx = await program.methods
      .createMockMint()
      .accounts({
        admin: walletKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([walletKeypair])
      .rpc();

    console.log(`✓ create_mock_mint success`);
    console.log(`  TX: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
  } catch (err: any) {
    if (err.message?.includes("already in use") || err.message?.includes("custom program error: 0x0")) {
      console.log("✓ Mint already created, skipping.");
    } else {
      console.error("✗ create_mock_mint failed:", err.message);
      process.exit(1);
    }
  }
  console.log("");

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log("================================================");
  console.log(`Program ID : ${PROGRAM_ID.toBase58()}`);
  console.log(`Config PDA : ${configPDA.toBase58()}`);
  console.log(`Mint PDA   : ${mintPDA.toBase58()}`);
  console.log("================================================");
  console.log("✓ ContractGuard AI ready to use on devnet!");
}

main().catch(console.error);
