use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::ContractError;

#[derive(Accounts)]
pub struct AcceptContract<'info> {
    #[account(mut)]
    pub contractor: Signer<'info>,
    #[account(
        mut,
        seeds = [
            b"contract",
            contract.client.as_ref(),
            contractor.key().as_ref(),
            &contract.created_at.to_le_bytes(),
        ],
        bump = contract.bump,
    )]
    pub contract: Account<'info, ContractAccount>,
}

pub fn accept_contract(ctx: Context<AcceptContract>) -> Result<()> {
    let contract = &mut ctx.accounts.contract;

    require!(
        contract.contractor == ctx.accounts.contractor.key(),
        ContractError::UnauthorizedContractor
    );
    require!(
        contract.status == ContractStatus::Draft,
        ContractError::InvalidContractStatus
    );

    contract.status = ContractStatus::Active;

    Ok(())
}
