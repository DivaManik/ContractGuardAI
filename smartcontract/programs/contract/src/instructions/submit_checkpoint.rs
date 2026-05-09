use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ContractError;

#[derive(Accounts)]
pub struct SubmitCheckpoint<'info> {
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

pub fn submit_checkpoint(
    ctx: Context<SubmitCheckpoint>,
    checkpoint_index: u8,
    evidence_hash: String,
) -> Result<()> {
    let contract = &mut ctx.accounts.contract;

    require!(
        contract.contractor == ctx.accounts.contractor.key(),
        ContractError::UnauthorizedContractor
    );
    require!(
        contract.status == ContractStatus::Active,
        ContractError::InvalidContractStatus
    );
    require!(!evidence_hash.is_empty(), ContractError::EmptyHash);

    let idx = checkpoint_index as usize;
    require!(idx < contract.checkpoints.len(), ContractError::InvalidCheckpointIndex);

    let valid_status = matches!(
        contract.checkpoints[idx].status,
        CheckpointStatus::Pending | CheckpointStatus::NeedsRevision | CheckpointStatus::ExtensionPending
    );
    require!(valid_status, ContractError::InvalidCheckpointStatus);

    let now = Clock::get()?.unix_timestamp;
    let payment_amount = contract.checkpoints[idx].payment_amount;
    let deadline = contract.checkpoints[idx].deadline;
    let penalty_per_day_bps = contract.late_penalty_per_day_bps as u64;
    let max_penalty_bps = contract.max_penalty_bps as u64;

    // Calculate late penalty automatically
    let (penalty_amount, effective_payment) = if now > deadline {
        let days_late = (now - deadline)
            .checked_div(86400)
            .ok_or(ContractError::ArithmeticOverflow)? as u64;
        let raw_penalty = payment_amount
            .checked_mul(penalty_per_day_bps)
            .ok_or(ContractError::ArithmeticOverflow)?
            .checked_mul(days_late)
            .ok_or(ContractError::ArithmeticOverflow)?
            .checked_div(10_000)
            .ok_or(ContractError::ArithmeticOverflow)?;
        let max_penalty = payment_amount
            .checked_mul(max_penalty_bps)
            .ok_or(ContractError::ArithmeticOverflow)?
            .checked_div(10_000)
            .ok_or(ContractError::ArithmeticOverflow)?;
        let penalty = raw_penalty.min(max_penalty);
        let effective = payment_amount
            .checked_sub(penalty)
            .ok_or(ContractError::ArithmeticOverflow)?;
        (penalty, effective)
    } else {
        (0, payment_amount)
    };

    let cp = &mut contract.checkpoints[idx];
    cp.evidence_hash = evidence_hash;
    cp.penalty_amount = penalty_amount;
    cp.effective_payment = effective_payment;
    cp.status = CheckpointStatus::Submitted;
    cp.submitted_at = now;

    Ok(())
}
