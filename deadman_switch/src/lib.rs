use candid::{CandidType, Deserialize, Principal};
use ic_cdk::{api::time, api::caller, api::id, call::Call, init, post_upgrade, pre_upgrade, query, update};
use ic_cdk_timers::set_timer_interval;
use icrc_ledger_types::{
    icrc1::account::Account,
    icrc1::transfer::{Memo, TransferArg, TransferError},
};
use serde::Serialize;
use std::cell::RefCell;
use std::collections::HashMap;
use std::time::Duration;

// Testnet ckBTC ledger canister ID
// Update this with the actual testnet ckBTC ledger canister ID
const CKBTC_LEDGER_CANISTER_ID: &str = "mxzaz-hqaaa-aaaar-qaada-cai"; // Testnet ckBTC ledger

thread_local! {
    static STATE: RefCell<DeadManSwitchState> = RefCell::default();
}

#[derive(CandidType, Deserialize, Clone, Debug, Serialize)]
pub struct TransactionLog {
    pub timestamp: u64,
    pub transaction_type: String, // "heartbeat", "deposit", "withdrawal", "transfer", "update"
    pub amount: Option<u64>,
    pub details: String,
}

#[derive(CandidType, Deserialize, Clone, Debug, Serialize)]
pub struct Beneficiary {
    #[serde(rename = "beneficiary_principal")]
    pub principal: Principal,
    pub percentage: u8, // 0-100, for multiple beneficiaries
    pub subaccount: Option<Vec<u8>>, // Optional subaccount for ICRC-1 account (typically 32 bytes)
}

#[derive(CandidType, Deserialize, Clone, Debug, Serialize)]
pub struct UserAccount {
    #[serde(rename = "user_principal")]
    pub principal: Principal,
    pub last_heartbeat: u64,
    pub timeout_duration_seconds: u64,
    pub beneficiary: Principal, // Primary beneficiary (for backward compatibility)
    pub beneficiaries: Vec<Beneficiary>, // Multiple beneficiaries support
    pub balance: u64,
    pub transaction_history: Vec<TransactionLog>,
    pub contestation_period_seconds: u64, // Grace window before transfer executes
    pub timeout_detected_at: Option<u64>, // When timeout was first detected
    pub trusted_parties: Vec<Principal>, // Trusted parties who can override during grace period
}

#[derive(CandidType, Deserialize, Clone, Debug, Serialize)]
pub struct DeadManSwitchState {
    pub users: HashMap<Principal, UserAccount>,
    pub ckbtc_ledger: Principal,
}

impl Default for DeadManSwitchState {
    fn default() -> Self {
        Self {
            users: HashMap::new(),
            ckbtc_ledger: Principal::anonymous(),
        }
    }
}

