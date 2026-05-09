use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum ContractStatus {
    Draft,
    Active,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum CheckpointStatus {
    Pending,
    ExtensionPending,
    Submitted,
    Approved,
    NeedsRevision,
    Expired,
    Disputed,
    AwaitingAiReview,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct CheckpointData {
    pub checkpoint_number: u8,
    #[max_len(64)]
    pub description_hash: String,
    #[max_len(64)]
    pub evidence_hash: String,
    #[max_len(64)]
    pub ai_report_hash: String,
    pub payment_amount: u64,
    pub penalty_amount: u64,
    pub effective_payment: u64,
    pub status: CheckpointStatus,
    pub deadline: i64,
    pub new_deadline_requested: i64,
    pub revision_count: u8,
    pub submitted_at: i64,
    pub reviewed_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CheckpointInput {
    pub description_hash: String,
    pub payment_amount: u64,
    pub deadline: i64,
}

#[account]
#[derive(InitSpace)]
pub struct ContractAccount {
    pub client: Pubkey,
    pub contractor: Pubkey,
    pub mint: Pubkey,
    #[max_len(64)]
    pub contract_hash: String,
    #[max_len(64)]
    pub ai_review_hash: String,
    pub total_amount: u64,
    pub total_checkpoints: u8,
    pub completed_checkpoints: u8,
    pub status: ContractStatus,
    pub created_at: i64,
    pub bump: u8,
    pub late_penalty_per_day_bps: u16,
    pub max_penalty_bps: u16,
    pub dispute_window_days: u8,
    pub grace_period_days: u8,
    pub max_revisions_per_checkpoint: u8,
    #[max_len(10)]
    pub checkpoints: Vec<CheckpointData>,
}

#[account]
#[derive(InitSpace)]
pub struct ProgramConfig {
    pub admin: Pubkey,
    pub ai_agent: Pubkey,
    pub mint: Pubkey,
    pub total_minted: u64,
    pub bump: u8,
}

// Tracks the last mint time per user — enforces 1-per-day cooldown
#[account]
#[derive(InitSpace)]
pub struct UserMintRecord {
    pub user: Pubkey,
    pub last_mint_at: i64,
    pub bump: u8,
}

impl ContractAccount {
    pub fn try_complete(&mut self) {
        let all_done = self.checkpoints.iter().all(|cp| {
            matches!(
                cp.status,
                CheckpointStatus::Approved | CheckpointStatus::Expired
            )
        });
        if all_done && self.status == ContractStatus::Active {
            self.status = ContractStatus::Completed;
        }
    }
}
