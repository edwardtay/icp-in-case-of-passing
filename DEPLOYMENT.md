# Deployment Guide

This guide walks you through deploying the Dead Man Switch Canister to ICP testnet.

## Prerequisites

1. **DFX SDK**: Install from [ICP Documentation](https://internetcomputer.org/docs/current/developer-docs/setup/install/)
2. **Rust Toolchain**: Install from [rustup.rs](https://rustup.rs/)
3. **ICP Identity**: Create an identity with `dfx identity new <name>` or use default
4. **Cycles**: Ensure your identity has cycles for deployment

## Step 1: Setup Environment

```bash
# Run setup script
./setup.sh

# Verify installation
dfx --version
rustc --version
```

## Step 2: Configure ckBTC Ledger

Update the testnet ckBTC ledger canister ID in `deadman_switch/src/lib.rs`:

```rust
const CKBTC_LEDGER_CANISTER_ID: &str = "mxzaz-hqaaa-aaaar-qaada-cai"; // Testnet ckBTC ledger
```

**Note**: Verify this is the correct testnet ckBTC ledger canister ID. You can find it at:
- [ICP Dashboard - Testnet BTC](https://dashboard.internetcomputer.org/testbtc)

## Step 3: Build the Canister

```bash
# Build for wasm32 target
dfx build
```

This will:
- Compile the Rust code to WebAssembly
- Generate the Candid interface
- Create the `.wasm` file

## Step 4: Deploy to Testnet

```bash
# Switch to testnet network
dfx network use testnet

# Deploy the canister
dfx deploy --network testnet deadman_switch
```

After deployment, you'll see output like:
```
Deployed canisters.
URLs:
  Frontend canister via browser
    deadman_switch: https://<canister-id>.ic0.app
  Backend canister via Candid interface:
    deadman_switch: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/?id=<canister-id>
```

**Save the canister ID** - you'll need it for interactions.

## Step 5: Verify Deployment

```bash
# Test the greet function
dfx canister call deadman_switch greet '("Test")' --network testnet

# Check canister status
dfx canister status deadman_switch --network testnet
```

## Step 6: Get Testnet ckBTC

To test with real ckBTC on testnet:

1. Get testnet Bitcoin from a faucet
2. Mint testnet ckBTC using the ICP Dashboard
3. Transfer ckBTC to your canister's account

### Finding Your Canister's Account

Your canister has an account on the ckBTC ledger. To find it:

```bash
# Get your canister ID
CANISTER_ID=$(dfx canister id deadman_switch --network testnet)
echo "Canister ID: $CANISTER_ID"

# The account is: owner=$CANISTER_ID, subaccount=None
```

## Step 7: Test the Dead Man Switch

### Register a User

```bash
# Replace BENEFICIARY_PRINCIPAL with actual principal
dfx canister call deadman_switch register '(
  record {
    timeout_duration_seconds = 3600 : nat64;
    beneficiary = principal "BENEFICIARY_PRINCIPAL";
  }
)' --network testnet
```

### Send Heartbeat

```bash
dfx canister call deadman_switch heartbeat --network testnet
```

### Check Account Info

```bash
dfx canister call deadman_switch get_account_info --network testnet
```

### Deposit ckBTC

After transferring ckBTC to the canister:

```bash
# Record the deposit (amount in smallest unit, 8 decimals)
dfx canister call deadman_switch deposit '(1000000 : nat64)' --network testnet
```

### Monitor Timeout

The canister automatically checks for timeouts every 60 seconds. To verify:

```bash
# Check logs
dfx canister logs deadman_switch --network testnet

# List all users
dfx canister call deadman_switch list_users --network testnet
```

## Troubleshooting

### Build Errors

If you encounter build errors:

```bash
# Clean build
cargo clean
dfx clean

# Rebuild
dfx build
```

### Deployment Errors

- **Insufficient Cycles**: Add cycles to your identity
  ```bash
  dfx wallet --network testnet balance
  ```

- **Network Issues**: Verify network connectivity
  ```bash
  dfx ping --network testnet
  ```

### Runtime Errors

Check canister logs:
```bash
dfx canister logs deadman_switch --network testnet
```

Common issues:
- **ckBTC Ledger ID**: Verify the ledger canister ID is correct
- **Transfer Failures**: Ensure canister has sufficient ckBTC balance
- **Timeout Issues**: Verify timer is running (check logs)

## Production Deployment

For mainnet deployment:

1. Update `CKBTC_LEDGER_CANISTER_ID` to mainnet ckBTC ledger ID
2. Ensure thorough testing on testnet
3. Review security considerations
4. Deploy with appropriate cycles
5. Monitor closely after deployment

## Security Checklist

Before deploying to production:

- [ ] Code reviewed
- [ ] All tests passing
- [ ] Error handling verified
- [ ] Logging sufficient for monitoring
- [ ] ckBTC ledger ID verified
- [ ] Timeout logic tested
- [ ] Transfer mechanism verified
- [ ] Documentation complete

## Support

For issues:
- Check logs: `dfx canister logs deadman_switch --network testnet`
- Review README.md for API documentation
- Check workflow.md for development guidelines