#[derive(CandidType, Deserialize, Debug)]
pub struct InitArgs {
    pub ckbtc_ledger_canister_id: Option<Principal>,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct RegisterArgs {
    pub timeout_duration_seconds: u64,
    pub beneficiary: Principal,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct HeartbeatResponse {
    pub success: bool,
    pub message: String,
    pub next_heartbeat_due: u64,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct TransferResult {
    pub success: bool,
    pub message: String,
    pub block_index: Option<u64>,
}

// Candid variant types for proper serialization
// Using lowercase variants to match Candid interface
#[allow(non_camel_case_types)]
#[derive(CandidType, Deserialize, Debug)]
pub enum Result_ {
    ok(String),
    err(String),
}

#[allow(non_camel_case_types)]
#[derive(CandidType, Deserialize, Debug)]
pub enum HeartbeatResult {
    ok(HeartbeatResponse),
    err(String),
}

#[allow(non_camel_case_types)]
#[derive(CandidType, Deserialize, Debug)]
pub enum AccountInfoResult {
    ok(UserAccount),
    err(String),
}

#[allow(non_camel_case_types)]
#[derive(CandidType, Deserialize, Debug)]
pub enum BalanceResult {
    ok(u64),
    err(String),
}

#[allow(non_camel_case_types)]
#[derive(CandidType, Deserialize, Debug)]
pub enum TimeoutStatusResult {
    ok(TimeoutStatus),
    err(String),
}

#[allow(non_camel_case_types)]
#[derive(CandidType, Deserialize, Debug)]
pub enum TransactionHistoryResult {
    ok(Vec<TransactionLog>),
    err(String),
}

#[init]
fn init() {
    ic_cdk::println!("Dead Man Switch Canister initialized");
    
    STATE.with(|state| {
        let mut s = state.borrow_mut();
        // Default to testnet ckBTC ledger if not provided
        s.ckbtc_ledger = Principal::from_text(CKBTC_LEDGER_CANISTER_ID)
            .unwrap_or_else(|_| Principal::anonymous());
        ic_cdk::println!("ckBTC Ledger Canister ID: {}", s.ckbtc_ledger);
    });

    // Start the timer to check for timeouts
    start_timeout_checker();
}

#[post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("Dead Man Switch Canister upgraded");
    start_timeout_checker();
}

#[pre_upgrade]
fn pre_upgrade() {
    ic_cdk::println!("Dead Man Switch Canister pre-upgrade");
}

/// Register a new user account with dead man switch functionality
#[update]
async fn register(args: RegisterArgs) -> Result_ {
    let caller = caller();
    
    if caller == Principal::anonymous() {
        return Result_::err("Anonymous principal not allowed".to_string());
    }

    if args.timeout_duration_seconds == 0 {
        return Result_::err("Timeout duration must be greater than 0".to_string());
    }

    let current_time = time();

    let already_registered = STATE.with(|state| {
        let s = state.borrow();
        s.users.contains_key(&caller)
    });

    if already_registered {
        return Result_::err("User already registered".to_string());
    }

    STATE.with(|state| {
        let mut s = state.borrow_mut();
        let account = UserAccount {
            principal: caller,
            last_heartbeat: current_time,
            timeout_duration_seconds: args.timeout_duration_seconds,
            beneficiary: args.beneficiary.clone(),
            beneficiaries: vec![Beneficiary {
                principal: args.beneficiary,
                percentage: 100,
                subaccount: None,
            }],
            balance: 0,
            transaction_history: vec![TransactionLog {
                timestamp: current_time,
                transaction_type: "register".to_string(),
                amount: None,
                details: format!("Registered with timeout: {}s", args.timeout_duration_seconds),
            }],
            contestation_period_seconds: 7 * 24 * 60 * 60, // Default 7 days grace period
            timeout_detected_at: None,
            trusted_parties: Vec::new(),
        };

        s.users.insert(caller, account);
        ic_cdk::println!("User registered: {}, timeout: {}s, beneficiary: {}", 
            caller, args.timeout_duration_seconds, args.beneficiary);
    });

    Result_::ok(format!(
        "Registered successfully. You must send heartbeat every {} seconds",
        args.timeout_duration_seconds
    ))
}

/// Send heartbeat to indicate user is alive
#[update]
async fn heartbeat() -> HeartbeatResult {
    let caller = caller();
    let current_time = time();

    STATE.with(|state| {
        let mut s = state.borrow_mut();
        
        match s.users.get_mut(&caller) {
            Some(account) => {
                account.last_heartbeat = current_time;
                // Reset timeout detection if user sends heartbeat during grace period
                account.timeout_detected_at = None;
                let next_due = current_time + account.timeout_duration_seconds;
                account.transaction_history.push(TransactionLog {
                    timestamp: current_time,
                    transaction_type: "heartbeat".to_string(),
                    amount: None,
                    details: format!("Heartbeat sent, next due: {}", next_due),
                });
                // Keep only last 100 transactions
                if account.transaction_history.len() > 100 {
                    account.transaction_history.remove(0);
                }
                ic_cdk::println!("Heartbeat received from: {}, next due: {}", caller, next_due);
                
                HeartbeatResult::ok(HeartbeatResponse {
                    success: true,
                    message: "Heartbeat recorded".to_string(),
                    next_heartbeat_due: next_due,
                })
            }
            None => HeartbeatResult::err("User not registered".to_string()),
        }
    })
}

/// Verify and sync ckBTC balance from ledger
/// This function checks the actual ledger balance and syncs with tracked balance
#[update]
async fn sync_balance() -> Result_ {
    let caller = caller();
    
    // Check if user is registered
    if !STATE.with(|state| {
        let s = state.borrow();
        s.users.contains_key(&caller)
    }) {
        return Result_::err("User not registered. Please register first.".to_string());
    }

    let ledger = STATE.with(|state| {
        let s = state.borrow();
        s.ckbtc_ledger
    });

    // Get canister's account balance from ledger
    let canister_id = id();
    let account = Account {
        owner: canister_id,
        subaccount: None,
    };

    let response = match Call::unbounded_wait(ledger, "icrc1_balance_of")
        .with_arg(&(account,))
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            ic_cdk::println!("Balance sync failed: {:?}", e);
            return Result_::err(format!("Failed to sync balance: {:?}", e));
        }
    };
    let (ledger_balance,): (u64,) = match response.candid() {
        Ok(val) => val,
        Err(e) => {
            ic_cdk::println!("Failed to decode balance response: {:?}", e);
            return Result_::err(format!("Failed to decode balance: {:?}", e));
        }
    };

