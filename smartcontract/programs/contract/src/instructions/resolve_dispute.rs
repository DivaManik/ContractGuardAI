use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::state::*;
use crate::error::ContractError;
use crate::constants::USDC_DECIMALS;

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    #[account(mut)]
    pub resolver: Signer<'info>,
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
    pub contract: Box<Account<'info, ContractAccount>>,
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
        associated_token::authority = contractor,
        associated_token::token_program = token_program,
    )]
    pub contractor_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = client,
        associated_token::token_program = token_program,
    )]
    pub client_token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn resolve_dispute(
    ctx: Context<ResolveDispute>,
    checkpoint_index: u8,
    favor_contractor: bool,
) -> Result<()> {
    require!(
        ctx.accounts.resolver.key() == ctx.accounts.config.ai_agent
            || ctx.accounts.resolver.key() == ctx.accounts.config.admin,
        ContractError::UnauthorizedResolver
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

    let idx = checkpoint_index as usize;
    require!(idx < ctx.accounts.contract.checkpoints.len(), ContractError::InvalidCheckpointIndex);
    require!(
        ctx.accounts.contract.checkpoints[idx].status == CheckpointStatus::Disputed
            || ctx.accounts.contract.checkpoints[idx].status == CheckpointStatus::AwaitingAiReview,
        ContractError::CheckpointNotDisputed
    );

    // Use values calculated at submitCheckpoint (late penalty already applied)
    let payment_amount    = ctx.accounts.contract.checkpoints[idx].payment_amount;
    let effective_payment = ctx.accounts.contract.checkpoints[idx].effective_payment;
    let penalty_amount    = ctx.accounts.contract.checkpoints[idx].penalty_amount;
    let now = Clock::get()?.unix_timestamp;

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
        let cp = &mut contract.checkpoints[idx];
        cp.reviewed_at = now;

        if favor_contractor {
            cp.status = CheckpointStatus::Approved;
            // Preserve effective_payment & penalty_amount from submit — late penalty still applies
        } else {
            cp.status = CheckpointStatus::Expired;
            cp.effective_payment = 0;
            cp.penalty_amount = 0;
        }

        contract.completed_checkpoints += 1;
        contract.try_complete();
    }

    if favor_contractor {
        // Contractor receives payment per penalty calculation at submit time
        if effective_payment > 0 {
            token_interface::transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.key(),
                    TransferChecked {
                        from: ctx.accounts.escrow_token_account.to_account_info(),
                        mint: ctx.accounts.mint.to_account_info(),
                        to: ctx.accounts.contractor_token_account.to_account_info(),
                        authority: ctx.accounts.contract.to_account_info(),
                    },
                    signer_seeds,
                ),
                effective_payment,
                USDC_DECIMALS,
            )?;
        }
        // Late penalty (if any) refunded to client
        if penalty_amount > 0 {
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
                penalty_amount,
                USDC_DECIMALS,
            )?;
        }
    } else {
        // Client receives full refund — no penalty charged if AI rules work invalid
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
    }

    Ok(())
}
