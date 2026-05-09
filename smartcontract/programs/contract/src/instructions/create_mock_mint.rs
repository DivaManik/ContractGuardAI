use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface};
use crate::state::ProgramConfig;
use crate::error::ContractError;

#[derive(Accounts)]
pub struct CreateMockMint<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProgramConfig>,
    #[account(
        init,
        payer = admin,
        seeds = [b"usdc_mint"],
        bump,
        mint::decimals = 6,
        mint::authority = config,
        mint::freeze_authority = config,
        mint::token_program = token_program,
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn create_mock_mint(ctx: Context<CreateMockMint>) -> Result<()> {
    require!(
        ctx.accounts.admin.key() == ctx.accounts.config.admin,
        ContractError::UnauthorizedAdmin
    );
    require!(
        ctx.accounts.config.mint == Pubkey::default(),
        ContractError::ConfigAlreadyInitialized
    );

    ctx.accounts.config.mint = ctx.accounts.mint.key();

    Ok(())
}
