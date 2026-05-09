use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ContractError;

#[derive(Accounts)]
pub struct RejectExtension<'info> {
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

pub fn reject_extension(
    ctx: Context<RejectExtension>,
    checkpoint_index: u8,
) -> Result<()> {
    let contract = &mut ctx.accounts.contract;

    require!(
        contract.client == ctx.accounts.client.key(),
        ContractError::UnauthorizedClient
    );
    require!(
        contract.status == ContractStatus::Active,
        ContractError::InvalidContractStatus
    );

    let idx = checkpoint_index as usize;
    require!(idx < contract.checkpoints.len(), ContractError::InvalidCheckpointIndex);
    require!(
        contract.checkpoints[idx].status == CheckpointStatus::ExtensionPending,
        ContractError::InvalidCheckpointStatus
    );

    let cp = &mut contract.checkpoints[idx];
    // Reject extension, original deadline stands, late penalty still applies
    cp.new_deadline_requested = 0;
    cp.status = CheckpointStatus::Pending;

    Ok(())
}
