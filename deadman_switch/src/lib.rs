use candid::{CandidType, Deserialize, Principal};
use ic_cdk::{api::time, init, post_upgrade, pre_upgrade, query, update};
use ic_cdk_timers::set_timer_interval;
use icrc_ledger_types::{
    icrc1::account::Account,
    icrc1::transfer::{TransferArg, TransferError},
};
use serde::{Deserialize as SerdeDeserialize, Serialize};
use std::cell::RefCell;
use std::collections::HashMap;
use std::time::Duration;

// Testnet ckBTC ledger canister ID
// Update this with the actual testnet ckBTC ledger canister ID
const CKBTC_LEDGER_CANISTER_ID: &str = "mxzaz-hqaaa-aaaar-qaada-cai"; // Testnet ckBTC ledger

thread_local! {
    static STATE: RefCell<DeadManSwitchState> = RefCell::default();
}

#[derive(CandidType, Deserialize, Clone, Debug, Serialize, SerdeDeserialize)]
pub struct TransactionLog {
    pub timestamp: u64,
    pub transaction_type: String, // "heartbeat", "deposit", "withdrawal", "transfer", "update"
    pub amount: Option<u64>,
    pub details: String,
}

#[derive(CandidType, Deserialize, Clone, Debug, Serialize, SerdeDeserialize)]
pub struct Beneficiary {
    pub principal: Principal,
    pub percentage: u8, // 0-100, for multiple beneficiaries
}

#[derive(CandidType, Deserialize, Clone, Debug, Serialize, SerdeDeserialize)]
pub struct UserAccount {
    pub principal: Principal,
    pub last_heartbeat: u64,
    pub timeout_duration_seconds: u64,
    pub beneficiary: Principal, // Primary beneficiary (for backward compatibility)
    pub beneficiaries: Vec<Beneficiary>, // Multiple beneficiaries support
    pub balance: u64,
    pub transaction_history: Vec<TransactionLog>,
}

#[derive(CandidType, Deserialize, Clone, Debug, Serialize, SerdeDeserialize, Default)]
pub struct DeadManSwitchState {
    pub users: HashMap<Principal, UserAccount>,
    pub ckbtc_ledger: Principal,
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
async fn register(args: RegisterArgs) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Anonymous principal not allowed".to_string());
    }

    if args.timeout_duration_seconds == 0 {
        return Err("Timeout duration must be greater than 0".to_string());
    }

    let current_time = time();

    STATE.with(|state| {
        let mut s = state.borrow_mut();
        
        if s.users.contains_key(&caller) {
            return Err("User already registered".to_string());
        }

        let account = UserAccount {
            principal: caller,
            last_heartbeat: current_time,
            timeout_duration_seconds: args.timeout_duration_seconds,
            beneficiary: args.beneficiary.clone(),
            beneficiaries: vec![Beneficiary {
                principal: args.beneficiary,
                percentage: 100,
            }],
            balance: 0,
            transaction_history: vec![TransactionLog {
                timestamp: current_time,
                transaction_type: "register".to_string(),
                amount: None,
                details: format!("Registered with timeout: {}s", args.timeout_duration_seconds),
            }],
        };

        s.users.insert(caller, account);
        ic_cdk::println!("User registered: {}, timeout: {}s, beneficiary: {}", 
            caller, args.timeout_duration_seconds, args.beneficiary);
    });

    Ok(format!(
        "Registered successfully. You must send heartbeat every {} seconds",
        args.timeout_duration_seconds
    ))
}

/// Send heartbeat to indicate user is alive
#[update]
async fn heartbeat() -> Result<HeartbeatResponse, String> {
    let caller = ic_cdk::caller();
    let current_time = time();

    STATE.with(|state| {
        let mut s = state.borrow_mut();
        
        match s.users.get_mut(&caller) {
            Some(account) => {
                account.last_heartbeat = current_time;
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
                
                Ok(HeartbeatResponse {
                    success: true,
                    message: "Heartbeat recorded".to_string(),
                    next_heartbeat_due: next_due,
                })
            }
            None => Err("User not registered".to_string()),
        }
    })
}

