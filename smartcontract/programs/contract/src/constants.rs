pub const USDC_DECIMALS: u8 = 6;
pub const MAX_REVISIONS_ALLOWED: u8 = 10;
pub const MAX_USDC_SUPPLY: u64 = 10_000_000 * 1_000_000; // 10 million USDC (6 decimals)
pub const INACTIVITY_TIMEOUT_SECS: i64 = 365 * 86_400;   // 1 year
pub const MAX_CREATED_AT_PAST_SECS: i64 = 300;            // created_at can be at most 5 min in the past
pub const MAX_CREATED_AT_FUTURE_SECS: i64 = 3_600;        // created_at can be at most 1 hour in the future
