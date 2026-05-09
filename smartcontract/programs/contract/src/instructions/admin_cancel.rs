use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::state::*;
use crate::error::ContractError;
use crate::constants::{USDC_DECIMALS, INACTIVITY_TIMEOUT_SECS};

#[derive(Accounts)]
pub struct AdminCancel<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: client wallet — validated against contract.client
    pub client: UncheckedAccount<'info>,
    /// CHECK: contractor wallet — validated against contract.contractor
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
    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,
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

pub fn admin_cancel(ctx: Context<AdminCancel>) -> Result<()> {
    require!(
        ctx.accounts.admin.key() == ctx.accounts.config.admin,
        ContractError::UnauthorizedAdmin
    );
    require!(
        ctx.accounts.contract.client == ctx.accounts.client.key(),
        ContractError::UnauthorizedClient
    );
    require!(
        ctx.accounts.contract.contractor == ctx.accounts.contractor.key(),
        ContractError::UnauthorizedContractor
    );
    require!(
        ctx.accounts.contract.status == ContractStatus::Active,
        ContractError::InvalidContractStatus
    );

    let now = Clock::get()?.unix_timestamp;
    require!(
        now > ctx.accounts.contract.created_at
            .checked_add(INACTIVITY_TIMEOUT_SECS)
            .ok_or(ContractError::ArithmeticOverflow)?,
        ContractError::InactivityPeriodNotReached
    );

    // Transfer full remaining escrow to client (safe default: no proof of completion, funds return to payer)
    let refund_amount = ctx.accounts.escrow_token_account.amount;

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

    ctx.accounts.contract.status = ContractStatus::Cancelled;

    if refund_amount > 0 {
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
            refund_amount,
            USDC_DECIMALS,
        )?;
    }

    Ok(())
}