/// Deposit ckBTC to the dead man switch
/// Note: In production, users should transfer ckBTC directly to this canister's account
/// This function tracks the deposit amount
#[update]
async fn deposit(amount: u64) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    STATE.with(|state| {
        let s = state.borrow();
        if !s.users.contains_key(&caller) {
            return Err("User not registered. Please register first.".to_string());
        }
        Ok(())
    })?;

    // Update balance tracking
    // In production, verify actual ckBTC transfer from user to canister
    let current_time = time();
    STATE.with(|state| {
        let mut s = state.borrow_mut();
        if let Some(account) = s.users.get_mut(&caller) {
            account.balance += amount;
            account.transaction_history.push(TransactionLog {
                timestamp: current_time,
                transaction_type: "deposit".to_string(),
                amount: Some(amount),
                details: format!("Deposited {} ckBTC", amount),
            });
            // Keep only last 100 transactions
            if account.transaction_history.len() > 100 {
                account.transaction_history.remove(0);
            }
            ic_cdk::println!("Deposit recorded: {} ckBTC from {}", amount, caller);
            Ok(format!("Deposited {} ckBTC", amount))
        } else {
            Err("User account not found".to_string())
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
        memo: Some(vec![0x44, 0x45, 0x41, 0x44, 0x4D, 0x41, 0x4E]), // "DEADMAN" in hex
        amount: amount.into(),
    };

    ic_cdk::println!("Calling icrc1_transfer on ledger: {}", ledger);
    
    // Call the ICRC-1 transfer method on the ckBTC ledger
    let result: Result<(Result<u64, TransferError>,), _> = ic_cdk::call(
        ledger,
        "icrc1_transfer",
        (transfer_args,),
    )
    .await;

    match result {
        Ok((transfer_result,)) => transfer_result,
        Err((code, msg)) => {
            ic_cdk::println!("Call failed: code={:?}, msg={}", code, msg);
            Err(TransferError::TemporarilyUnavailable)
        }
    }
}

/// Check and transfer funds if timeout occurred
async fn check_and_transfer(user: &UserAccount) -> Result<TransferResult, String> {
    let current_time = time();
    
    if current_time < user.last_heartbeat + user.timeout_duration_seconds {
        return Ok(TransferResult {
            success: false,
            message: "Timeout not reached".to_string(),
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
                match transfer_ckbtc(ledger, beneficiary.principal, amount).await {
                    Ok(block_index) => {
                        total_transferred += amount;
                        transfer_results.push(format!("{} ckBTC to {} (block: {})", amount, beneficiary.principal, block_index));
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
        ic_cdk::spawn(check_timeouts());
    });
    ic_cdk::println!("Timeout checker started - checking every 60 seconds");
}

/// Check all users for timeout and transfer funds if needed
async fn check_timeouts() {
    let current_time = time();
    let mut users_to_check = Vec::new();

    STATE.with(|state| {
        let s = state.borrow();
        for (principal, account) in s.users.iter() {
            let time_since_heartbeat = current_time.saturating_sub(account.last_heartbeat);
            if time_since_heartbeat >= account.timeout_duration_seconds {
                ic_cdk::println!(
                    "User {} timeout: {}s since last heartbeat (threshold: {}s)",
                    principal, time_since_heartbeat, account.timeout_duration_seconds
                );
                users_to_check.push(account.clone());
            }
        }
    });

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
fn get_account_info() -> Result<UserAccount, String> {
    let caller = ic_cdk::caller();
    
    STATE.with(|state| {
        let mut s = state.borrow_mut();
        match s.users.get_mut(&caller) {
            Some(account) => {
                // Ensure backward compatibility - initialize new fields if missing
                if account.beneficiaries.is_empty() {
                    account.beneficiaries = vec![Beneficiary {
                        principal: account.beneficiary,
                        percentage: 100,
                    }];
                }
                Ok(account.clone())
            }
            None => Err("User not registered".to_string()),
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
fn get_user_balance() -> Result<u64, String> {
    let caller = ic_cdk::caller();
    
    STATE.with(|state| {
        let s = state.borrow();
        s.users
            .get(&caller)
            .map(|u| u.balance)
            .ok_or_else(|| "User not registered".to_string())
    })
}

/// Get ckBTC balance for the canister from the ledger
#[update]
async fn get_ckbtc_balance() -> Result<u64, String> {
    let ledger = STATE.with(|state| {
        let s = state.borrow();
        s.ckbtc_ledger
    });

    // Call icrc1_balance_of on the ledger
    let canister_id = ic_cdk::id();
    let account = Account {
        owner: canister_id,
        subaccount: None,
    };

    let result: Result<(u64,), _> = ic_cdk::call(ledger, "icrc1_balance_of", (account,)).await;

    match result {
        Ok((balance,)) => Ok(balance),
        Err((code, msg)) => {
            ic_cdk::println!("Balance query failed: code={:?}, msg={}", code, msg);
            // Fallback to sum of user balances
            Ok(STATE.with(|state| {
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
) -> Result<String, String> {
    let caller = ic_cdk::caller();
    let current_time = time();

    STATE.with(|state| {
        let mut s = state.borrow_mut();
        
        match s.users.get_mut(&caller) {
            Some(account) => {
                let mut changes = Vec::new();
                
                if let Some(timeout) = timeout_duration_seconds {
                    if timeout == 0 {
                        return Err("Timeout duration must be greater than 0".to_string());
                    }
                    account.timeout_duration_seconds = timeout;
                    changes.push(format!("timeout: {}s", timeout));
                }
                
                if let Some(ben) = beneficiary {
                    account.beneficiary = ben;
                    account.beneficiaries = vec![Beneficiary {
                        principal: ben,
                        percentage: 100,
                    }];
                    changes.push(format!("beneficiary: {}", ben));
                }
                
                if changes.is_empty() {
                    return Err("No changes provided".to_string());
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
                Ok(format!("Settings updated: {}", changes.join(", ")))
            }
            None => Err("User not registered".to_string()),
        }
    })
}

/// Withdraw ckBTC from the dead man switch (before timeout)
#[update]
async fn withdraw(amount: u64, to: Principal) -> Result<String, String> {
    let caller = ic_cdk::caller();
    let current_time = time();
    
    STATE.with(|state| {
        let s = state.borrow();
        if !s.users.contains_key(&caller) {
            return Err("User not registered. Please register first.".to_string());
        }
        Ok(())
    })?;

    STATE.with(|state| {
        let s = state.borrow();
        let account = s.users.get(&caller).ok_or("User account not found")?;
        if account.balance < amount {
            return Err("Insufficient balance".to_string());
        }
        Ok(s.ckbtc_ledger)
    })?;

    let ledger = STATE.with(|state| {
        let s = state.borrow();
        s.ckbtc_ledger
    });

    // Transfer ckBTC to withdrawal address
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
            Ok(format!("Withdrew {} ckBTC to {}", amount, to))
        }
        Err(e) => {
            ic_cdk::println!("Withdrawal error: {:?}", e);
            Err(format!("Withdrawal failed: {:?}", e))
        }
    }
}

/// Get transaction history for the current user
#[query]
fn get_transaction_history() -> Result<Vec<TransactionLog>, String> {
    let caller = ic_cdk::caller();
    
    STATE.with(|state| {
        let s = state.borrow();
        s.users
            .get(&caller)
            .map(|u| u.transaction_history.clone())
            .ok_or_else(|| "User not registered".to_string())
    })
}

#[query]
fn greet(name: String) -> String {
    format!("Hello, {}! This is the Dead Man Switch Canister.", name)
}
