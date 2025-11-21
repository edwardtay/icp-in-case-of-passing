# Dead Man Switch Canister for ckBTC

A decentralized dead man switch canister on the Internet Computer Protocol (ICP) that automatically transfers ckBTC funds to a beneficiary if the user stops sending heartbeats within a specified timeout period.

## Overview

This canister implements a "dead man switch" mechanism for Bitcoin funds on ICP using ckBTC (Chain-Key Bitcoin). Users register with a timeout duration and beneficiary address. If the user fails to send a heartbeat within the timeout period, their funds are automatically transferred to the beneficiary.

## Features

- **User Registration**: Register with custom timeout duration and beneficiary
- **Heartbeat Mechanism**: Send periodic heartbeats to indicate you're alive
- **Automatic Transfer**: Funds automatically transfer to beneficiary on timeout
- **ckBTC Integration**: Full ICRC-1 standard integration with ckBTC ledger
- **Periodic Checking**: Automatic timeout checking every 60 seconds
- **Local Development**: Configured for local dfx network testing

## Architecture

### Core Components

1. **User Account Management**: Tracks user registrations, heartbeats, and balances
2. **Timeout Detection**: Periodic checks for users who have exceeded their timeout
3. **ckBTC Transfer**: ICRC-1 compliant transfers to beneficiaries
4. **Timer System**: Automated periodic checking using ICP timers

### Key Data Structures

- `UserAccount`: Stores user principal, last heartbeat timestamp, timeout duration, beneficiary, and balance
- `DeadManSwitchState`: Manages all user accounts and ckBTC ledger canister ID

## Setup

### Prerequisites

