# Dead Man Switch Canister - Project Summary

## Project Overview

A decentralized dead man switch canister for Bitcoin on the Internet Computer Protocol (ICP). Automatically transfers ckBTC funds to a beneficiary if the user stops sending heartbeats within a specified timeout period.

## Key Features

✅ **User Registration**: Register with custom timeout and beneficiary  
✅ **Heartbeat System**: Periodic heartbeats to prove user is alive  
✅ **Automatic Transfer**: Funds transfer to beneficiary on timeout  
✅ **ckBTC Integration**: Full ICRC-1 standard compliance  
✅ **Periodic Monitoring**: Automatic timeout checking every 60 seconds  
✅ **Testnet Ready**: Configured for ICP testnet deployment  

## Technical Stack

- **Language**: Rust
- **Framework**: ICP CDK (Canister Development Kit)
- **Token Standard**: ICRC-1
- **Bitcoin Integration**: ckBTC (Chain-Key Bitcoin)
- **Network**: ICP Testnet

## Project Structure

```
icp-btc-cursor/
├── dfx.json                      # DFX project configuration
├── Cargo.toml                    # Workspace Cargo config
├── deadman_switch/               # Main canister package
│   ├── Cargo.toml               # Canister dependencies
│   └── src/
│       ├── lib.rs               # Main canister implementation
│       └── deadman_switch.did   # Candid interface definition
├── examples/
│   └── usage.sh                 # Usage examples script
├── README.md                     # Main documentation
├── DEPLOYMENT.md                 # Deployment guide
├── workflow.md                   # Development workflow
├── setup.sh                      # Setup script
└── PROJECT_SUMMARY.md           # This file
```

## Core Functionality

### 1. User Registration
- Users register with a timeout duration (seconds)
- Specify a beneficiary principal
- Initial heartbeat set on registration

### 2. Heartbeat Mechanism
- Users send heartbeats to reset timeout
- Heartbeat updates `last_heartbeat` timestamp
- Returns next heartbeat due time

### 3. Timeout Detection
- Periodic checker runs every 60 seconds
- Compares current time with `last_heartbeat + timeout_duration`
- Triggers transfer if timeout exceeded

### 4. Automatic Transfer
- Uses ICRC-1 `icrc1_transfer` method
- Transfers to beneficiary principal
- Includes memo "DEADMAN" for identification
- Removes user account after successful transfer

### 5. ckBTC Integration
- Integrates with ckBTC ledger canister
- Uses ICRC-1 standard for transfers
- Supports balance queries
- Handles transfer errors gracefully

## API Methods

### Update Methods (State-Changing)
- `register(args)` - Register new user account
- `heartbeat()` - Send heartbeat to reset timeout
- `deposit(amount)` - Record ckBTC deposit
- `get_ckbtc_balance()` - Query canister's ckBTC balance

### Query Methods (Read-Only)
- `get_account_info()` - Get user's account information
- `get_user_balance()` - Get user's tracked balance
- `list_users()` - List all registered users
- `greet(name)` - Simple greeting function

## Security Features

1. **Principal Verification**: Only registered users can interact
2. **Input Validation**: All inputs validated before processing
3. **State Protection**: Thread-safe state management with RefCell
4. **Error Handling**: Comprehensive error handling and logging
5. **Timeout Logic**: Prevents premature transfers

## Logging

Comprehensive logging for:
- User registration events
- Heartbeat events with timestamps
- Timeout detection and processing
- Transfer operations and results
- Error conditions with context

## Development Workflow

Follows workflow.md principles:
1. Reflect on 5-7 problem sources
2. Distill to 1-2 core issues
3. Add logs to validate assumptions
4. Implement fix
5. Tidy code after iteration

## Deployment

### Quick Start

```bash
# Setup
./setup.sh

# Build
dfx build

# Deploy to testnet
dfx network use testnet
dfx deploy --network testnet deadman_switch
```

See DEPLOYMENT.md for detailed instructions.

## Testing

### Local Testing
```bash
dfx start --background
dfx deploy
dfx canister call deadman_switch greet '("Test")'
```

### Testnet Testing
```bash
dfx network use testnet
dfx deploy --network testnet
# Follow examples/usage.sh for test scenarios
```

## Hackathon Submission Points

### Innovation
- **Automated Asset Management**: Prevents fund loss if user becomes inactive
- **Decentralized Solution**: Fully on-chain, no centralized control
- **Bitcoin Integration**: Leverages ICP's native Bitcoin capabilities

### Technical Excellence
- **ICRC-1 Compliant**: Uses standard token interfaces
- **Robust Error Handling**: Comprehensive error handling
- **Production Ready**: Designed for real-world use

### Use Cases
- Estate planning for crypto assets
- Emergency fund management
- Automated beneficiary transfers
- Trustless asset protection

## Next Steps

1. **Deploy to Testnet**: Follow DEPLOYMENT.md
2. **Test with Real ckBTC**: Get testnet ckBTC and test flows
3. **Monitor Logs**: Verify timeout detection works
4. **Iterate**: Refine based on testing
5. **Submit**: Prepare hackathon submission

## Resources

- [ICP Documentation](https://internetcomputer.org/docs/current/developer-docs/)
- [ckBTC Overview](https://internetcomputer.org/docs/defi/chain-key-tokens/ckbtc/overview)
- [ICRC-1 Standard](https://github.com/dfinity/ICRC-1)
- [Hackathon Page](https://www.encodeclub.com/programmes/icp-bitcoin-defi-hackathon)

## Status

✅ Project structure complete  
✅ Core functionality implemented  
✅ ckBTC integration ready  
✅ Documentation complete  
✅ Deployment guide ready  
⏳ Ready for testnet deployment and testing  

## Notes

- Update `CKBTC_LEDGER_CANISTER_ID` in lib.rs with actual testnet ID
- Verify beneficiary principals before registration
- Test timeout logic with appropriate durations
- Monitor logs during testing