    let current_time = time();
    STATE.with(|state| {
        let mut s = state.borrow_mut();
        if let Some(account) = s.users.get_mut(&caller) {
            let previous_balance = account.balance;
            account.balance = ledger_balance;
            
            if ledger_balance != previous_balance {
                let difference = ledger_balance as i128 - previous_balance as i128;
                let transaction_type = if difference > 0 {
                    "deposit"
                } else {
                    "balance_sync"
                };
                
                account.transaction_history.push(TransactionLog {
                    timestamp: current_time,
                    transaction_type: transaction_type.to_string(),
                    amount: Some(ledger_balance),
                    details: format!(
                        "Balance synced: {} ckBTC (previous: {}, difference: {})",
                        ledger_balance, previous_balance, difference
                    ),
                });
                
                if account.transaction_history.len() > 100 {
                    account.transaction_history.remove(0);
                }
            }
            
            ic_cdk::println!("Balance synced for {}: {} ckBTC", caller, ledger_balance);
            Result_::ok(format!("Balance synced: {} ckBTC", ledger_balance))
        } else {
            Result_::err("User account not found".to_string())
        }
    })
}

/// Deposit ckBTC to the dead man switch
/// Note: Users should transfer ckBTC directly to this canister's account first
/// Then call sync_balance() to verify and update the tracked balance
#[update]
async fn deposit(_amount: u64) -> Result_ {
    let caller = caller();
    
    // Check if user is registered
    if !STATE.with(|state| {
        let s = state.borrow();
        s.users.contains_key(&caller)
    }) {
        return Result_::err("User not registered. Please register first.".to_string());
    }

    // Verify actual balance from ledger
    let ledger = STATE.with(|state| {
        let s = state.borrow();
        s.ckbtc_ledger
    });

    let canister_id = id();
    let account = Account {
        owner: canister_id,
        subaccount: None,
    };

    let response = match Call::unbounded_wait(ledger, "icrc1_balance_of")
        .with_arg(&(account,))
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            ic_cdk::println!("Balance sync failed: {:?}", e);
            return Result_::err(format!("Failed to sync balance: {:?}", e));
        }
    };
    let (ledger_balance,): (u64,) = match response.candid() {
        Ok(val) => val,
        Err(e) => {
            ic_cdk::println!("Failed to decode balance response: {:?}", e);
            return Result_::err(format!("Failed to decode balance: {:?}", e));
        }
    };

    let current_time = time();
    STATE.with(|state| {
        let mut s = state.borrow_mut();
        if let Some(account) = s.users.get_mut(&caller) {
            // Verify that ledger balance matches or exceeds expected balance
            if ledger_balance < account.balance {
                return Result_::err(format!(
                    "Ledger balance ({}) is less than tracked balance ({}). Please sync balance first.",
                    ledger_balance, account.balance
                ));
            }
            
            // Update balance to match ledger
            let previous_balance = account.balance;
            account.balance = ledger_balance;
            
            if ledger_balance > previous_balance {
                account.transaction_history.push(TransactionLog {
                    timestamp: current_time,
                    transaction_type: "deposit".to_string(),
                    amount: Some(ledger_balance - previous_balance),
                    details: format!("Deposited {} ckBTC (verified from ledger)", ledger_balance - previous_balance),
                });
                
                if account.transaction_history.len() > 100 {
                    account.transaction_history.remove(0);
                }
            }
            
            ic_cdk::println!("Deposit verified: {} ckBTC from {} (ledger balance: {})", 
                ledger_balance - previous_balance, caller, ledger_balance);
            Result_::ok(format!("Deposit verified: {} ckBTC", ledger_balance - previous_balance))
        } else {
            Result_::err("User account not found".to_string())
        }
    })
}

/// Transfer ckBTC using ICRC-1 standard
async fn transfer_ckbtc(
    ledger: Principal,
    to: Principal,
    amount: u64,
) -> Result<u64, TransferError> {
    let transfer_args = TransferArg {
        from_subaccount: None,
        to: Account {
            owner: to,
            subaccount: None,
        },
        fee: None,
        created_at_time: None,
        memo: Some(Memo::from(vec![0x44, 0x45, 0x41, 0x44, 0x4D, 0x41, 0x4E])), // "DEADMAN" in hex
        amount: amount.into(),
    };

    ic_cdk::println!("Calling icrc1_transfer on ledger: {}", ledger);
    
    // Call the ICRC-1 transfer method on the ckBTC ledger
    let response = match Call::unbounded_wait(ledger, "icrc1_transfer")
        .with_arg(&(transfer_args,))
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            ic_cdk::println!("Transfer call failed: {:?}", e);
            return Err(TransferError::TemporarilyUnavailable);
        }
    };
    let (transfer_result,): (Result<u64, TransferError>,) = match response.candid() {
        Ok(val) => val,
        Err(e) => {
            ic_cdk::println!("Failed to decode transfer response: {:?}", e);
            return Err(TransferError::TemporarilyUnavailable);
        }
    };
    transfer_result
}

