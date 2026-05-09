use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{self, Mint, MintTo, TokenAccount, TokenInterface};
use crate::state::{ProgramConfig, UserMintRecord};
use crate::error::ContractError;
use crate::constants::MAX_USDC_SUPPLY;

pub const MINT_AMOUNT: u64 = 1_000 * 1_000_000; // 1000 USDC (6 decimals)
pub const MINT_COOLDOWN_SECS: i64 = 86_400;      // 24 hours

#[derive(Accounts)]
pub struct MintUsdc<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,
    #[account(
        mut,
        seeds = [b"usdc_mint"],
        bump,
        mint::authority = config,
        mint::token_program = token_program,
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
        associated_token::token_program = token_program,
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserMintRecord::INIT_SPACE,
        seeds = [b"mint_record", user.key().as_ref()],
        bump,
    )]
    pub mint_record: Account<'info, UserMintRecord>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn mint_usdc(ctx: Context<MintUsdc>) -> Result<()> {
    require!(
        ctx.accounts.config.mint != Pubkey::default(),
        ContractError::MintNotInitialized
    );
    require!(
        ctx.accounts.config.mint == ctx.accounts.mint.key(),
        ContractError::InvalidTokenAccount
    );

    let now = Clock::get()?.unix_timestamp;

    // Re-initialization guard: if record already belongs to a different user, reject
    if ctx.accounts.mint_record.user != Pubkey::default() {
        require!(
            ctx.accounts.mint_record.user == ctx.accounts.user.key(),
            ContractError::UnauthorizedAdmin
        );
    }

    if ctx.accounts.mint_record.last_mint_at > 0 {
        let elapsed = now
            .checked_sub(ctx.accounts.mint_record.last_mint_at)
            .ok_or(ContractError::ArithmeticOverflow)?;
        require!(elapsed >= MINT_COOLDOWN_SECS, ContractError::MintCooldownNotExpired);
    }

    // Supply cap check
    let new_total = ctx.accounts.config.total_minted
        .checked_add(MINT_AMOUNT)
        .ok_or(ContractError::ArithmeticOverflow)?;
    require!(new_total <= MAX_USDC_SUPPLY, ContractError::SupplyCapReached);
    ctx.accounts.config.total_minted = new_total;

    ctx.accounts.mint_record.user = ctx.accounts.user.key();
    ctx.accounts.mint_record.last_mint_at = now;
    ctx.accounts.mint_record.bump = ctx.bumps.mint_record;

    let seeds = &[b"config".as_ref(), &[ctx.accounts.config.bump]];
    let signer_seeds = &[&seeds[..]];

    token_interface::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            signer_seeds,
        ),
        MINT_AMOUNT,
    )?;

    Ok(())
}
