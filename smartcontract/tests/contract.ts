import * as anchor from "@anchor-lang/core";
import { Program, BN } from "@anchor-lang/core";
import { Contract } from "../target/types/contract";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

// ─── Helpers ───────────────────────────────────────────────────────────────

const USDC = (n: number) => new BN(n * 1_000_000); // 1 USDC = 1_000_000 units (6 desimal)

async function airdrop(
  connection: anchor.web3.Connection,
  pubkey: PublicKey,
  sol: number
) {
  const sig = await connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
}

async function getTokenBalance(
  connection: anchor.web3.Connection,
  tokenAccount: PublicKey
): Promise<number> {
  try {
    const info = await connection.getTokenAccountBalance(tokenAccount, "confirmed");
    return Number(info.value.amount);
  } catch {
    return 0;
  }
}

function getContractPDA(
  program: Program<Contract>,
  client: PublicKey,
  contractor: PublicKey,
  createdAt: BN
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("contract"),
      client.toBuffer(),
      contractor.toBuffer(),
      createdAt.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );
}

function getConfigPDA(program: Program<Contract>): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  )[0];
}

function getMintPDA(program: Program<Contract>): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("usdc_mint")],
    program.programId
  )[0];
}

function getMintRecordPDA(program: Program<Contract>, user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("mint_record"), user.toBuffer()],
    program.programId
  )[0];
}

// ATA milik contract PDA (escrow) — allowOwnerOffCurve = true karena PDA
async function getEscrowATA(mint: PublicKey, contractPDA: PublicKey): Promise<PublicKey> {
  return getAssociatedTokenAddress(mint, contractPDA, true);
}

// ATA milik user biasa
async function getUserATA(mint: PublicKey, user: PublicKey): Promise<PublicKey> {
  return getAssociatedTokenAddress(mint, user, false);
}

const NOW = Math.floor(Date.now() / 1000);
const DAY = 86_400;

// ─── Test Setup ────────────────────────────────────────────────────────────

