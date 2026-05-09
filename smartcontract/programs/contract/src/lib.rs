pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("2Htsz7Xf4YWZTc8tupBTgsFHwZNZDzi59FRr9AWmxdNq");

#[program]
pub mod contract {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        ai_agent: Pubkey,
    ) -> Result<()> {
        instructions::initialize_config::initialize_config(ctx, ai_agent)
    }

    pub fn create_mock_mint(ctx: Context<CreateMockMint>) -> Result<()> {
        instructions::create_mock_mint::create_mock_mint(ctx)
    }

    pub fn mint_usdc(ctx: Context<MintUsdc>) -> Result<()> {
        instructions::mint_usdc::mint_usdc(ctx)
    }

    pub fn create_contract(
        ctx: Context<CreateContract>,
        created_at: i64,
        contract_hash: String,
        ai_review_hash: String,
        total_amount: u64,
        late_penalty_per_day_bps: u16,
        max_penalty_bps: u16,
        dispute_window_days: u8,
        grace_period_days: u8,
        max_revisions_per_checkpoint: u8,
        checkpoints: Vec<CheckpointInput>,
    ) -> Result<()> {
        instructions::create_contract::create_contract(
            ctx,
            created_at,
            contract_hash,
            ai_review_hash,
            total_amount,
            late_penalty_per_day_bps,
            max_penalty_bps,
            dispute_window_days,
            grace_period_days,
            max_revisions_per_checkpoint,
            checkpoints,
        )
    }

    pub fn accept_contract(ctx: Context<AcceptContract>) -> Result<()> {
        instructions::accept_contract::accept_contract(ctx)
    }

    pub fn submit_checkpoint(
        ctx: Context<SubmitCheckpoint>,
        checkpoint_index: u8,
        evidence_hash: String,
    ) -> Result<()> {
        instructions::submit_checkpoint::submit_checkpoint(ctx, checkpoint_index, evidence_hash)
    }

    pub fn approve_checkpoint(
        ctx: Context<ApproveCheckpoint>,
        checkpoint_index: u8,
        ai_report_hash: String,
    ) -> Result<()> {
        instructions::approve_checkpoint::approve_checkpoint(ctx, checkpoint_index, ai_report_hash)
    }

    pub fn claim_checkpoint(
        ctx: Context<ClaimCheckpoint>,
        checkpoint_index: u8,
    ) -> Result<()> {
        instructions::claim_checkpoint::claim_checkpoint(ctx, checkpoint_index)
    }

    pub fn request_revision(
        ctx: Context<RequestRevision>,
        checkpoint_index: u8,
        ai_report_hash: String,
    ) -> Result<()> {
        instructions::request_revision::request_revision(ctx, checkpoint_index, ai_report_hash)
    }

    pub fn request_extension(
        ctx: Context<RequestExtension>,
        checkpoint_index: u8,
        new_deadline: i64,
    ) -> Result<()> {
        instructions::request_extension::request_extension(ctx, checkpoint_index, new_deadline)
    }

    pub fn approve_extension(
        ctx: Context<ApproveExtension>,
        checkpoint_index: u8,
    ) -> Result<()> {
        instructions::approve_extension::approve_extension(ctx, checkpoint_index)
    }

    pub fn reject_extension(
        ctx: Context<RejectExtension>,
        checkpoint_index: u8,
    ) -> Result<()> {
        instructions::reject_extension::reject_extension(ctx, checkpoint_index)
    }

    pub fn expire_checkpoint(
        ctx: Context<ExpireCheckpoint>,
        checkpoint_index: u8,
    ) -> Result<()> {
        instructions::expire_checkpoint::expire_checkpoint(ctx, checkpoint_index)
    }

    pub fn cancel_contract(ctx: Context<CancelContract>) -> Result<()> {
        instructions::cancel_contract::cancel_contract(ctx)
    }

    pub fn request_ai_review(
        ctx: Context<RequestAiReview>,
        checkpoint_index: u8,
    ) -> Result<()> {
        instructions::request_ai_review::request_ai_review(ctx, checkpoint_index)
    }

    pub fn admin_cancel(ctx: Context<AdminCancel>) -> Result<()> {
        instructions::admin_cancel::admin_cancel(ctx)
    }

    pub fn resolve_dispute(
        ctx: Context<ResolveDispute>,
        checkpoint_index: u8,
        favor_contractor: bool,
    ) -> Result<()> {
        instructions::resolve_dispute::resolve_dispute(ctx, checkpoint_index, favor_contractor)
    }
}
