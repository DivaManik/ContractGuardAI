use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ContractError;

#[derive(Accounts)]
pub struct RequestExtension<'info> {
    #[account(mut)]
    pub contractor: Signer<'info>,
    /// CHECK: client pubkey validated against contract.client
    pub client: UncheckedAccount<'info>,
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

pub fn request_extension(
    ctx: Context<RequestExtension>,
    checkpoint_index: u8,
    new_deadline: i64,
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

    let idx = checkpoint_index as usize;
    require!(idx < contract.checkpoints.len(), ContractError::InvalidCheckpointIndex);

    let valid_status = matches!(
        contract.checkpoints[idx].status,
        CheckpointStatus::Pending | CheckpointStatus::NeedsRevision
    );
    require!(valid_status, ContractError::InvalidCheckpointStatus);

    require!(
        new_deadline > contract.checkpoints[idx].deadline,
        ContractError::InvalidDeadline
    );

    let cp = &mut contract.checkpoints[idx];
    cp.new_deadline_requested = new_deadline;
    cp.status = CheckpointStatus::ExtensionPending;

    Ok(())
}
