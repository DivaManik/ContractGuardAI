use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ContractError;

#[derive(Accounts)]
pub struct RequestRevision<'info> {
    #[account(mut)]
    pub client: Signer<'info>,
    /// CHECK: contractor pubkey validated against contract.contractor
    pub contractor: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [
            b"contract",
            client.key().as_ref(),
            contractor.key().as_ref(),
            &contract.created_at.to_le_bytes(),
        ],
        bump = contract.bump,
    )]
    pub contract: Account<'info, ContractAccount>,
}

pub fn request_revision(
    ctx: Context<RequestRevision>,
    checkpoint_index: u8,
    ai_report_hash: String,
) -> Result<()> {
    require!(
        ctx.accounts.contract.client == ctx.accounts.client.key(),
        ContractError::UnauthorizedClient
    );
    require!(
        ctx.accounts.contract.status == ContractStatus::Active,
        ContractError::InvalidContractStatus
    );
    require!(!ai_report_hash.is_empty(), ContractError::EmptyHash);

    let idx = checkpoint_index as usize;
    require!(idx < ctx.accounts.contract.checkpoints.len(), ContractError::InvalidCheckpointIndex);
    require!(
        ctx.accounts.contract.checkpoints[idx].status == CheckpointStatus::Submitted,
        ContractError::InvalidCheckpointStatus
    );
    require!(
        ctx.accounts.contract.checkpoints[idx].revision_count
            < ctx.accounts.contract.max_revisions_per_checkpoint,
        ContractError::MaxRevisionsExceeded
    );

    // Collect values before mutable borrow to avoid borrow conflict
    let max_revisions = ctx.accounts.contract.max_revisions_per_checkpoint;
    let now = Clock::get()?.unix_timestamp;

    let contract = &mut ctx.accounts.contract;
    let cp = &mut contract.checkpoints[idx];
    cp.ai_report_hash = ai_report_hash;
    cp.revision_count += 1;
    cp.reviewed_at = now;

    // If revision count maxed out, mark as Disputed
    if cp.revision_count >= max_revisions {
        cp.status = CheckpointStatus::Disputed;
    } else {
        cp.status = CheckpointStatus::NeedsRevision;
    }

    Ok(())
}
