use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::state::*;
use crate::error::ContractError;
use crate::constants::USDC_DECIMALS;

#[derive(Accounts)]
pub struct CancelContract<'info> {
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

pub fn cancel_contract(ctx: Context<CancelContract>) -> Result<()> {
    require!(
        ctx.accounts.contract.client == ctx.accounts.client.key(),
        ContractError::UnauthorizedClient
    );
    require!(
        matches!(
            ctx.accounts.contract.status,
            ContractStatus::Draft | ContractStatus::Active
        ),
        ContractError::InvalidContractStatus
    );

    let has_submitted = ctx.accounts.contract.checkpoints.iter().any(|cp| {
        cp.status == CheckpointStatus::Submitted
    });
    require!(!has_submitted, ContractError::CannotCancelWithSubmittedCheckpoints);

    let has_disputed = ctx.accounts.contract.checkpoints.iter().any(|cp| {
        cp.status == CheckpointStatus::Disputed
    });
    require!(!has_disputed, ContractError::CannotCancelWithDisputedCheckpoints);

    let has_awaiting_review = ctx.accounts.contract.checkpoints.iter().any(|cp| {
        cp.status == CheckpointStatus::AwaitingAiReview
    });
    require!(!has_awaiting_review, ContractError::CannotCancelWithAwaitingAiReview);

    let refund_amount: u64 = ctx.accounts.contract
        .checkpoints
        .iter()
        .filter(|cp| matches!(
            cp.status,
            CheckpointStatus::Pending
            | CheckpointStatus::ExtensionPending
            | CheckpointStatus::NeedsRevision
        ))
        .map(|cp| cp.payment_amount)
        .try_fold(0u64, |acc, x| acc.checked_add(x))
        .ok_or(ContractError::ArithmeticOverflow)?;

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
