use anchor_lang::prelude::*;

#[error_code]
pub enum ContractError {
    #[msg("Unauthorized: only the client can perform this action")]
    UnauthorizedClient,
    #[msg("Unauthorized: only the contractor can perform this action")]
    UnauthorizedContractor,
    #[msg("Invalid contract status for this action")]
    InvalidContractStatus,
    #[msg("Invalid checkpoint status for this action")]
    InvalidCheckpointStatus,
    #[msg("Checkpoint index is out of range")]
    InvalidCheckpointIndex,
    #[msg("Sum of checkpoint payment amounts must equal total_amount")]
    PaymentAmountMismatch,
    #[msg("Hash string cannot be empty")]
    EmptyHash,
    #[msg("Description hash cannot be empty")]
    EmptyDescriptionHash,
    #[msg("Checkpoint count must be between 1 and 10")]
    InvalidCheckpointCount,
    #[msg("Maximum revision count exceeded for this checkpoint")]
    MaxRevisionsExceeded,
    #[msg("New deadline must be after the current deadline")]
    InvalidDeadline,
    #[msg("Checkpoint deadline has not expired yet")]
    DeadlineNotExpired,
    #[msg("Dispute window has not expired yet — client still has time to review")]
    DisputeWindowNotExpired,
    #[msg("Checkpoint has already been submitted, cannot expire")]
    CheckpointAlreadySubmitted,
    #[msg("Insufficient funds in escrow token account")]
    InsufficientEscrowFunds,
    #[msg("Cannot cancel: there are checkpoints in Submitted status")]
    CannotCancelWithSubmittedCheckpoints,
    #[msg("Arithmetic overflow during penalty calculation")]
    ArithmeticOverflow,
    #[msg("Penalty BPS exceeds 10,000 (100%) — invalid configuration")]
    InvalidPenaltyConfig,
    #[msg("Client and contractor cannot be the same account")]
    InvalidContractParties,
    #[msg("Unauthorized: only the AI agent or admin can resolve disputes")]
    UnauthorizedResolver,
    #[msg("Checkpoint is not in Disputed status")]
    CheckpointNotDisputed,
    #[msg("Program config is already initialized")]
    ConfigAlreadyInitialized,
    #[msg("Mint cooldown not expired — you can only mint once per day")]
    MintCooldownNotExpired,
    #[msg("Invalid token account — mint or owner mismatch")]
    InvalidTokenAccount,
    #[msg("Mock USDC mint has not been created yet")]
    MintNotInitialized,
    #[msg("Unauthorized: only the admin can perform this action")]
    UnauthorizedAdmin,
    #[msg("Cannot cancel: there are checkpoints in Disputed status")]
    CannotCancelWithDisputedCheckpoints,
    #[msg("max_revisions_per_checkpoint cannot exceed 10")]
    MaxRevisionsTooHigh,
    #[msg("Mock USDC supply cap reached — no more tokens can be minted")]
    SupplyCapReached,
    #[msg("Contract has not been inactive long enough for admin cancellation")]
    InactivityPeriodNotReached,
    #[msg("Cannot cancel: there are checkpoints awaiting AI review")]
    CannotCancelWithAwaitingAiReview,
    #[msg("created_at must be within 5 minutes in the past or 1 hour in the future")]
    InvalidCreatedAt,
}