describe("ContractGuard AI — Smart Contract Tests (Mock USDC)", () => {
  const provider = new anchor.AnchorProvider(
    anchor.AnchorProvider.env().connection,
    anchor.AnchorProvider.env().wallet,
    { preflightCommitment: "confirmed", commitment: "confirmed" }
  );
  anchor.setProvider(provider);
  const program = anchor.workspace.contract as Program<Contract>;
  const connection = provider.connection;

  // Global accounts
  const adminKp = Keypair.generate();
  const aiAgentKp = Keypair.generate();
  let configPDA: PublicKey;
  let mintPDA: PublicKey;

  // ─── Global helper: mint 1000 USDC ke user ───────────────────────────────
  async function mintUsdcTo(userKp: Keypair) {
    const userATA = await getUserATA(mintPDA, userKp.publicKey);
    const mintRecord = getMintRecordPDA(program, userKp.publicKey);

    await program.methods
      .mintUsdc()
      .accounts({
        user: userKp.publicKey,
        config: configPDA,
        mint: mintPDA,
        userTokenAccount: userATA,
        mintRecord: mintRecord,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([userKp])
      .rpc();
  }

  // ─── Global setup: init config + buat mock USDC mint ─────────────────────
  before(async () => {
    await airdrop(connection, adminKp.publicKey, 10);
    await airdrop(connection, aiAgentKp.publicKey, 2);

    configPDA = getConfigPDA(program);
    mintPDA = getMintPDA(program);

    await program.methods
      .initializeConfig(aiAgentKp.publicKey)
      .accounts({
        admin: adminKp.publicKey,
        config: configPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([adminKp])
      .rpc();

    await program.methods
      .createMockMint()
      .accounts({
        admin: adminKp.publicKey,
        config: configPDA,
        mint: mintPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([adminKp])
      .rpc();

    const config = await program.account.programConfig.fetch(configPDA);
    assert.equal(config.mint.toBase58(), mintPDA.toBase58(), "mint harus tersimpan di config");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // MINT USDC TESTS
  // ─────────────────────────────────────────────────────────────────────────
  describe("Mint USDC — faucet dengan cooldown 1x per hari", () => {
    const userKp = Keypair.generate();
    let userATA: PublicKey;

    before(async () => {
      await airdrop(connection, userKp.publicKey, 2);
      userATA = await getUserATA(mintPDA, userKp.publicKey);
    });

    it("MINT-01 — mint pertama berhasil, dapat 1000 USDC", async () => {
      await mintUsdcTo(userKp);
      const bal = await getTokenBalance(connection, userATA);
      assert.equal(bal, USDC(1000).toNumber(), "harus dapat 1000 USDC");
    });

    it("MINT-02 — mint kedua langsung harus gagal (MintCooldownNotExpired)", async () => {
      try {
        await mintUsdcTo(userKp);
        assert.fail("Seharusnya error MintCooldownNotExpired");
      } catch (e: any) {
        assert.include(e.message, "Error");
      }
    });

    it("MINT-03 — user berbeda bisa mint tanpa menunggu (cooldown per-user)", async () => {
      const anotherUser = Keypair.generate();
      await airdrop(connection, anotherUser.publicKey, 2);
      await mintUsdcTo(anotherUser);
      const anotherATA = await getUserATA(mintPDA, anotherUser.publicKey);
      const bal = await getTokenBalance(connection, anotherATA);
      assert.equal(bal, USDC(1000).toNumber(), "user baru harus bisa mint langsung");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SKENARIO 1: Happy Path — 3 Checkpoint, Semua Lancar
  // ─────────────────────────────────────────────────────────────────────────
  describe("Happy Path — 3 checkpoint, semua approved tepat waktu", () => {
    const clientKp = Keypair.generate();
    const contractorKp = Keypair.generate();
    const createdAt = new BN(NOW + 10);
    let contractPDA: PublicKey;
    let escrowATA: PublicKey;
    let clientATA: PublicKey;
    let contractorATA: PublicKey;

    const checkpoints = [
      { descriptionHash: "hash_deskripsi_cp1_abcdef123456", paymentAmount: USDC(2), deadline: new BN(NOW + 30 * DAY) },
      { descriptionHash: "hash_deskripsi_cp2_abcdef123456", paymentAmount: USDC(2), deadline: new BN(NOW + 60 * DAY) },
      { descriptionHash: "hash_deskripsi_cp3_abcdef123456", paymentAmount: USDC(1), deadline: new BN(NOW + 90 * DAY) },
    ];

    before(async () => {
      await airdrop(connection, clientKp.publicKey, 5);
      await airdrop(connection, contractorKp.publicKey, 2);
      await mintUsdcTo(clientKp);
      await mintUsdcTo(contractorKp);

      [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
      escrowATA = await getEscrowATA(mintPDA, contractPDA);
      clientATA = await getUserATA(mintPDA, clientKp.publicKey);
      contractorATA = await getUserATA(mintPDA, contractorKp.publicKey);
    });

    it("TEST 1 — create_contract: ContractAccount dibuat, USDC masuk escrow", async () => {
      const clientBalBefore = await getTokenBalance(connection, clientATA);

      await program.methods
        .createContract(
          createdAt,
          "hash_pdf_kontrak_abc123def456",
          "hash_ai_review_report_xyz789",
          USDC(5),
          10, 500, 7, 3, 3,
          checkpoints.map((cp) => ({
            descriptionHash: cp.descriptionHash,
            paymentAmount: cp.paymentAmount,
            deadline: cp.deadline,
          }))
        )
        .accounts({
          client: clientKp.publicKey,
          contractor: contractorKp.publicKey,
          contract: contractPDA,
          mint: mintPDA,
          escrowTokenAccount: escrowATA,
          clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([clientKp])
        .rpc();

      const account = await program.account.contractAccount.fetch(contractPDA);
      assert.equal(account.status.draft !== undefined, true, "status harus Draft");
      assert.equal(account.totalCheckpoints, 3);
      assert.equal(account.totalAmount.toString(), USDC(5).toString());
      assert.equal(account.mint.toBase58(), mintPDA.toBase58(), "mint harus tersimpan");

      const escrowBal = await getTokenBalance(connection, escrowATA);
      assert.equal(escrowBal, USDC(5).toNumber(), "escrow harus punya 5 USDC");

      const clientBalAfter = await getTokenBalance(connection, clientATA);
      assert.equal(clientBalBefore - clientBalAfter, USDC(5).toNumber(), "client berkurang 5 USDC");
    });

    it("TEST 2 — accept_contract: status menjadi Active", async () => {
      await program.methods.acceptContract()
        .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([contractorKp]).rpc();

      const account = await program.account.contractAccount.fetch(contractPDA);
      assert.equal(account.status.active !== undefined, true);
    });

    it("TEST 3a — submit_checkpoint(0): tepat waktu, tidak ada denda", async () => {
      await program.methods.submitCheckpoint(0, "hash_bukti_kerja_checkpoint_1_ev001")
        .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([contractorKp]).rpc();

      const account = await program.account.contractAccount.fetch(contractPDA);
      const cp = account.checkpoints[0];
      assert.equal(cp.status.submitted !== undefined, true);
      assert.equal(cp.penaltyAmount.toString(), "0");
      assert.equal(cp.effectivePayment.toString(), USDC(2).toString());
    });

    it("TEST 3b — approve_checkpoint(0): USDC cair ke contractor", async () => {
      const contractorBalBefore = await getTokenBalance(connection, contractorATA);

      await program.methods.approveCheckpoint(0, "hash_ai_report_checkpoint_1_ok")
        .accounts({
          client: clientKp.publicKey,
          contractor: contractorKp.publicKey,
          contract: contractPDA,
          mint: mintPDA,
          escrowTokenAccount: escrowATA,
          contractorTokenAccount: contractorATA,
          clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([clientKp]).rpc();

      const account = await program.account.contractAccount.fetch(contractPDA);
      assert.equal(account.checkpoints[0].status.approved !== undefined, true);
      assert.equal(account.completedCheckpoints, 1);
      assert.equal(account.status.active !== undefined, true, "masih Active");

      const contractorBalAfter = await getTokenBalance(connection, contractorATA);
      assert.equal(
        contractorBalAfter - contractorBalBefore,
        USDC(2).toNumber(),
        "contractor dapat 2 USDC"
      );
    });

    it("TEST 3c-3f — submit & approve checkpoint 1 dan 2, contract jadi Completed", async () => {
      await program.methods.submitCheckpoint(1, "hash_bukti_kerja_checkpoint_2_ev002")
        .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([contractorKp]).rpc();

      await program.methods.approveCheckpoint(1, "hash_ai_report_checkpoint_2_ok")
        .accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey,
          contract: contractPDA, mint: mintPDA, escrowTokenAccount: escrowATA,
          contractorTokenAccount: contractorATA, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([clientKp]).rpc();

      await program.methods.submitCheckpoint(2, "hash_bukti_kerja_checkpoint_3_ev003")
        .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([contractorKp]).rpc();

      await program.methods.approveCheckpoint(2, "hash_ai_report_checkpoint_3_ok")
        .accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey,
          contract: contractPDA, mint: mintPDA, escrowTokenAccount: escrowATA,
          contractorTokenAccount: contractorATA, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([clientKp]).rpc();

      const account = await program.account.contractAccount.fetch(contractPDA);
      assert.equal(account.status.completed !== undefined, true, "status harus Completed");
      assert.equal(account.completedCheckpoints, 3);

      const escrowBal = await getTokenBalance(connection, escrowATA);
      assert.equal(escrowBal, 0, "escrow harus kosong setelah semua approve");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SKENARIO 2: Revisi
  // ─────────────────────────────────────────────────────────────────────────
  describe("Skenario Revisi — contractor submit, client minta revisi", () => {
    const clientKp = Keypair.generate();
    const contractorKp = Keypair.generate();
    const createdAt = new BN(NOW + 20);
    let contractPDA: PublicKey;
    let escrowATA: PublicKey;
    let clientATA: PublicKey;
    let contractorATA: PublicKey;

    before(async () => {
      await airdrop(connection, clientKp.publicKey, 5);
      await airdrop(connection, contractorKp.publicKey, 2);
      await mintUsdcTo(clientKp);
      await mintUsdcTo(contractorKp);

      [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
      escrowATA = await getEscrowATA(mintPDA, contractPDA);
      clientATA = await getUserATA(mintPDA, clientKp.publicKey);
      contractorATA = await getUserATA(mintPDA, contractorKp.publicKey);

      await program.methods.createContract(
        createdAt, "contract_hash_revisi_test", "ai_review_hash_revisi_test", USDC(3),
        10, 500, 7, 3, 3,
        [{ descriptionHash: "cp_desc_hash_1234567890abcdef", paymentAmount: USDC(3), deadline: new BN(NOW + 30 * DAY) }]
      ).accounts({
        client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA,
        mint: mintPDA, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
        tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      }).signers([clientKp]).rpc();

      await program.methods.acceptContract()
        .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([contractorKp]).rpc();
    });

    it("submit → request_revision → resubmit → approve: USDC cair ke contractor", async () => {
      await program.methods.submitCheckpoint(0, "ev_hash_pertama_kurang_baik")
        .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([contractorKp]).rpc();

      await program.methods.requestRevision(0, "ai_report_ada_kekurangan_disini")
        .accounts({ client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([clientKp]).rpc();

      let account = await program.account.contractAccount.fetch(contractPDA);
      assert.equal(account.checkpoints[0].status.needsRevision !== undefined, true);
      assert.equal(account.checkpoints[0].revisionCount, 1);

      await program.methods.submitCheckpoint(0, "ev_hash_kedua_sudah_diperbaiki")
        .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([contractorKp]).rpc();

      const contractorBalBefore = await getTokenBalance(connection, contractorATA);

      await program.methods.approveCheckpoint(0, "ai_report_sudah_oke_sekarang")
        .accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey,
          contract: contractPDA, mint: mintPDA, escrowTokenAccount: escrowATA,
          contractorTokenAccount: contractorATA, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([clientKp]).rpc();

      account = await program.account.contractAccount.fetch(contractPDA);
      assert.equal(account.status.completed !== undefined, true);

      const contractorBalAfter = await getTokenBalance(connection, contractorATA);
      assert.equal(contractorBalAfter - contractorBalBefore, USDC(3).toNumber(), "contractor dapat 3 USDC");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SKENARIO 3: Extension
  // ─────────────────────────────────────────────────────────────────────────
  describe("Skenario Extension — contractor request, client approve/reject", () => {
    const clientKp = Keypair.generate();
    const contractorKp = Keypair.generate();
    const createdAt = new BN(NOW + 30);
    let contractPDA: PublicKey;
    let escrowATA: PublicKey;
    let clientATA: PublicKey;

    before(async () => {
      await airdrop(connection, clientKp.publicKey, 5);
      await airdrop(connection, contractorKp.publicKey, 2);
      await mintUsdcTo(clientKp);
      await mintUsdcTo(contractorKp);

      [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
      escrowATA = await getEscrowATA(mintPDA, contractPDA);
      clientATA = await getUserATA(mintPDA, clientKp.publicKey);

      await program.methods.createContract(
        createdAt, "contract_hash_ext", "ai_review_hash_ext", USDC(2),
        10, 500, 7, 3, 3,
        [{ descriptionHash: "cp_desc_ext_1234567890abcdef", paymentAmount: USDC(2), deadline: new BN(NOW + 5 * DAY) }]
      ).accounts({
        client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA,
        mint: mintPDA, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
        tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      }).signers([clientKp]).rpc();

      await program.methods.acceptContract()
        .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([contractorKp]).rpc();
    });

    it("request_extension → approve_extension: deadline terupdate", async () => {
      const newDeadline = new BN(NOW + 60 * DAY);

      await program.methods.requestExtension(0, newDeadline)
        .accounts({ contractor: contractorKp.publicKey, client: clientKp.publicKey, contract: contractPDA })
        .signers([contractorKp]).rpc();

      let account = await program.account.contractAccount.fetch(contractPDA);
      assert.equal(account.checkpoints[0].status.extensionPending !== undefined, true);

      await program.methods.approveExtension(0)
        .accounts({ client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([clientKp]).rpc();

      account = await program.account.contractAccount.fetch(contractPDA);
      assert.equal(account.checkpoints[0].status.pending !== undefined, true);
      assert.equal(account.checkpoints[0].deadline.toString(), newDeadline.toString());
    });

    it("reject_extension: deadline lama tetap berlaku", async () => {
      const oldDeadline = (await program.account.contractAccount.fetch(contractPDA)).checkpoints[0].deadline;
      const badDeadline = new BN(NOW + 120 * DAY);

      await program.methods.requestExtension(0, badDeadline)
        .accounts({ contractor: contractorKp.publicKey, client: clientKp.publicKey, contract: contractPDA })
        .signers([contractorKp]).rpc();

      await program.methods.rejectExtension(0)
        .accounts({ client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([clientKp]).rpc();

      const account = await program.account.contractAccount.fetch(contractPDA);
      assert.equal(account.checkpoints[0].deadline.toString(), oldDeadline.toString());
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SKENARIO 4: Cancel
  // ─────────────────────────────────────────────────────────────────────────
  describe("Skenario Cancel — client cancel, USDC dikembalikan", () => {
    const clientKp = Keypair.generate();
    const contractorKp = Keypair.generate();
    const createdAt = new BN(NOW + 40);
    let contractPDA: PublicKey;
    let escrowATA: PublicKey;
    let clientATA: PublicKey;

    before(async () => {
      await airdrop(connection, clientKp.publicKey, 5);
      await airdrop(connection, contractorKp.publicKey, 2);
      await mintUsdcTo(clientKp);
      await mintUsdcTo(contractorKp);

      [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
      escrowATA = await getEscrowATA(mintPDA, contractPDA);
      clientATA = await getUserATA(mintPDA, clientKp.publicKey);

      await program.methods.createContract(
        createdAt, "contract_hash_cancel", "ai_review_hash_cancel", USDC(4),
        10, 500, 7, 3, 3,
        [
          { descriptionHash: "cp1_cancel_desc_1234567890ab", paymentAmount: USDC(2), deadline: new BN(NOW + 30 * DAY) },
          { descriptionHash: "cp2_cancel_desc_1234567890ab", paymentAmount: USDC(2), deadline: new BN(NOW + 60 * DAY) },
        ]
      ).accounts({
        client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA,
        mint: mintPDA, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
        tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      }).signers([clientKp]).rpc();

      await program.methods.acceptContract()
        .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([contractorKp]).rpc();
    });

    it("cancel_contract: semua USDC Pending kembali ke client", async () => {
      const clientBalBefore = await getTokenBalance(connection, clientATA);

      await program.methods.cancelContract()
        .accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey,
          contract: contractPDA, mint: mintPDA, escrowTokenAccount: escrowATA,
          clientTokenAccount: clientATA, tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([clientKp]).rpc();

      const account = await program.account.contractAccount.fetch(contractPDA);
      assert.equal(account.status.cancelled !== undefined, true);

      const clientBalAfter = await getTokenBalance(connection, clientATA);
      assert.equal(clientBalAfter - clientBalBefore, USDC(4).toNumber(), "client dapat refund 4 USDC");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FAILURE CASES
  // ─────────────────────────────────────────────────────────────────────────
  describe("Failure Cases — instruksi yang harus ditolak", () => {
    const clientKp = Keypair.generate();
    const contractorKp = Keypair.generate();
    const createdAt = new BN(NOW + 50);
    let contractPDA: PublicKey;
    let escrowATA: PublicKey;
    let clientATA: PublicKey;
    let contractorATA: PublicKey;

    before(async () => {
      await airdrop(connection, clientKp.publicKey, 5);
      await airdrop(connection, contractorKp.publicKey, 2);
      await mintUsdcTo(clientKp);
      await mintUsdcTo(contractorKp);

      [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
      escrowATA = await getEscrowATA(mintPDA, contractPDA);
      clientATA = await getUserATA(mintPDA, clientKp.publicKey);
      contractorATA = await getUserATA(mintPDA, contractorKp.publicKey);

      await program.methods.createContract(
        createdAt, "contract_hash_fail_test", "ai_review_fail_test", USDC(3),
        10, 500, 7, 3, 3,
        [
          { descriptionHash: "cp_fail_desc_1234567890abcd", paymentAmount: USDC(2), deadline: new BN(NOW + 30 * DAY) },
          { descriptionHash: "cp_fail_desc_5678901234abcd", paymentAmount: USDC(1), deadline: new BN(NOW + 60 * DAY) },
        ]
      ).accounts({
        client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA,
        mint: mintPDA, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
        tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      }).signers([clientKp]).rpc();
    });

    it("FAIL 1 — wrong signer: contractor tidak bisa approve_checkpoint", async () => {
      await program.methods.acceptContract()
        .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([contractorKp]).rpc();

      await program.methods.submitCheckpoint(0, "ev_fail_test_hash_abcdef12")
        .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([contractorKp]).rpc();

      try {
        await program.methods.approveCheckpoint(0, "ai_report_fail")
          .accounts({
            client: contractorKp.publicKey, contractor: contractorKp.publicKey,
            contract: contractPDA, mint: mintPDA, escrowTokenAccount: escrowATA,
            contractorTokenAccount: contractorATA, clientTokenAccount: contractorATA,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([contractorKp]).rpc();
        assert.fail("Seharusnya error");
      } catch (e: any) {
        assert.include(e.message, "Error");
      }
    });

    it("FAIL 2 — accept_contract yang sudah Active harus gagal", async () => {
      try {
        await program.methods.acceptContract()
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();
        assert.fail("Seharusnya error");
      } catch (e: any) {
        assert.include(e.message, "Error");
      }
    });

    it("FAIL 3 — double submit pada checkpoint yang sudah Submitted", async () => {
      try {
        await program.methods.submitCheckpoint(0, "ev_double_submit_abcdef12")
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();
        assert.fail("Seharusnya error");
      } catch (e: any) {
        assert.include(e.message, "Error");
      }
    });

    it("FAIL 4 — payment amounts tidak cocok", async () => {
      const badAt = new BN(NOW + 199);
      const [badPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, badAt);
      const badEscrow = await getEscrowATA(mintPDA, badPDA);

      try {
        await program.methods.createContract(
          badAt, "hash", "hash", USDC(5),
          10, 500, 7, 3, 3,
          [
            { descriptionHash: "cp1_bad_hash_12345678901234", paymentAmount: USDC(2), deadline: new BN(NOW + 30 * DAY) },
            { descriptionHash: "cp2_bad_hash_12345678901234", paymentAmount: USDC(2), deadline: new BN(NOW + 60 * DAY) },
          ]
        ).accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: badPDA,
          mint: mintPDA, escrowTokenAccount: badEscrow, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).signers([clientKp]).rpc();
        assert.fail("Seharusnya error PaymentAmountMismatch");
      } catch (e: any) {
        assert.include(e.message, "Error");
      }
    });

    it("FAIL 5 — contract_hash kosong", async () => {
      const badAt = new BN(NOW + 200);
      const [badPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, badAt);
      const badEscrow = await getEscrowATA(mintPDA, badPDA);

      try {
        await program.methods.createContract(
          badAt, "", "hash", USDC(1),
          10, 500, 7, 3, 3,
          [{ descriptionHash: "cp_desc_hash_1234567890abcd", paymentAmount: USDC(1), deadline: new BN(NOW + 30 * DAY) }]
        ).accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: badPDA,
          mint: mintPDA, escrowTokenAccount: badEscrow, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).signers([clientKp]).rpc();
        assert.fail("Seharusnya error EmptyHash");
      } catch (e: any) {
        assert.include(e.message, "Error");
      }
    });

    it("FAIL 6 — 0 checkpoint tidak valid", async () => {
      const badAt = new BN(NOW + 201);
      const [badPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, badAt);
      const badEscrow = await getEscrowATA(mintPDA, badPDA);

      try {
        await program.methods.createContract(
          badAt, "hash", "hash", USDC(0),
          10, 500, 7, 3, 3, []
        ).accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: badPDA,
          mint: mintPDA, escrowTokenAccount: badEscrow, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).signers([clientKp]).rpc();
        assert.fail("Seharusnya error InvalidCheckpointCount");
      } catch (e: any) {
        assert.include(e.message, "Error");
      }
    });

    it("FAIL 7 — expire_checkpoint terlalu awal", async () => {
      const badAt = new BN(NOW + 202);
      const [badPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, badAt);
      const badEscrow = await getEscrowATA(mintPDA, badPDA);
      const badClientATA = await getUserATA(mintPDA, clientKp.publicKey);

      const freshClient = Keypair.generate();
      await airdrop(connection, freshClient.publicKey, 5);
      await mintUsdcTo(freshClient);
      const freshClientATA = await getUserATA(mintPDA, freshClient.publicKey);
      const freshContractor = Keypair.generate();
      await airdrop(connection, freshContractor.publicKey, 2);
      await mintUsdcTo(freshContractor);
      const [freshPDA] = getContractPDA(program, freshClient.publicKey, freshContractor.publicKey, badAt);
      const freshEscrow = await getEscrowATA(mintPDA, freshPDA);

      await program.methods.createContract(
        badAt, "hash_expire_fail", "ai_hash_expire_fail", USDC(2),
        10, 500, 7, 3, 3,
        [{ descriptionHash: "cp_expire_fail_1234567890ab", paymentAmount: USDC(2), deadline: new BN(NOW + 30 * DAY) }]
      ).accounts({
        client: freshClient.publicKey, contractor: freshContractor.publicKey, contract: freshPDA,
        mint: mintPDA, escrowTokenAccount: freshEscrow, clientTokenAccount: freshClientATA,
        tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      }).signers([freshClient]).rpc();

      await program.methods.acceptContract()
        .accounts({ contractor: freshContractor.publicKey, contract: freshPDA })
        .signers([freshContractor]).rpc();

      try {
        await program.methods.expireCheckpoint(0)
          .accounts({
            client: freshClient.publicKey, contractor: freshContractor.publicKey,
            contract: freshPDA, mint: mintPDA, escrowTokenAccount: freshEscrow,
            clientTokenAccount: freshClientATA, tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([freshClient]).rpc();
        assert.fail("Seharusnya error DeadlineNotExpired");
      } catch (e: any) {
        assert.include(e.message, "Error");
      }
    });

    it("FAIL 8 — cancel tidak bisa jika ada checkpoint Submitted", async () => {
      try {
        await program.methods.cancelContract()
          .accounts({
            client: clientKp.publicKey, contractor: contractorKp.publicKey,
            contract: contractPDA, mint: mintPDA, escrowTokenAccount: escrowATA,
            clientTokenAccount: clientATA, tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([clientKp]).rpc();
        assert.fail("Seharusnya error CannotCancelWithSubmittedCheckpoints");
      } catch (e: any) {
        assert.include(e.message, "Error");
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // BUG FIX VERIFICATION TESTS
  // ─────────────────────────────────────────────────────────────────────────
  describe("Bug Fix Verification Tests", () => {

    describe("SEC-01 — max_penalty_bps > 10000 harus ditolak", () => {
      const clientKp = Keypair.generate();
      const contractorKp = Keypair.generate();

      before(async () => {
        await airdrop(connection, clientKp.publicKey, 5);
        await airdrop(connection, contractorKp.publicKey, 2);
        await mintUsdcTo(clientKp);
        await mintUsdcTo(contractorKp);
      });

      it("BUGFIX-SEC01-A — max_penalty_bps > 10000 harus gagal", async () => {
        const at = new BN(NOW + 300);
        const [pda] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, at);
        const escrow = await getEscrowATA(mintPDA, pda);
        const clientATA = await getUserATA(mintPDA, clientKp.publicKey);

        try {
          await program.methods.createContract(
            at, "hash_contract_sec01a", "hash_ai_sec01a", USDC(1),
            100, 15_000, 7, 3, 3,
            [{ descriptionHash: "cp_desc_sec01a_1234567890ab", paymentAmount: USDC(1), deadline: new BN(NOW + 30 * DAY) }]
          ).accounts({
            client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: pda,
            mint: mintPDA, escrowTokenAccount: escrow, clientTokenAccount: clientATA,
            tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          }).signers([clientKp]).rpc();
          assert.fail("Seharusnya error InvalidPenaltyConfig");
        } catch (e: any) {
          assert.include(e.message, "Error");
        }
      });

      it("BUGFIX-SEC01-B — client == contractor harus gagal", async () => {
        const at = new BN(NOW + 301);
        const [pda] = getContractPDA(program, clientKp.publicKey, clientKp.publicKey, at);
        const escrow = await getEscrowATA(mintPDA, pda);
        const clientATA = await getUserATA(mintPDA, clientKp.publicKey);

        try {
          await program.methods.createContract(
            at, "hash_contract_sec01b", "hash_ai_sec01b", USDC(1),
            10, 500, 7, 3, 3,
            [{ descriptionHash: "cp_desc_sec01b_1234567890ab", paymentAmount: USDC(1), deadline: new BN(NOW + 30 * DAY) }]
          ).accounts({
            client: clientKp.publicKey, contractor: clientKp.publicKey, contract: pda,
            mint: mintPDA, escrowTokenAccount: escrow, clientTokenAccount: clientATA,
            tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          }).signers([clientKp]).rpc();
          assert.fail("Seharusnya error InvalidContractParties");
        } catch (e: any) {
          assert.include(e.message, "Error");
        }
      });
    });

    describe("BUG-01 — cancel refund NeedsRevision & Disputed", () => {
      const clientKp = Keypair.generate();
      const contractorKp = Keypair.generate();
      const createdAt = new BN(NOW + 400);
      let contractPDA: PublicKey;
      let escrowATA: PublicKey;
      let clientATA: PublicKey;
      let contractorATA: PublicKey;

      before(async () => {
        await airdrop(connection, clientKp.publicKey, 5);
        await airdrop(connection, contractorKp.publicKey, 2);
        await mintUsdcTo(clientKp);
        await mintUsdcTo(contractorKp);

        [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
        escrowATA = await getEscrowATA(mintPDA, contractPDA);
        clientATA = await getUserATA(mintPDA, clientKp.publicKey);
        contractorATA = await getUserATA(mintPDA, contractorKp.publicKey);

        await program.methods.createContract(
          createdAt, "hash_bug01_contract_abc", "hash_bug01_ai_abcdefg", USDC(6),
          10, 500, 7, 3, 2,
          [
            { descriptionHash: "cp_bug01_needs_rev_12345678", paymentAmount: USDC(2), deadline: new BN(NOW + 30 * DAY) },
            { descriptionHash: "cp_bug01_disputed_12345678a", paymentAmount: USDC(2), deadline: new BN(NOW + 60 * DAY) },
            { descriptionHash: "cp_bug01_pending_123456789a", paymentAmount: USDC(2), deadline: new BN(NOW + 90 * DAY) },
          ]
        ).accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA,
          mint: mintPDA, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).signers([clientKp]).rpc();

        await program.methods.acceptContract()
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();

        // cp[0] → NeedsRevision
        await program.methods.submitCheckpoint(0, "ev_needs_revision_initial_12")
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();
        await program.methods.requestRevision(0, "ai_report_needs_revision_123")
          .accounts({ client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([clientKp]).rpc();

        // cp[1] → Disputed (2x revisi, max=2)
        await program.methods.submitCheckpoint(1, "ev_disputed_round1_12345678")
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();
        await program.methods.requestRevision(1, "ai_report_revision1_12345678")
          .accounts({ client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([clientKp]).rpc();
        await program.methods.submitCheckpoint(1, "ev_disputed_round2_12345678")
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();
        await program.methods.requestRevision(1, "ai_report_revision2_disputed1")
          .accounts({ client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([clientKp]).rpc();
      });

      it("BUGFIX-BUG01 — cancel diblokir saat Disputed; setelah resolve bisa cancel, total refund 6 USDC", async () => {
        const clientBalBefore = await getTokenBalance(connection, clientATA);

        // Harus gagal: cp[1] masih Disputed
        try {
          await program.methods.cancelContract()
            .accounts({
              client: clientKp.publicKey, contractor: contractorKp.publicKey,
              contract: contractPDA, mint: mintPDA, escrowTokenAccount: escrowATA,
              clientTokenAccount: clientATA, tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([clientKp]).rpc();
          assert.fail("Seharusnya gagal dengan CannotCancelWithDisputedCheckpoints");
        } catch (e: any) {
          assert.include(e.message, "CannotCancelWithDisputedCheckpoints");
        }

        // Resolve cp[1] favor_contractor=false → 2 USDC langsung kembali ke client
        await program.methods.resolveDispute(1, false)
          .accounts({
            resolver: aiAgentKp.publicKey,
            client: clientKp.publicKey, contractor: contractorKp.publicKey,
            contract: contractPDA, config: configPDA,
            mint: mintPDA,
            escrowTokenAccount: escrowATA,
            contractorTokenAccount: contractorATA,
            clientTokenAccount: clientATA,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([aiAgentKp]).rpc();

        // Sekarang cancel berhasil: cp[0] NeedsRevision + cp[2] Pending = 4 USDC
        await program.methods.cancelContract()
          .accounts({
            client: clientKp.publicKey, contractor: contractorKp.publicKey,
            contract: contractPDA, mint: mintPDA, escrowTokenAccount: escrowATA,
            clientTokenAccount: clientATA, tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([clientKp]).rpc();

        const acc = await program.account.contractAccount.fetch(contractPDA);
        assert.equal(acc.status.cancelled !== undefined, true);

        // resolve refund 2 USDC + cancel refund 4 USDC = 6 USDC total ke client
        const clientBalAfter = await getTokenBalance(connection, clientATA);
        assert.equal(clientBalAfter - clientBalBefore, USDC(6).toNumber(), "client dapat total 6 USDC kembali");
      });
    });

    describe("BUG-03 — expire_checkpoint pada NeedsRevision", () => {
      const clientKp = Keypair.generate();
      const contractorKp = Keypair.generate();
      const createdAt = new BN(NOW + 500);
      let contractPDA: PublicKey;
      let escrowATA: PublicKey;
      let clientATA: PublicKey;

      before(async () => {
        await airdrop(connection, clientKp.publicKey, 5);
        await airdrop(connection, contractorKp.publicKey, 2);
        await mintUsdcTo(clientKp);
        await mintUsdcTo(contractorKp);

        [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
        escrowATA = await getEscrowATA(mintPDA, contractPDA);
        clientATA = await getUserATA(mintPDA, clientKp.publicKey);

        const pastDeadline = new BN(NOW - 10 * DAY);

        await program.methods.createContract(
          createdAt, "hash_bug03_contract_abc", "hash_bug03_ai_abcdefghi", USDC(2),
          10, 500, 7, 0, 3,
          [{ descriptionHash: "cp_bug03_needs_rev_12345678a", paymentAmount: USDC(2), deadline: pastDeadline }]
        ).accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA,
          mint: mintPDA, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).signers([clientKp]).rpc();

        await program.methods.acceptContract()
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();

        await program.methods.submitCheckpoint(0, "ev_bug03_submit_12345678901")
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();
        await program.methods.requestRevision(0, "ai_bug03_revision_123456789")
          .accounts({ client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([clientKp]).rpc();
      });

      it("BUGFIX-BUG03 — expire_checkpoint pada NeedsRevision berhasil, USDC kembali ke client", async () => {
        const clientBalBefore = await getTokenBalance(connection, clientATA);

        await program.methods.expireCheckpoint(0)
          .accounts({
            client: clientKp.publicKey, contractor: contractorKp.publicKey,
            contract: contractPDA, mint: mintPDA, escrowTokenAccount: escrowATA,
            clientTokenAccount: clientATA, tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([clientKp]).rpc();

        const acc = await program.account.contractAccount.fetch(contractPDA);
        assert.equal(acc.checkpoints[0].status.expired !== undefined, true);
        assert.equal(acc.status.completed !== undefined, true);

        const clientBalAfter = await getTokenBalance(connection, clientATA);
        assert.equal(clientBalAfter - clientBalBefore, USDC(2).toNumber(), "client dapat refund 2 USDC");
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DISPUTE RESOLUTION — AI Agent Judge
  // ─────────────────────────────────────────────────────────────────────────
  describe("Dispute Resolution — AI Agent & Admin Judge", () => {

    describe("DISPUTE-01 — AI Agent putuskan favor_contractor = true", () => {
      const clientKp = Keypair.generate();
      const contractorKp = Keypair.generate();
      const createdAt = new BN(NOW + 600);
      let contractPDA: PublicKey;
      let escrowATA: PublicKey;
      let clientATA: PublicKey;
      let contractorATA: PublicKey;

      before(async () => {
        await airdrop(connection, clientKp.publicKey, 5);
        await airdrop(connection, contractorKp.publicKey, 2);
        await mintUsdcTo(clientKp);
        await mintUsdcTo(contractorKp);

        [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
        escrowATA = await getEscrowATA(mintPDA, contractPDA);
        clientATA = await getUserATA(mintPDA, clientKp.publicKey);
        contractorATA = await getUserATA(mintPDA, contractorKp.publicKey);

        await program.methods.createContract(
          createdAt, "hash_dispute_ct_abcdefghij", "hash_dispute_ai_abcdefghi", USDC(3),
          10, 500, 7, 3, 1,
          [{ descriptionHash: "cp_dispute_ct_1234567890abc", paymentAmount: USDC(3), deadline: new BN(NOW + 30 * DAY) }]
        ).accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA,
          mint: mintPDA, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).signers([clientKp]).rpc();

        await program.methods.acceptContract()
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();

        await program.methods.submitCheckpoint(0, "ev_dispute_initial_12345678")
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();

        await program.methods.requestRevision(0, "ai_report_dispute_12345678a")
          .accounts({ client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([clientKp]).rpc();
      });

      it("DISPUTE-01 — AI Agent resolve favor=true: 3 USDC ke contractor", async () => {
        const contractorBalBefore = await getTokenBalance(connection, contractorATA);

        await program.methods.resolveDispute(0, true)
          .accounts({
            resolver: aiAgentKp.publicKey,
            client: clientKp.publicKey, contractor: contractorKp.publicKey,
            contract: contractPDA, config: configPDA,
            mint: mintPDA,
            escrowTokenAccount: escrowATA,
            contractorTokenAccount: contractorATA,
            clientTokenAccount: clientATA,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([aiAgentKp]).rpc();

        const acc = await program.account.contractAccount.fetch(contractPDA);
        assert.equal(acc.checkpoints[0].status.approved !== undefined, true);
        assert.equal(acc.status.completed !== undefined, true);

        const contractorBalAfter = await getTokenBalance(connection, contractorATA);
        assert.equal(contractorBalAfter - contractorBalBefore, USDC(3).toNumber(), "contractor dapat 3 USDC");
      });
    });

    describe("DISPUTE-02 — Admin fallback putuskan favor_contractor = false", () => {
      const clientKp = Keypair.generate();
      const contractorKp = Keypair.generate();
      const createdAt = new BN(NOW + 700);
      let contractPDA: PublicKey;
      let escrowATA: PublicKey;
      let clientATA: PublicKey;
      let contractorATA: PublicKey;

      before(async () => {
        await airdrop(connection, clientKp.publicKey, 5);
        await airdrop(connection, contractorKp.publicKey, 2);
        await mintUsdcTo(clientKp);
        await mintUsdcTo(contractorKp);

        [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
        escrowATA = await getEscrowATA(mintPDA, contractPDA);
        clientATA = await getUserATA(mintPDA, clientKp.publicKey);
        contractorATA = await getUserATA(mintPDA, contractorKp.publicKey);

        await program.methods.createContract(
          createdAt, "hash_dispute_admin_abcdefgh", "hash_dispute_admin_ai_abcd", USDC(2),
          10, 500, 7, 3, 1,
          [{ descriptionHash: "cp_dispute_admin_123456789a", paymentAmount: USDC(2), deadline: new BN(NOW + 30 * DAY) }]
        ).accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA,
          mint: mintPDA, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).signers([clientKp]).rpc();

        await program.methods.acceptContract()
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();

        await program.methods.submitCheckpoint(0, "ev_admin_dispute_12345678ab")
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();

        await program.methods.requestRevision(0, "ai_report_admin_dispute_1234")
          .accounts({ client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([clientKp]).rpc();
      });

      it("DISPUTE-02 — Admin fallback resolve favor=false: 2 USDC refund ke client", async () => {
        const clientBalBefore = await getTokenBalance(connection, clientATA);

        await program.methods.resolveDispute(0, false)
          .accounts({
            resolver: adminKp.publicKey,
            client: clientKp.publicKey, contractor: contractorKp.publicKey,
            contract: contractPDA, config: configPDA,
            mint: mintPDA,
            escrowTokenAccount: escrowATA,
            contractorTokenAccount: contractorATA,
            clientTokenAccount: clientATA,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([adminKp]).rpc();

        const acc = await program.account.contractAccount.fetch(contractPDA);
        assert.equal(acc.checkpoints[0].status.expired !== undefined, true);
        assert.equal(acc.status.completed !== undefined, true);

        const clientBalAfter = await getTokenBalance(connection, clientATA);
        assert.equal(clientBalAfter - clientBalBefore, USDC(2).toNumber(), "client dapat refund 2 USDC");
      });
    });

    describe("DISPUTE-03 — Unauthorized resolver harus ditolak", () => {
      const clientKp = Keypair.generate();
      const contractorKp = Keypair.generate();
      const strangerKp = Keypair.generate();
      const createdAt = new BN(NOW + 800);
      let contractPDA: PublicKey;
      let escrowATA: PublicKey;
      let clientATA: PublicKey;
      let contractorATA: PublicKey;

      before(async () => {
        await airdrop(connection, clientKp.publicKey, 5);
        await airdrop(connection, contractorKp.publicKey, 2);
        await airdrop(connection, strangerKp.publicKey, 2);
        await mintUsdcTo(clientKp);
        await mintUsdcTo(contractorKp);
        await mintUsdcTo(strangerKp);

        [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
        escrowATA = await getEscrowATA(mintPDA, contractPDA);
        clientATA = await getUserATA(mintPDA, clientKp.publicKey);
        contractorATA = await getUserATA(mintPDA, contractorKp.publicKey);

        await program.methods.createContract(
          createdAt, "hash_dispute_unauth_abcdefg", "hash_dispute_unauth_ai_abc", USDC(2),
          10, 500, 7, 3, 1,
          [{ descriptionHash: "cp_dispute_unauth_12345678a", paymentAmount: USDC(2), deadline: new BN(NOW + 30 * DAY) }]
        ).accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA,
          mint: mintPDA, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).signers([clientKp]).rpc();

        await program.methods.acceptContract()
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();

        await program.methods.submitCheckpoint(0, "ev_unauth_dispute_1234567890")
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();

        await program.methods.requestRevision(0, "ai_report_unauth_12345678901")
          .accounts({ client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([clientKp]).rpc();
      });

      it("DISPUTE-03 — Stranger tidak bisa resolve (UnauthorizedResolver)", async () => {
        const strangerATA = await getUserATA(mintPDA, strangerKp.publicKey);
        try {
          await program.methods.resolveDispute(0, true)
            .accounts({
              resolver: strangerKp.publicKey,
              client: clientKp.publicKey, contractor: contractorKp.publicKey,
              contract: contractPDA, config: configPDA,
              mint: mintPDA,
              escrowTokenAccount: escrowATA,
              contractorTokenAccount: contractorATA,
              clientTokenAccount: clientATA,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([strangerKp]).rpc();
          assert.fail("Seharusnya error UnauthorizedResolver");
        } catch (e: any) {
          assert.include(e.message, "Error");
        }
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CRITICAL-01 — try_complete() tidak boleh Complete jika ada Disputed
  // ─────────────────────────────────────────────────────────────────────────
  describe("CRITICAL-01 — approve cp lain tidak boleh Complete kontrak jika cp lain Disputed", () => {
    const clientKp = Keypair.generate();
    const contractorKp = Keypair.generate();
    const createdAt = new BN(NOW + 900);
    let contractPDA: PublicKey;
    let escrowATA: PublicKey;
    let clientATA: PublicKey;
    let contractorATA: PublicKey;

    before(async () => {
      await airdrop(connection, clientKp.publicKey, 5);
      await airdrop(connection, contractorKp.publicKey, 2);
      await mintUsdcTo(clientKp);
      await mintUsdcTo(contractorKp);

      [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
      escrowATA = await getEscrowATA(mintPDA, contractPDA);
      clientATA = await getUserATA(mintPDA, clientKp.publicKey);
      contractorATA = await getUserATA(mintPDA, contractorKp.publicKey);

      await program.methods.createContract(
        createdAt, "hash_critical01_contract_ab", "hash_critical01_ai_abcdef", USDC(5),
        10, 500, 7, 3, 1,
        [
          { descriptionHash: "cp_critical01_normal_1234567", paymentAmount: USDC(2), deadline: new BN(NOW + 30 * DAY) },
          { descriptionHash: "cp_critical01_dispute_123456", paymentAmount: USDC(3), deadline: new BN(NOW + 60 * DAY) },
        ]
      ).accounts({
        client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA,
        mint: mintPDA, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
        tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      }).signers([clientKp]).rpc();

      await program.methods.acceptContract()
        .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([contractorKp]).rpc();

      // cp[1] → Disputed
      await program.methods.submitCheckpoint(1, "ev_critical01_disputed_123456")
        .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([contractorKp]).rpc();
      await program.methods.requestRevision(1, "ai_report_critical01_disputed1")
        .accounts({ client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([clientKp]).rpc();

      // cp[0] → submit normal
      await program.methods.submitCheckpoint(0, "ev_critical01_normal_12345678")
        .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([contractorKp]).rpc();
    });

    it("CRITICAL-01-A — approve cp[0] tidak boleh bikin kontrak Completed saat cp[1] Disputed", async () => {
      await program.methods.approveCheckpoint(0, "ai_report_critical01_normal_ok")
        .accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey,
          contract: contractPDA, mint: mintPDA, escrowTokenAccount: escrowATA,
          contractorTokenAccount: contractorATA, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([clientKp]).rpc();

      const acc = await program.account.contractAccount.fetch(contractPDA);
      assert.equal(acc.checkpoints[0].status.approved !== undefined, true);
      assert.equal(acc.checkpoints[1].status.disputed !== undefined, true);

      // CRITICAL CHECK: harus tetap Active
      assert.equal(acc.status.active !== undefined, true, "harus tetap Active — cp[1] belum resolve");
      assert.equal(acc.status.completed, undefined, "TIDAK boleh Completed sebelum resolve");
    });

    it("CRITICAL-01-B — resolve_dispute cp[1] lalu kontrak baru Completed", async () => {
      const contractorBalBefore = await getTokenBalance(connection, contractorATA);

      await program.methods.resolveDispute(1, true)
        .accounts({
          resolver: aiAgentKp.publicKey,
          client: clientKp.publicKey, contractor: contractorKp.publicKey,
          contract: contractPDA, config: configPDA,
          mint: mintPDA,
          escrowTokenAccount: escrowATA,
          contractorTokenAccount: contractorATA,
          clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([aiAgentKp]).rpc();

      const acc = await program.account.contractAccount.fetch(contractPDA);
      assert.equal(acc.checkpoints[1].status.approved !== undefined, true);
      assert.equal(acc.status.completed !== undefined, true, "sekarang boleh Completed");

      const contractorBalAfter = await getTokenBalance(connection, contractorATA);
      assert.equal(contractorBalAfter - contractorBalBefore, USDC(3).toNumber(), "contractor dapat 3 USDC dari resolve");
    });
  });

  // ─── requestAiReview Tests ──────────────────────────────────────────────────

  describe("requestAiReview — Contractor escalate ke AI review saat client diam", () => {

    describe("AIREV-01 — Terlalu awal, dispute_window belum expired", () => {
      const clientKp = Keypair.generate();
      const contractorKp = Keypair.generate();
      const createdAt = new BN(NOW + 1000);
      let contractPDA: PublicKey;
      let escrowATA: PublicKey;
      let clientATA: PublicKey;

      before(async () => {
        await airdrop(connection, clientKp.publicKey, 5);
        await airdrop(connection, contractorKp.publicKey, 2);
        await mintUsdcTo(clientKp);

        [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
        escrowATA = await getEscrowATA(mintPDA, contractPDA);
        clientATA = await getUserATA(mintPDA, clientKp.publicKey);

        await program.methods.createContract(
          createdAt, "hash_airev01_contract_1234ab", "hash_airev01_ai_abcdefgh1", USDC(2),
          10, 500, 7, 3, 1,
          [{ descriptionHash: "cp_airev01_123456789abcdefgh", paymentAmount: USDC(2), deadline: new BN(NOW + 30 * DAY) }]
        ).accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA,
          mint: mintPDA, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).signers([clientKp]).rpc();

        await program.methods.acceptContract()
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();

        await program.methods.submitCheckpoint(0, "ev_airev01_submit_1234567890")
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();
      });

      it("AIREV-01 — requestAiReview gagal jika dispute_window belum lewat", async () => {
        try {
          await program.methods.requestAiReview(0)
            .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
            .signers([contractorKp]).rpc();
          assert.fail("Seharusnya gagal dengan DisputeWindowNotExpired");
        } catch (e: any) {
          assert.include(e.message, "DisputeWindowNotExpired");
        }
      });
    });

    describe("AIREV-02 — Happy path: AI resolve favor=true setelah client diam", () => {
      const clientKp = Keypair.generate();
      const contractorKp = Keypair.generate();
      const createdAt = new BN(NOW + 1100);
      let contractPDA: PublicKey;
      let escrowATA: PublicKey;
      let clientATA: PublicKey;
      let contractorATA: PublicKey;

      before(async () => {
        await airdrop(connection, clientKp.publicKey, 5);
        await airdrop(connection, contractorKp.publicKey, 2);
        await mintUsdcTo(clientKp);
        await mintUsdcTo(contractorKp);

        [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
        escrowATA = await getEscrowATA(mintPDA, contractPDA);
        clientATA = await getUserATA(mintPDA, clientKp.publicKey);
        contractorATA = await getUserATA(mintPDA, contractorKp.publicKey);

        // dispute_window_days=0 agar requestAiReview bisa langsung dipanggil setelah submit
        await program.methods.createContract(
          createdAt, "hash_airev02_contract_1234ab", "hash_airev02_ai_abcdefgh1", USDC(2),
          10, 500, 0, 3, 1,
          [{ descriptionHash: "cp_airev02_123456789abcdefgh", paymentAmount: USDC(2), deadline: new BN(NOW + 30 * DAY) }]
        ).accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA,
          mint: mintPDA, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).signers([clientKp]).rpc();

        await program.methods.acceptContract()
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();

        await program.methods.submitCheckpoint(0, "ev_airev02_submit_1234567890")
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();

        // Tunggu 1 detik agar blockchain clock maju melewati submitted_at
        await new Promise(r => setTimeout(r, 2000));

        await program.methods.requestAiReview(0)
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();
      });

      it("AIREV-02A — status berubah ke AwaitingAiReview", async () => {
        const acc = await program.account.contractAccount.fetch(contractPDA);
        assert.equal(
          acc.checkpoints[0].status.awaitingAiReview !== undefined, true,
          "status harus AwaitingAiReview"
        );
      });

      it("AIREV-02B — AI agent resolve favor=true: USDC cair ke contractor", async () => {
        const contractorBalBefore = await getTokenBalance(connection, contractorATA);

        await program.methods.resolveDispute(0, true)
          .accounts({
            resolver: aiAgentKp.publicKey,
            client: clientKp.publicKey, contractor: contractorKp.publicKey,
            contract: contractPDA, config: configPDA,
            mint: mintPDA,
            escrowTokenAccount: escrowATA,
            contractorTokenAccount: contractorATA,
            clientTokenAccount: clientATA,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([aiAgentKp]).rpc();

        const acc = await program.account.contractAccount.fetch(contractPDA);
        assert.equal(acc.checkpoints[0].status.approved !== undefined, true);
        assert.equal(acc.status.completed !== undefined, true, "kontrak harus Completed");

        const contractorBalAfter = await getTokenBalance(connection, contractorATA);
        assert.equal(contractorBalAfter - contractorBalBefore, USDC(2).toNumber(), "contractor dapat 2 USDC");
      });
    });

    describe("AIREV-03 — Happy path: AI resolve favor=false setelah client diam", () => {
      const clientKp = Keypair.generate();
      const contractorKp = Keypair.generate();
      const createdAt = new BN(NOW + 1200);
      let contractPDA: PublicKey;
      let escrowATA: PublicKey;
      let clientATA: PublicKey;
      let contractorATA: PublicKey;

      before(async () => {
        await airdrop(connection, clientKp.publicKey, 5);
        await airdrop(connection, contractorKp.publicKey, 2);
        await mintUsdcTo(clientKp);
        await mintUsdcTo(contractorKp);

        [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
        escrowATA = await getEscrowATA(mintPDA, contractPDA);
        clientATA = await getUserATA(mintPDA, clientKp.publicKey);
        contractorATA = await getUserATA(mintPDA, contractorKp.publicKey);

        await program.methods.createContract(
          createdAt, "hash_airev03_contract_1234ab", "hash_airev03_ai_abcdefgh1", USDC(3),
          10, 500, 0, 3, 1,
          [{ descriptionHash: "cp_airev03_123456789abcdefgh", paymentAmount: USDC(3), deadline: new BN(NOW + 30 * DAY) }]
        ).accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA,
          mint: mintPDA, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).signers([clientKp]).rpc();

        await program.methods.acceptContract()
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();

        await program.methods.submitCheckpoint(0, "ev_airev03_submit_1234567890")
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();

        await new Promise(r => setTimeout(r, 2000));

        await program.methods.requestAiReview(0)
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();
      });

      it("AIREV-03 — AI agent resolve favor=false: USDC refund ke client", async () => {
        const clientBalBefore = await getTokenBalance(connection, clientATA);

        await program.methods.resolveDispute(0, false)
          .accounts({
            resolver: aiAgentKp.publicKey,
            client: clientKp.publicKey, contractor: contractorKp.publicKey,
            contract: contractPDA, config: configPDA,
            mint: mintPDA,
            escrowTokenAccount: escrowATA,
            contractorTokenAccount: contractorATA,
            clientTokenAccount: clientATA,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([aiAgentKp]).rpc();

        const acc = await program.account.contractAccount.fetch(contractPDA);
        assert.equal(acc.checkpoints[0].status.expired !== undefined, true);
        assert.equal(acc.status.completed !== undefined, true, "kontrak harus Completed");

        const clientBalAfter = await getTokenBalance(connection, clientATA);
        assert.equal(clientBalAfter - clientBalBefore, USDC(3).toNumber(), "client dapat 3 USDC refund");
      });
    });

    describe("AIREV-04 — cancelContract diblokir saat ada checkpoint AwaitingAiReview", () => {
      const clientKp = Keypair.generate();
      const contractorKp = Keypair.generate();
      const createdAt = new BN(NOW + 1300);
      let contractPDA: PublicKey;
      let escrowATA: PublicKey;
      let clientATA: PublicKey;

      before(async () => {
        await airdrop(connection, clientKp.publicKey, 5);
        await airdrop(connection, contractorKp.publicKey, 2);
        await mintUsdcTo(clientKp);

        [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
        escrowATA = await getEscrowATA(mintPDA, contractPDA);
        clientATA = await getUserATA(mintPDA, clientKp.publicKey);

        await program.methods.createContract(
          createdAt, "hash_airev04_contract_1234ab", "hash_airev04_ai_abcdefgh1", USDC(2),
          10, 500, 0, 3, 1,
          [{ descriptionHash: "cp_airev04_123456789abcdefgh", paymentAmount: USDC(2), deadline: new BN(NOW + 30 * DAY) }]
        ).accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA,
          mint: mintPDA, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).signers([clientKp]).rpc();

        await program.methods.acceptContract()
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();

        await program.methods.submitCheckpoint(0, "ev_airev04_submit_1234567890")
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();

        await new Promise(r => setTimeout(r, 2000));

        await program.methods.requestAiReview(0)
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();
      });

      it("AIREV-04 — cancelContract gagal saat ada checkpoint AwaitingAiReview", async () => {
        try {
          await program.methods.cancelContract()
            .accounts({
              client: clientKp.publicKey, contractor: contractorKp.publicKey,
              contract: contractPDA, mint: mintPDA, escrowTokenAccount: escrowATA,
              clientTokenAccount: clientATA, tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([clientKp]).rpc();
          assert.fail("Seharusnya gagal dengan CannotCancelWithAwaitingAiReview");
        } catch (e: any) {
          assert.include(e.message, "CannotCancelWithAwaitingAiReview");
        }
      });
    });
  });

  // ─── adminCancel Tests ──────────────────────────────────────────────────────

  describe("adminCancel — Force cancel oleh admin setelah 1 tahun inaktif", () => {
    const clientKp = Keypair.generate();
    const contractorKp = Keypair.generate();
    const createdAt = new BN(NOW + 1400);
    let contractPDA: PublicKey;
    let escrowATA: PublicKey;
    let clientATA: PublicKey;

    before(async () => {
      await airdrop(connection, clientKp.publicKey, 5);
      await airdrop(connection, contractorKp.publicKey, 2);
      await mintUsdcTo(clientKp);

      [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
      escrowATA = await getEscrowATA(mintPDA, contractPDA);
      clientATA = await getUserATA(mintPDA, clientKp.publicKey);

      await program.methods.createContract(
        createdAt, "hash_admcancel_contract_1234a", "hash_admcancel_ai_abcdefg1a", USDC(3),
        10, 500, 7, 3, 1,
        [{ descriptionHash: "cp_admcancel_123456789abcdef1", paymentAmount: USDC(3), deadline: new BN(NOW + 30 * DAY) }]
      ).accounts({
        client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA,
        mint: mintPDA, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
        tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      }).signers([clientKp]).rpc();

      await program.methods.acceptContract()
        .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
        .signers([contractorKp]).rpc();
    });

    it("ADMINCANCEL-01 — Admin tidak bisa cancel sebelum 1 tahun inaktif (InactivityPeriodNotReached)", async () => {
      try {
        await program.methods.adminCancel()
          .accounts({
            admin: adminKp.publicKey,
            client: clientKp.publicKey, contractor: contractorKp.publicKey,
            contract: contractPDA, config: configPDA,
            mint: mintPDA,
            escrowTokenAccount: escrowATA,
            clientTokenAccount: clientATA,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([adminKp]).rpc();
        assert.fail("Seharusnya gagal dengan InactivityPeriodNotReached");
      } catch (e: any) {
        assert.include(e.message, "InactivityPeriodNotReached");
      }
    });

    it("ADMINCANCEL-02 — Bukan admin tidak bisa panggil adminCancel (UnauthorizedAdmin)", async () => {
      const strangerKp = Keypair.generate();
      await airdrop(connection, strangerKp.publicKey, 1);

      try {
        await program.methods.adminCancel()
          .accounts({
            admin: strangerKp.publicKey,
            client: clientKp.publicKey, contractor: contractorKp.publicKey,
            contract: contractPDA, config: configPDA,
            mint: mintPDA,
            escrowTokenAccount: escrowATA,
            clientTokenAccount: clientATA,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([strangerKp]).rpc();
        assert.fail("Seharusnya gagal dengan UnauthorizedAdmin");
      } catch (e: any) {
        assert.include(e.message, "UnauthorizedAdmin");
      }
    });
  });

  // ─── Security Fix Verification Tests ───────────────────────────────────────

  describe("Security Fix Verification", () => {

    describe("MED-NEW-01 — resolve_dispute menghormati penalty keterlambatan", () => {

      describe("RESOLVE-PENALTY-01 — favor=true: contractor late, dapat effective_payment bukan full", () => {
        const clientKp = Keypair.generate();
        const contractorKp = Keypair.generate();
        const createdAt = new BN(NOW + 1500);
        let contractPDA: PublicKey;
        let escrowATA: PublicKey;
        let clientATA: PublicKey;
        let contractorATA: PublicKey;

        before(async () => {
          await airdrop(connection, clientKp.publicKey, 5);
          await airdrop(connection, contractorKp.publicKey, 2);
          await mintUsdcTo(clientKp);
          await mintUsdcTo(contractorKp);

          [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
          escrowATA = await getEscrowATA(mintPDA, contractPDA);
          clientATA = await getUserATA(mintPDA, clientKp.publicKey);
          contractorATA = await getUserATA(mintPDA, contractorKp.publicKey);

          // late_penalty=1000bps/hari, max_penalty=3000bps (30%), max_revisions=1
          // deadline 5 hari lalu → penalty = min(10*1000*5/10000, 10*3000/10000) = min(5, 3) = 3 USDC
          // effective_payment = 10 - 3 = 7 USDC
          await program.methods.createContract(
            createdAt, "hash_respnlty01_contract_12a", "hash_respnlty01_ai_abcdefg1", USDC(10),
            1000, 3000, 7, 3, 1,
            [{ descriptionHash: "cp_respnlty01_12345678abcdef1", paymentAmount: USDC(10), deadline: new BN(NOW - 5 * DAY) }]
          ).accounts({
            client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA,
            mint: mintPDA, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
            tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          }).signers([clientKp]).rpc();

          await program.methods.acceptContract()
            .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
            .signers([contractorKp]).rpc();

          // Submit terlambat 5 hari → penalty dihitung otomatis di sini
          await program.methods.submitCheckpoint(0, "ev_respnlty01_late_1234567890a")
            .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
            .signers([contractorKp]).rpc();

          // RequestRevision dengan max_revisions=1 → langsung Disputed
          await program.methods.requestRevision(0, "ai_respnlty01_revision_1234567")
            .accounts({ client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA })
            .signers([clientKp]).rpc();
        });

        it("RESOLVE-PENALTY-01 — AI favor=true: contractor dapat 7 USDC (effective), client dapat 3 USDC (penalty)", async () => {
          const contractorBalBefore = await getTokenBalance(connection, contractorATA);
          const clientBalBefore = await getTokenBalance(connection, clientATA);

          await program.methods.resolveDispute(0, true)
            .accounts({
              resolver: aiAgentKp.publicKey,
              client: clientKp.publicKey, contractor: contractorKp.publicKey,
              contract: contractPDA, config: configPDA,
              mint: mintPDA,
              escrowTokenAccount: escrowATA,
              contractorTokenAccount: contractorATA,
              clientTokenAccount: clientATA,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([aiAgentKp]).rpc();

          const acc = await program.account.contractAccount.fetch(contractPDA);
          assert.equal(acc.checkpoints[0].status.approved !== undefined, true);

          const contractorBalAfter = await getTokenBalance(connection, contractorATA);
          const clientBalAfter = await getTokenBalance(connection, clientATA);
          assert.equal(contractorBalAfter - contractorBalBefore, USDC(7).toNumber(), "contractor dapat 7 USDC (setelah denda 30%)");
          assert.equal(clientBalAfter - clientBalBefore, USDC(3).toNumber(), "client dapat 3 USDC (denda keterlambatan)");
        });
      });

      describe("RESOLVE-PENALTY-02 — favor=false: client dapat full refund meski contractor terlambat", () => {
        const clientKp = Keypair.generate();
        const contractorKp = Keypair.generate();
        const createdAt = new BN(NOW + 1600);
        let contractPDA: PublicKey;
        let escrowATA: PublicKey;
        let clientATA: PublicKey;
        let contractorATA: PublicKey;

        before(async () => {
          await airdrop(connection, clientKp.publicKey, 5);
          await airdrop(connection, contractorKp.publicKey, 2);
          await mintUsdcTo(clientKp);
          await mintUsdcTo(contractorKp);

          [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
          escrowATA = await getEscrowATA(mintPDA, contractPDA);
          clientATA = await getUserATA(mintPDA, clientKp.publicKey);
          contractorATA = await getUserATA(mintPDA, contractorKp.publicKey);

          await program.methods.createContract(
            createdAt, "hash_respnlty02_contract_12a", "hash_respnlty02_ai_abcdefg1", USDC(10),
            1000, 3000, 7, 3, 1,
            [{ descriptionHash: "cp_respnlty02_12345678abcdef1", paymentAmount: USDC(10), deadline: new BN(NOW - 5 * DAY) }]
          ).accounts({
            client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA,
            mint: mintPDA, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
            tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          }).signers([clientKp]).rpc();

          await program.methods.acceptContract()
            .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
            .signers([contractorKp]).rpc();

          await program.methods.submitCheckpoint(0, "ev_respnlty02_late_1234567890a")
            .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
            .signers([contractorKp]).rpc();

          await program.methods.requestRevision(0, "ai_respnlty02_revision_1234567")
            .accounts({ client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA })
            .signers([clientKp]).rpc();
        });

        it("RESOLVE-PENALTY-02 — AI favor=false: client dapat full 10 USDC (denda diampuni saat dispute)", async () => {
          const clientBalBefore = await getTokenBalance(connection, clientATA);

          await program.methods.resolveDispute(0, false)
            .accounts({
              resolver: aiAgentKp.publicKey,
              client: clientKp.publicKey, contractor: contractorKp.publicKey,
              contract: contractPDA, config: configPDA,
              mint: mintPDA,
              escrowTokenAccount: escrowATA,
              contractorTokenAccount: contractorATA,
              clientTokenAccount: clientATA,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([aiAgentKp]).rpc();

          const clientBalAfter = await getTokenBalance(connection, clientATA);
          assert.equal(clientBalAfter - clientBalBefore, USDC(10).toNumber(), "client dapat full 10 USDC (bukan 7)");
        });
      });
    });

    describe("MED-NEW-02 — claimCheckpoint bekerja dengan dispute_window_days=0", () => {
      const clientKp = Keypair.generate();
      const contractorKp = Keypair.generate();
      const createdAt = new BN(NOW + 1700);
      let contractPDA: PublicKey;
      let escrowATA: PublicKey;
      let clientATA: PublicKey;
      let contractorATA: PublicKey;

      before(async () => {
        await airdrop(connection, clientKp.publicKey, 5);
        await airdrop(connection, contractorKp.publicKey, 2);
        await mintUsdcTo(clientKp);
        await mintUsdcTo(contractorKp);

        [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
        escrowATA = await getEscrowATA(mintPDA, contractPDA);
        clientATA = await getUserATA(mintPDA, clientKp.publicKey);
        contractorATA = await getUserATA(mintPDA, contractorKp.publicKey);

        // dispute_window_days=0: contractor bisa claim tepat setelah submit
        await program.methods.createContract(
          createdAt, "hash_claimwin_contract_12345a", "hash_claimwin_ai_abcdefg1234", USDC(3),
          10, 500, 0, 3, 1,
          [{ descriptionHash: "cp_claimwin_12345678abcdefgh1", paymentAmount: USDC(3), deadline: new BN(NOW + 30 * DAY) }]
        ).accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey, contract: contractPDA,
          mint: mintPDA, escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).signers([clientKp]).rpc();

        await program.methods.acceptContract()
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();

        await program.methods.submitCheckpoint(0, "ev_claimwin_submit_123456789012")
          .accounts({ contractor: contractorKp.publicKey, contract: contractPDA })
          .signers([contractorKp]).rpc();

        // Tunggu agar blockchain clock maju melewati submitted_at
        await new Promise(r => setTimeout(r, 2000));
      });

      it("CLAIM-WINDOW-01 — claimCheckpoint berhasil dengan dispute_window=0 (fix >= bukan >)", async () => {
        const contractorBalBefore = await getTokenBalance(connection, contractorATA);

        await program.methods.claimCheckpoint(0)
          .accounts({
            contractor: contractorKp.publicKey, client: clientKp.publicKey,
            contract: contractPDA, mint: mintPDA,
            escrowTokenAccount: escrowATA,
            contractorTokenAccount: contractorATA,
            clientTokenAccount: clientATA,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([contractorKp]).rpc();

        const acc = await program.account.contractAccount.fetch(contractPDA);
        assert.equal(acc.checkpoints[0].status.approved !== undefined, true, "status harus Approved");
        assert.equal(acc.status.completed !== undefined, true, "kontrak harus Completed");

        const contractorBalAfter = await getTokenBalance(connection, contractorATA);
        assert.equal(contractorBalAfter - contractorBalBefore, USDC(3).toNumber(), "contractor dapat 3 USDC");
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // MED-R3-01 — created_at validation (bypass 365-day inactivity check)
  // ─────────────────────────────────────────────────────────────────────────
  describe("MED-R3-01 — created_at validation", () => {
    const clientKp = Keypair.generate();
    const contractorKp = Keypair.generate();
    let clientATA: PublicKey;

    before(async () => {
      await airdrop(connection, clientKp.publicKey, 5);
      await mintUsdcTo(clientKp);
      clientATA = await getUserATA(mintPDA, clientKp.publicKey);
    });

    it("CREATED-AT-01 — createContract fails when created_at is 400 days in the past", async () => {
      const createdAt = new BN(NOW - 400 * DAY);
      const [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
      const escrowATA = await getEscrowATA(mintPDA, contractPDA);

      try {
        await program.methods.createContract(
          createdAt, "hash_createdat_past_test_abcd", "hash_createdat_past_ai_abcde", USDC(1),
          0, 0, 0, 0, 3,
          [{ descriptionHash: "cp1_hash_abcdefghijklmnopqrstuv", paymentAmount: USDC(1), deadline: new BN(NOW + 9999) }]
        ).accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey,
          contract: contractPDA, mint: mintPDA,
          escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).signers([clientKp]).rpc();
        assert.fail("Seharusnya gagal dengan InvalidCreatedAt");
      } catch (err: any) {
        assert.include(err.message, "InvalidCreatedAt", `Expected InvalidCreatedAt, got: ${err.message}`);
      }
    });

    it("CREATED-AT-02 — createContract fails when created_at is 8 hours in the future", async () => {
      const createdAt = new BN(NOW + 8 * 3600);
      const [contractPDA] = getContractPDA(program, clientKp.publicKey, contractorKp.publicKey, createdAt);
      const escrowATA = await getEscrowATA(mintPDA, contractPDA);

      try {
        await program.methods.createContract(
          createdAt, "hash_createdat_future_testabcd", "hash_createdat_future_aiabcd", USDC(1),
          0, 0, 0, 0, 3,
          [{ descriptionHash: "cp1_hash_abcdefghijklmnopqrstuv", paymentAmount: USDC(1), deadline: new BN(NOW + 9999) }]
        ).accounts({
          client: clientKp.publicKey, contractor: contractorKp.publicKey,
          contract: contractPDA, mint: mintPDA,
          escrowTokenAccount: escrowATA, clientTokenAccount: clientATA,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        }).signers([clientKp]).rpc();
        assert.fail("Seharusnya gagal dengan InvalidCreatedAt");
      } catch (err: any) {
        assert.include(err.message, "InvalidCreatedAt", `Expected InvalidCreatedAt, got: ${err.message}`);
      }
    });
  });
});
