use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ContractError;

#[derive(Accounts)]
pub struct RequestAiReview<'info> {
    #[account(mut)]
    pub contractor: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"contract",
            contract.client.as_ref(),
            contractor.key().as_ref(),
            &contract.created_at.to_le_bytes(),
        ],
        bump = contract.bump,
    )]
    pub contract: Account<'info, ContractAccount>,
}

pub fn request_ai_review(
    ctx: Context<RequestAiReview>,
    checkpoint_index: u8,
) -> Result<()> {
    require!(
        ctx.accounts.contract.contractor == ctx.accounts.contractor.key(),
        ContractError::UnauthorizedContractor
    );
    require!(
        ctx.accounts.contract.status == ContractStatus::Active,
        ContractError::InvalidContractStatus
    );

    let idx = checkpoint_index as usize;
    require!(idx < ctx.accounts.contract.checkpoints.len(), ContractError::InvalidCheckpointIndex);
    require!(
        ctx.accounts.contract.checkpoints[idx].status == CheckpointStatus::Submitted,
        ContractError::InvalidCheckpointStatus
    );

    let now = Clock::get()?.unix_timestamp;
    let dispute_window_secs = (ctx.accounts.contract.dispute_window_days as i64) * 86_400;
    let submitted_at = ctx.accounts.contract.checkpoints[idx].submitted_at;
    require!(
        now >= submitted_at + dispute_window_secs,
        ContractError::DisputeWindowNotExpired
    );

    ctx.accounts.contract.checkpoints[idx].status = CheckpointStatus::AwaitingAiReview;

    Ok(())
}
