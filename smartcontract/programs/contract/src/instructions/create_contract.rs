use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};
use crate::state::*;
use crate::error::ContractError;
use crate::constants::{USDC_DECIMALS, MAX_REVISIONS_ALLOWED, MAX_CREATED_AT_PAST_SECS, MAX_CREATED_AT_FUTURE_SECS};

#[derive(Accounts)]
#[instruction(created_at: i64)]
pub struct CreateContract<'info> {
    #[account(mut)]
    pub client: Signer<'info>,
    /// CHECK: contractor pubkey stored as reference only
    pub contractor: UncheckedAccount<'info>,
    #[account(
        init,
        payer = client,
        space = 8 + ContractAccount::INIT_SPACE,
        seeds = [
            b"contract",
            client.key().as_ref(),
            contractor.key().as_ref(),
            &created_at.to_le_bytes(),
        ],
        bump,
    )]
    pub contract: Account<'info, ContractAccount>,
    #[account(
        mint::token_program = token_program,
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = client,
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
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
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
    require!(
        ctx.accounts.client.key() != ctx.accounts.contractor.key(),
        ContractError::InvalidContractParties
    );

    let now = Clock::get()?.unix_timestamp;
    let earliest = now
        .checked_sub(MAX_CREATED_AT_PAST_SECS)
        .ok_or(ContractError::ArithmeticOverflow)?;
    let latest = now
        .checked_add(MAX_CREATED_AT_FUTURE_SECS)
        .ok_or(ContractError::ArithmeticOverflow)?;
    require!(
        created_at >= earliest && created_at <= latest,
        ContractError::InvalidCreatedAt
    );

    require!(!contract_hash.is_empty(), ContractError::EmptyHash);
    require!(!ai_review_hash.is_empty(), ContractError::EmptyHash);
    require!(
        !checkpoints.is_empty() && checkpoints.len() <= 10,
        ContractError::InvalidCheckpointCount
    );
    require!(max_penalty_bps <= 10_000, ContractError::InvalidPenaltyConfig);
    require!(late_penalty_per_day_bps <= 10_000, ContractError::InvalidPenaltyConfig);
    require!(
        max_revisions_per_checkpoint <= MAX_REVISIONS_ALLOWED,
        ContractError::MaxRevisionsTooHigh
    );

    for cp in &checkpoints {
        require!(!cp.description_hash.is_empty(), ContractError::EmptyDescriptionHash);
    }

    let total_payment: u64 = checkpoints
        .iter()
        .map(|c| c.payment_amount)
        .try_fold(0u64, |acc, x| acc.checked_add(x))
        .ok_or(ContractError::ArithmeticOverflow)?;

    require!(total_payment == total_amount, ContractError::PaymentAmountMismatch);

    token_interface::transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.client_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.escrow_token_account.to_account_info(),
                authority: ctx.accounts.client.to_account_info(),
            },
        ),
        total_amount,
        USDC_DECIMALS,
    )?;

    let contract = &mut ctx.accounts.contract;
    contract.client = ctx.accounts.client.key();
    contract.contractor = ctx.accounts.contractor.key();
    contract.mint = ctx.accounts.mint.key();
    contract.contract_hash = contract_hash;
    contract.ai_review_hash = ai_review_hash;
    contract.total_amount = total_amount;
    contract.total_checkpoints = checkpoints.len() as u8;
    contract.completed_checkpoints = 0;
    contract.status = ContractStatus::Draft;
    contract.created_at = created_at;
    contract.bump = ctx.bumps.contract;
    contract.late_penalty_per_day_bps = late_penalty_per_day_bps;
    contract.max_penalty_bps = max_penalty_bps;
    contract.dispute_window_days = dispute_window_days;
    contract.grace_period_days = grace_period_days;
    contract.max_revisions_per_checkpoint = max_revisions_per_checkpoint;

    contract.checkpoints = checkpoints
        .into_iter()
        .enumerate()
        .map(|(i, cp)| CheckpointData {
            checkpoint_number: (i + 1) as u8,
            description_hash: cp.description_hash,
            evidence_hash: String::new(),
            ai_report_hash: String::new(),
            payment_amount: cp.payment_amount,
            penalty_amount: 0,
            effective_payment: 0,
            status: CheckpointStatus::Pending,
            deadline: cp.deadline,
            new_deadline_requested: 0,
            revision_count: 0,
            submitted_at: 0,
            reviewed_at: 0,
        })
        .collect();

    Ok(())
}