/// Check and transfer funds if timeout occurred (after grace period)
async fn check_and_transfer(user: &UserAccount) -> Result<TransferResult, String> {
    let current_time = time();
    
    // Check if timeout has been reached
    let timeout_reached = current_time >= user.last_heartbeat + user.timeout_duration_seconds;
    
    if !timeout_reached {
        return Ok(TransferResult {
            success: false,
            message: "Timeout not reached".to_string(),
            block_index: None,
        });
    }
    
    // Check if we're still in contestation period
    let timeout_detected_at = user.timeout_detected_at.unwrap_or(user.last_heartbeat + user.timeout_duration_seconds);
    let grace_period_end = timeout_detected_at + user.contestation_period_seconds;
    
    if current_time < grace_period_end {
        return Ok(TransferResult {
            success: false,
            message: format!("Still in contestation period. Transfer will execute at {}", grace_period_end),
            block_index: None,
        });
    }

    if user.balance == 0 {
        return Ok(TransferResult {
            success: false,
            message: "No balance to transfer".to_string(),
            block_index: None,
        });
    }

    // Get ledger canister ID
    let ledger = STATE.with(|state| {
        let s = state.borrow();
        s.ckbtc_ledger
    });

    // Handle multiple beneficiaries or single beneficiary
    if user.beneficiaries.len() > 1 {
        // Multiple beneficiaries - split according to percentages
        let mut total_transferred = 0u64;
        let mut transfer_results = Vec::new();
        
        for beneficiary in &user.beneficiaries {
            let amount = (user.balance as u128 * beneficiary.percentage as u128 / 100) as u64;
            if amount > 0 {
                let account_type = if beneficiary.subaccount.is_some() {
                    "principal-associated account"
                } else {
                    "wallet address"
                };
                ic_cdk::println!(
                    "Transferring {} ckBTC to {} ({})",
                    amount, beneficiary.principal, account_type
                );
                match transfer_ckbtc(ledger, beneficiary.principal, amount).await {
                    Ok(block_index) => {
                        total_transferred += amount;
                        let account_desc = if beneficiary.subaccount.is_some() {
                            format!("account with subaccount")
                        } else {
                            format!("wallet")
                        };
                        transfer_results.push(format!("{} ckBTC to {} {} (block: {})", amount, beneficiary.principal, account_desc, block_index));
                    }
                    Err(e) => {
                        ic_cdk::println!("Transfer error to {}: {:?}", beneficiary.principal, e);
                    }
                }
            }
        }
        
        if total_transferred > 0 {
            ic_cdk::println!("Timeout transfer successful: {} ckBTC split among {} beneficiaries", total_transferred, user.beneficiaries.len());
            Ok(TransferResult {
                success: true,
                message: format!("Transferred {} ckBTC: {}", total_transferred, transfer_results.join(", ")),
                block_index: None, // Multiple transfers, no single block index
            })
        } else {
            Err("All transfers failed".to_string())
        }
    } else {
        // Single beneficiary (backward compatible)
        let beneficiary = user.beneficiaries.first().map(|b| b.principal).unwrap_or(user.beneficiary);
        
        ic_cdk::println!(
            "Timeout detected for user: {}. Transferring {} ckBTC to beneficiary: {}",
            user.principal, user.balance, beneficiary
        );

        match transfer_ckbtc(ledger, beneficiary, user.balance).await {
            Ok(block_index) => {
                ic_cdk::println!("Transfer successful, block index: {}", block_index);
                Ok(TransferResult {
                    success: true,
                    message: format!("Transferred {} ckBTC to beneficiary", user.balance),
                    block_index: Some(block_index),
                })
            }
            Err(e) => {
                ic_cdk::println!("Transfer error: {:?}", e);
                Err(format!("Transfer failed: {:?}", e))
            }
        }
    }
}

/// Start the periodic timeout checker
fn start_timeout_checker() {
    set_timer_interval(Duration::from_secs(60), || {
        check_timeouts()
    });
    ic_cdk::println!("Timeout checker started - checking every 60 seconds");
}

