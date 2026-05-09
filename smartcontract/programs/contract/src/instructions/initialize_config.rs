use anchor_lang::prelude::*;
use crate::state::ProgramConfig;
use crate::error::ContractError;

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + ProgramConfig::INIT_SPACE,
        seeds = [b"config"],
        bump,
    )]
    pub config: Account<'info, ProgramConfig>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_config(
    ctx: Context<InitializeConfig>,
    ai_agent: Pubkey,
) -> Result<()> {
    require!(
        ctx.accounts.admin.key() != ai_agent,
        ContractError::InvalidContractParties
    );

    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.admin.key();
    config.ai_agent = ai_agent;
    config.bump = ctx.bumps.config;

    Ok(())
}
