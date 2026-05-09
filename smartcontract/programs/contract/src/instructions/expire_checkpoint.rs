use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::state::*;
use crate::error::ContractError;
use crate::constants::USDC_DECIMALS;

#[derive(Accounts)]
pub struct ExpireCheckpoint<'info> {
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
    #[account(address = contract.mint, mint::token_program = token_program)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = contract,
        associated_token::token_program = token_program,
    )]
    pub escrow_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = client,
        associated_token::token_program = token_program,
    )]
    pub client_token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn expire_checkpoint(
    ctx: Context<ExpireCheckpoint>,
    checkpoint_index: u8,
) -> Result<()> {
    require!(
        ctx.accounts.contract.client == ctx.accounts.client.key(),
        ContractError::UnauthorizedClient
    );
    require!(
        ctx.accounts.contract.status == ContractStatus::Active,
        ContractError::InvalidContractStatus
    );

    let idx = checkpoint_index as usize;
    require!(idx < ctx.accounts.contract.checkpoints.len(), ContractError::InvalidCheckpointIndex);

    let valid_status = matches!(
        ctx.accounts.contract.checkpoints[idx].status,
        CheckpointStatus::Pending
        | CheckpointStatus::ExtensionPending
        | CheckpointStatus::NeedsRevision
    );
    require!(valid_status, ContractError::CheckpointAlreadySubmitted);

    let now = Clock::get()?.unix_timestamp;
    let deadline = ctx.accounts.contract.checkpoints[idx].deadline;
    let grace_secs = (ctx.accounts.contract.grace_period_days as i64) * 86_400;
    let expiry = deadline
        .checked_add(grace_secs)
        .ok_or(ContractError::ArithmeticOverflow)?;
    require!(now > expiry, ContractError::DeadlineNotExpired);

    let payment_amount = ctx.accounts.contract.checkpoints[idx].payment_amount;

    let client_key = ctx.accounts.contract.client;
    let contractor_key = ctx.accounts.contract.contractor;
    let created_at_bytes = ctx.accounts.contract.created_at.to_le_bytes();
    let bump = ctx.accounts.contract.bump;
    let seeds = &[
        b"contract".as_ref(),
        client_key.as_ref(),
        contractor_key.as_ref(),
        created_at_bytes.as_ref(),
        std::slice::from_ref(&bump),
    ];
    let signer_seeds = &[&seeds[..]];

    {
        let contract = &mut ctx.accounts.contract;
        contract.checkpoints[idx].status = CheckpointStatus::Expired;
        contract.completed_checkpoints += 1;
        contract.try_complete();
    }

    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.client_token_account.to_account_info(),
                authority: ctx.accounts.contract.to_account_info(),
            },
            signer_seeds,
        ),
        payment_amount,
        USDC_DECIMALS,
    )?;

    Ok(())
}