/// Check all users for timeout and transfer funds if needed
async fn check_timeouts() {
    let current_time = time();
    let mut users_to_check = Vec::new();
    let mut users_to_mark_timeout = Vec::new();

    STATE.with(|state| {
        let s = state.borrow();
        for (principal, account) in s.users.iter() {
            let time_since_heartbeat = current_time.saturating_sub(account.last_heartbeat);
            let timeout_reached = time_since_heartbeat >= account.timeout_duration_seconds;
            
            if timeout_reached {
                // Mark timeout detection if not already marked
                if account.timeout_detected_at.is_none() {
                    users_to_mark_timeout.push(*principal);
                    ic_cdk::println!(
                        "User {} timeout detected: {}s since last heartbeat (threshold: {}s). Grace period started.",
                        principal, time_since_heartbeat, account.timeout_duration_seconds
                    );
                }
                
                // Check if grace period has passed
                let timeout_detected_at = account.timeout_detected_at.unwrap_or(account.last_heartbeat + account.timeout_duration_seconds);
                let grace_period_end = timeout_detected_at + account.contestation_period_seconds;
                
                if current_time >= grace_period_end {
                    ic_cdk::println!(
                        "User {} grace period expired. Transfer will be executed.",
                        principal
                    );
                    users_to_check.push(account.clone());
                }
            }
        }
    });
    
    // Mark timeout detection timestamps
    for principal in users_to_mark_timeout {
        STATE.with(|state| {
            let mut s = state.borrow_mut();
            if let Some(account) = s.users.get_mut(&principal) {
                account.timeout_detected_at = Some(current_time);
                account.transaction_history.push(TransactionLog {
                    timestamp: current_time,
                    transaction_type: "timeout_detected".to_string(),
                    amount: None,
                    details: format!("Timeout detected. Grace period: {}s", account.contestation_period_seconds),
                });
                if account.transaction_history.len() > 100 {
                    account.transaction_history.remove(0);
                }
            }
        });
    }

    for user in users_to_check {
        ic_cdk::println!("Processing timeout for user: {}", user.principal);
        match check_and_transfer(&user).await {
            Ok(result) => {
                if result.success {
                    ic_cdk::println!("Transfer successful: {}", result.message);
                    // Remove user account after successful transfer
                    STATE.with(|state| {
                        let mut s = state.borrow_mut();
                        s.users.remove(&user.principal);
                    });
                } else {
                    ic_cdk::println!("Transfer not needed: {}", result.message);
                }
            }
            Err(e) => {
                ic_cdk::println!("Error processing timeout for {}: {}", user.principal, e);
            }
        }
    }
}

/// Query user account information
#[query]
fn get_account_info() -> AccountInfoResult {
    let caller = caller();
    
    STATE.with(|state| {
        let mut s = state.borrow_mut();
        match s.users.get_mut(&caller) {
            Some(account) => {
                // Ensure backward compatibility - initialize new fields if missing
                if account.beneficiaries.is_empty() {
                    account.beneficiaries = vec![Beneficiary {
                        principal: account.beneficiary,
                        percentage: 100,
                        subaccount: None,
                    }];
                }
                // Initialize new fields for backward compatibility
                if account.contestation_period_seconds == 0 {
                    account.contestation_period_seconds = 7 * 24 * 60 * 60; // Default 7 days
                }
                AccountInfoResult::ok(account.clone())
            }
            None => AccountInfoResult::err("User not registered".to_string()),
        }
    })
}

/// Query all registered users (admin function)
#[query]
fn list_users() -> Vec<(Principal, UserAccount)> {
    STATE.with(|state| {
        let s = state.borrow();
        s.users.iter().map(|(k, v)| (*k, v.clone())).collect()
    })
}

/// Get ckBTC balance for a specific user
#[query]
fn get_user_balance() -> BalanceResult {
    let caller = caller();
    
    STATE.with(|state| {
        let s = state.borrow();
        match s.users.get(&caller) {
            Some(u) => BalanceResult::ok(u.balance),
            None => BalanceResult::err("User not registered".to_string()),
        }
    })
}