- [DFX SDK](https://internetcomputer.org/docs/current/developer-docs/setup/install/) installed
- Rust toolchain with `wasm32-unknown-unknown` target

### About ICP Development and Testing

**Important**: The Internet Computer does not have a public testnet like Sepolia for Ethereum. To develop and test applications, you deploy them to a **local network** that you can run with `dfx`. This local replica simulates the Internet Computer network for development purposes.

**Mainnet Deployment**: If you want to deploy your application to mainnet, you need **cycles** to pay for it. Cycles are the fuel that powers canister execution on the Internet Computer.

**Canister Smart Contracts**: Canister smart contracts on the Internet Computer contain **Wasm bytecode**. This allows for writing smart contracts in many different programming languages. This project uses Rust, but you can also use Motoko, TypeScript, Python, and other languages that compile to WebAssembly.

### Installation

```bash
# Install Rust target for WebAssembly
rustup target add wasm32-unknown-unknown

# Clone the repository
git clone <repository-url>
cd icp-btc-cursor

# Build the canister
dfx build
```

## Deployment

### Local Development Deployment

The Internet Computer uses a **local network** for development and testing (unlike Ethereum's public testnets). Deploy to your local dfx network:

```bash
# Start local replica (if not already running)
dfx start --background

# Deploy to local network
dfx deploy

# Note the canister ID from the output
```

### Mainnet Deployment

To deploy to mainnet, you need **cycles** to pay for canister execution:

```bash
# Set network to mainnet
dfx network use ic

# Deploy the canister (requires cycles)
dfx deploy --network ic

# Note: You'll need cycles in your wallet to deploy
```

### Update ckBTC Ledger Canister ID

Update the `CKBTC_LEDGER_CANISTER_ID` constant in `deadman_switch/src/lib.rs` with the appropriate ckBTC ledger canister ID:

- **Local**: Use a mock or local ledger canister ID
- **Mainnet**: Use the mainnet ckBTC ledger canister ID

```rust
const CKBTC_LEDGER_CANISTER_ID: &str = "your-ckbtc-ledger-id";
```

## Usage

### 1. Register a User Account

```bash
dfx canister call deadman_switch register '(
  record {
    timeout_duration_seconds = 3600 : nat64;  # 1 hour timeout
    beneficiary = principal "beneficiary-principal-id";
  }
)'
```

### 2. Send Heartbeat

```bash
dfx canister call deadman_switch heartbeat
```

### 3. Deposit ckBTC

Users should transfer ckBTC directly to the canister's account, then call:

```bash
dfx canister call deadman_switch deposit '(1000000 : nat64)'  # 0.01 ckBTC (8 decimals)
```

### 4. Check Account Info

```bash
dfx canister call deadman_switch get_account_info
```

### 5. Check Balance

```bash
dfx canister call deadman_switch get_ckbtc_balance
```

## API Reference

### Update Methods

- `register(args: RegisterArgs) -> Result<String, String>`
  - Register a new user account with timeout and beneficiary

- `heartbeat() -> Result<HeartbeatResponse, String>`
  - Send heartbeat to reset timeout timer

- `deposit(amount: u64) -> Result<String, String>`
  - Record a ckBTC deposit (user should transfer to canister first)

- `get_ckbtc_balance() -> Result<u64, String>`
  - Get the canister's ckBTC balance from the ledger

### Query Methods

- `get_account_info() -> Result<UserAccount, String>`
  - Get current user's account information

- `get_user_balance() -> Result<u64, String>`
  - Get current user's tracked balance

- `list_users() -> Vec<(Principal, UserAccount)>`
  - List all registered users (for debugging)

- `greet(name: String) -> String`
  - Simple greeting function for testing

## Security Considerations

1. **Heartbeat Frequency**: Users must send heartbeats before timeout expires
2. **Beneficiary Verification**: Ensure beneficiary principal is correct before registration
3. **Balance Tracking**: The canister tracks balances internally; verify actual ledger balance
4. **Timeout Duration**: Choose appropriate timeout based on use case (e.g., daily, weekly, monthly)

## Development

### Building

The canister is compiled to **WebAssembly (Wasm) bytecode**, which is what runs on the Internet Computer:

```bash
dfx build
```

This compiles the Rust code to Wasm bytecode that can be deployed as a canister smart contract.

### Testing Locally

Since ICP doesn't have a public testnet, all development and testing happens on a **local dfx network**:

```bash
# Start local replica
dfx start --background

# Deploy to local network
dfx deploy

# Test functions
dfx canister call deadman_switch greet '("World")'
```

The local replica simulates the Internet Computer network, allowing you to test your canister without deploying to mainnet or spending cycles.

### Logging

The canister includes comprehensive logging for:
- User registration
- Heartbeat events
- Timeout detection
- Transfer operations
- Error conditions

View logs with:
```bash
dfx canister logs deadman_switch
```

## Project Structure

```
icp-btc-cursor/
├── dfx.json                 # DFX configuration
├── Cargo.toml              # Workspace Cargo configuration
├── deadman_switch/
│   ├── Cargo.toml          # Canister dependencies
│   └── src/
│       ├── lib.rs          # Main canister code (Rust -> Wasm)
│       └── deadman_switch.did  # Candid interface
├── frontend/               # Frontend application
├── examples/               # Usage examples
├── DEPLOYMENT.md           # Deployment guide
└── README.md               # This file
```

## Hackathon Submission

This project is designed for the [ICP Bitcoin DeFi Hackathon](https://www.encodeclub.com/programmes/icp-bitcoin-defi-hackathon).

### Key Innovation Points

1. **Automated Asset Management**: Ensures funds are not lost if user becomes inactive
2. **ckBTC Integration**: Leverages ICP's native Bitcoin integration
3. **Decentralized**: Fully on-chain, no centralized control
4. **ICRC-1 Compliant**: Uses standard token interfaces

## License

MIT License

## Contributing

This is a hackathon project. Contributions and improvements welcome!

## Support

For issues or questions, please refer to:
- [ICP Documentation](https://internetcomputer.org/docs/current/developer-docs/)
- [ckBTC Documentation](https://internetcomputer.org/docs/defi/chain-key-tokens/ckbtc/overview)
- [ICRC-1 Standard](https://github.com/dfinity/ICRC-1)