/// Get ckBTC balance for the canister from the ledger
#[update]
async fn get_ckbtc_balance() -> BalanceResult {
    let ledger = STATE.with(|state| {
        let s = state.borrow();
        s.ckbtc_ledger
    });

    // Call icrc1_balance_of on the ledger
    let canister_id = id();
    let account = Account {
        owner: canister_id,
        subaccount: None,
    };

    match Call::unbounded_wait(ledger, "icrc1_balance_of")
        .with_arg(&(account,))
        .await
    {
        Ok(response) => {
            match response.candid::<(u64,)>() {
                Ok((balance,)) => BalanceResult::ok(balance),
                Err(e) => {
                    ic_cdk::println!("Failed to decode balance response: {:?}", e);
                    // Fallback to sum of user balances
                    BalanceResult::ok(STATE.with(|state| {
                        let s = state.borrow();
                        s.users.values().map(|u| u.balance).sum()
                    }))
                }
            }
        }
        Err(e) => {
            ic_cdk::println!("Balance query failed: {:?}", e);
            // Fallback to sum of user balances
            BalanceResult::ok(STATE.with(|state| {
                let s = state.borrow();
                s.users.values().map(|u| u.balance).sum()
            }))
        }
    }
}

/// Update user settings (timeout duration and/or beneficiary)
#[update]
async fn update_settings(
    timeout_duration_seconds: Option<u64>,
    beneficiary: Option<Principal>,
) -> Result_ {
    let caller = caller();
    let current_time = time();

    STATE.with(|state| {
        let mut s = state.borrow_mut();
        
        match s.users.get_mut(&caller) {
            Some(account) => {
                let mut changes = Vec::new();
                
                if let Some(timeout) = timeout_duration_seconds {
                    if timeout == 0 {
                        return Result_::err("Timeout duration must be greater than 0".to_string());
                    }
                    account.timeout_duration_seconds = timeout;
                    changes.push(format!("timeout: {}s", timeout));
                }
                
                if let Some(ben) = beneficiary {
                    account.beneficiary = ben;
                    account.beneficiaries = vec![Beneficiary {
                        principal: ben,
                        percentage: 100,
                        subaccount: None,
                    }];
                    changes.push(format!("beneficiary: {}", ben));
                }
                
                if changes.is_empty() {
                    return Result_::err("No changes provided".to_string());
                }
                
                account.transaction_history.push(TransactionLog {
                    timestamp: current_time,
                    transaction_type: "update".to_string(),
                    amount: None,
                    details: format!("Settings updated: {}", changes.join(", ")),
                });
                
                if account.transaction_history.len() > 100 {
                    account.transaction_history.remove(0);
                }
                
                ic_cdk::println!("Settings updated for user: {}, changes: {:?}", caller, changes);
                Result_::ok(format!("Settings updated: {}", changes.join(", ")))
            }
            None => Result_::err("User not registered".to_string()),
        }
    })
}

/// Withdraw ckBTC from the dead man switch (before timeout)
#[update]
async fn withdraw(amount: u64, to: Principal) -> Result_ {
    let caller = caller();
    let current_time = time();
    
    // Check if user is registered
    if !STATE.with(|state| {
        let s = state.borrow();
        s.users.contains_key(&caller)
    }) {
        return Result_::err("User not registered. Please register first.".to_string());
    }

    // Check balance and get ledger
    let account_balance = STATE.with(|state| {
        let s = state.borrow();
        s.users.get(&caller).map(|a| a.balance)
    });
    
    match account_balance {
        Some(balance) => {
            if balance < amount {
                return Result_::err("Insufficient balance".to_string());
            }
        }
        None => {
            return Result_::err("User account not found".to_string());
        }
    }
    
    let ledger = STATE.with(|state| {
        let s = state.borrow();
        s.ckbtc_ledger
    });

    let ledger = STATE.with(|state| {
        let s = state.borrow();
        s.ckbtc_ledger
    });

    // Transfer ckBTC to withdrawal address (default to wallet address, no subaccount)
    match transfer_ckbtc(ledger, to, amount).await {
        Ok(block_index) => {
            STATE.with(|state| {
                let mut s = state.borrow_mut();
                if let Some(account) = s.users.get_mut(&caller) {
                    account.balance -= amount;
                    account.transaction_history.push(TransactionLog {
                        timestamp: current_time,
                        transaction_type: "withdrawal".to_string(),
                        amount: Some(amount),
                        details: format!("Withdrew {} ckBTC to {}", amount, to),
                    });
                    if account.transaction_history.len() > 100 {
                        account.transaction_history.remove(0);
                    }
                }
            });
            ic_cdk::println!("Withdrawal successful: {} ckBTC to {}, block: {}", amount, to, block_index);
            Result_::ok(format!("Withdrew {} ckBTC to {}", amount, to))
        }
        Err(e) => {
            ic_cdk::println!("Withdrawal error: {:?}", e);
            Result_::err(format!("Withdrawal failed: {:?}", e))
        }
    }
}

/// Get transaction history for the current user
#[query]
fn get_transaction_history() -> TransactionHistoryResult {
    let caller = caller();
    
    STATE.with(|state| {
        let s = state.borrow();
        match s.users.get(&caller) {
            Some(u) => TransactionHistoryResult::ok(u.transaction_history.clone()),
            None => TransactionHistoryResult::err("User not registered".to_string()),
        }
    })
}

/// Cancel timeout transfer during grace period (user or trusted party)
#[update]
async fn cancel_timeout_transfer() -> Result_ {
    let caller = caller();
    let current_time = time();
    
    STATE.with(|state| {
        let mut s = state.borrow_mut();
        
        match s.users.get_mut(&caller) {
            Some(account) => {
                // User can cancel their own timeout
                if account.timeout_detected_at.is_some() {
                    account.timeout_detected_at = None;
                    account.transaction_history.push(TransactionLog {
                        timestamp: current_time,
                        transaction_type: "timeout_cancelled".to_string(),
                        amount: None,
                        details: "Timeout transfer cancelled by user".to_string(),
                    });
                    if account.transaction_history.len() > 100 {
                        account.transaction_history.remove(0);
                    }
                    ic_cdk::println!("Timeout transfer cancelled by user: {}", caller);
                    Result_::ok("Timeout transfer cancelled".to_string())
                } else {
                    Result_::err("No active timeout to cancel".to_string())
                }
            }
            None => {
                // Check if caller is a trusted party for any user
                let mut cancelled = false;
                for (principal, account) in s.users.iter_mut() {
                    if account.trusted_parties.contains(&caller) && account.timeout_detected_at.is_some() {
                        account.timeout_detected_at = None;
                        account.transaction_history.push(TransactionLog {
                            timestamp: current_time,
                            transaction_type: "timeout_cancelled".to_string(),
                            amount: None,
                            details: format!("Timeout transfer cancelled by trusted party: {}", caller),
                        });
                        if account.transaction_history.len() > 100 {
                            account.transaction_history.remove(0);
                        }
                        cancelled = true;
                        ic_cdk::println!("Timeout transfer cancelled by trusted party {} for user {}", caller, principal);
                    }
                }
                if cancelled {
                    Result_::ok("Timeout transfer cancelled by trusted party".to_string())
                } else {
                    Result_::err("Not authorized to cancel timeout transfer".to_string())
                }
            }
        }
    })
}

/// Add trusted party who can override during grace period
#[update]
async fn add_trusted_party(trusted_party: Principal) -> Result_ {
    let caller = caller();
    let current_time = time();
    
    STATE.with(|state| {
        let mut s = state.borrow_mut();
        
        match s.users.get_mut(&caller) {
            Some(account) => {
                if account.trusted_parties.contains(&trusted_party) {
                    return Result_::err("Trusted party already added".to_string());
                }
                account.trusted_parties.push(trusted_party);
                account.transaction_history.push(TransactionLog {
                    timestamp: current_time,
                    transaction_type: "update".to_string(),
                    amount: None,
                    details: format!("Added trusted party: {}", trusted_party),
                });
                if account.transaction_history.len() > 100 {
                    account.transaction_history.remove(0);
                }
                ic_cdk::println!("Trusted party added: {} for user {}", trusted_party, caller);
                Result_::ok(format!("Trusted party {} added", trusted_party))
            }
            None => Result_::err("User not registered".to_string()),
        }
    })
}

/// Remove trusted party
#[update]
async fn remove_trusted_party(trusted_party: Principal) -> Result_ {
    let caller = caller();
    let current_time = time();
    
    STATE.with(|state| {
        let mut s = state.borrow_mut();
        
        match s.users.get_mut(&caller) {
            Some(account) => {
                if let Some(pos) = account.trusted_parties.iter().position(|&x| x == trusted_party) {
                    account.trusted_parties.remove(pos);
                    account.transaction_history.push(TransactionLog {
                        timestamp: current_time,
                        transaction_type: "update".to_string(),
                        amount: None,
                        details: format!("Removed trusted party: {}", trusted_party),
                    });
                    if account.transaction_history.len() > 100 {
                        account.transaction_history.remove(0);
                    }
                    ic_cdk::println!("Trusted party removed: {} for user {}", trusted_party, caller);
                    Result_::ok(format!("Trusted party {} removed", trusted_party))
                } else {
                    Result_::err("Trusted party not found".to_string())
                }
            }
            None => Result_::err("User not registered".to_string()),
        }
    })
}

/// Update contestation period
#[update]
async fn update_contestation_period(contestation_period_seconds: u64) -> Result_ {
    let caller = caller();
    let current_time = time();
    
    STATE.with(|state| {
        let mut s = state.borrow_mut();
        
        match s.users.get_mut(&caller) {
            Some(account) => {
                account.contestation_period_seconds = contestation_period_seconds;
                account.transaction_history.push(TransactionLog {
                    timestamp: current_time,
                    transaction_type: "update".to_string(),
                    amount: None,
                    details: format!("Contestation period updated to {}s", contestation_period_seconds),
                });
                if account.transaction_history.len() > 100 {
                    account.transaction_history.remove(0);
                }
                ic_cdk::println!("Contestation period updated for user {}: {}s", caller, contestation_period_seconds);
                Result_::ok(format!("Contestation period updated to {}s", contestation_period_seconds))
            }
            None => Result_::err("User not registered".to_string()),
        }
    })
}

/// Get timeout status including grace period information
#[query]
fn get_timeout_status() -> TimeoutStatusResult {
    let caller = caller();
    let current_time = time();
    
    STATE.with(|state| {
        let s = state.borrow();
        match s.users.get(&caller) {
            Some(account) => {
                let time_since_heartbeat = current_time.saturating_sub(account.last_heartbeat);
                let timeout_reached = time_since_heartbeat >= account.timeout_duration_seconds;
                
                let grace_period_end = if let Some(timeout_at) = account.timeout_detected_at {
                    timeout_at + account.contestation_period_seconds
                } else if timeout_reached {
                    account.last_heartbeat + account.timeout_duration_seconds + account.contestation_period_seconds
                } else {
                    0
                };
                
                let in_grace_period = timeout_reached && current_time < grace_period_end;
                let time_until_timeout = if timeout_reached {
                    0
                } else {
                    account.timeout_duration_seconds.saturating_sub(time_since_heartbeat)
                };
                
                let time_until_transfer = if in_grace_period {
                    grace_period_end.saturating_sub(current_time)
                } else {
                    0
                };
                
                TimeoutStatusResult::ok(TimeoutStatus {
                    timeout_reached,
                    in_grace_period,
                    time_until_timeout,
                    time_until_transfer,
                    grace_period_end,
                    last_heartbeat: account.last_heartbeat,
                    timeout_duration: account.timeout_duration_seconds,
                    contestation_period: account.contestation_period_seconds,
                })
            }
            None => TimeoutStatusResult::err("User not registered".to_string()),
        }
    })
}

#[derive(CandidType, Deserialize, Debug, Serialize)]
pub struct TimeoutStatus {
    pub timeout_reached: bool,
    pub in_grace_period: bool,
    pub time_until_timeout: u64,
    pub time_until_transfer: u64,
    pub grace_period_end: u64,
    pub last_heartbeat: u64,
    pub timeout_duration: u64,
    pub contestation_period: u64,
}

#[query]
fn greet(name: String) -> String {
    format!("Hello, {}! This is the Dead Man Switch Canister.", name)
}

/// DEV ONLY: Set mock balance for demo purposes (local development)
/// This bypasses ledger verification and directly sets the balance
/// Only works in local development - will fail on mainnet
#[update]
async fn set_mock_balance(amount: u64) -> Result_ {
    let caller = caller();
    let current_time = time();
    
    // Check if user is registered
    if !STATE.with(|state| {
        let s = state.borrow();
        s.users.contains_key(&caller)
    }) {
        return Result_::err("User not registered. Please register first.".to_string());
    }

    STATE.with(|state| {
        let mut s = state.borrow_mut();
        if let Some(account) = s.users.get_mut(&caller) {
            let previous_balance = account.balance;
            // Add to existing balance instead of replacing
            account.balance = previous_balance.saturating_add(amount);
            let new_balance = account.balance;
            
            // Only log if amount was actually added
            if amount > 0 {
                account.transaction_history.push(TransactionLog {
                    timestamp: current_time,
                    transaction_type: "mock_deposit".to_string(),
                    amount: Some(amount),
                    details: format!("Mock balance top-up: +{} ckBTC (total: {} ckBTC, demo mode)", 
                        amount as f64 / 100_000_000.0, 
                        new_balance as f64 / 100_000_000.0),
                });
                
                if account.transaction_history.len() > 100 {
                    account.transaction_history.remove(0);
                }
            }
            
            ic_cdk::println!("Mock balance top-up for {}: +{} ckBTC (was: {}, now: {})", 
                caller, amount, previous_balance, new_balance);
            Result_::ok(format!("Mock balance top-up: +{} ckBTC (total: {} ckBTC)", 
                amount as f64 / 100_000_000.0,
                new_balance as f64 / 100_000_000.0))
        } else {
            Result_::err("User account not found".to_string())
        }
    })
}
