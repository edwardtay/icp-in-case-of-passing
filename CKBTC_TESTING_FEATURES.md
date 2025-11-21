# ckBTC Testing Features

Based on the [ckBTC documentation](https://internetcomputer.org/docs/defi/chain-key-tokens/ckbtc/overview/), the following features have been added to the test page:

## ✅ Implemented Features

### 1. **Direct ckBTC Ledger Interaction**
   - **Get Balance**: Query ckBTC balance directly from the ledger using `icrc1_balance_of`
   - **Get Metadata**: Retrieve token metadata (name, symbol, decimals) using `icrc1_metadata`, `icrc1_name`, `icrc1_symbol`, `icrc1_decimals`
   - **Get Fee**: Query transaction fees using `icrc1_fee` to estimate costs
   - **Direct Transfer**: Test ckBTC transfers using `icrc1_transfer` with ICRC-1 standard

### 2. **Fee Estimation**
   - Display transfer fees in both smallest unit and human-readable format
   - Calculate total cost (amount + fee) before executing transfers
   - Real-time fee display when entering transfer amounts

### 3. **Testnet Support**
   - Configurable ckBTC ledger canister ID (supports both testnet and mainnet)
   - Default testnet ledger: `mxzaz-hqaaa-aaaar-qaada-cai`
   - Easy switching between testnet and mainnet

### 4. **Transaction Testing**
   - Test ckBTC transfers between principals
   - Validate transfer parameters before execution
   - Display transfer results with block indices

## 📋 Features from Documentation (To Consider)

### ICRC-2 Support (Approve/Transfer From)
The ckBTC ledger supports ICRC-2 standard for delegated transfers:
- **`icrc2_approve`**: Allow another account to spend tokens on your behalf
- **`icrc2_transfer_from`**: Transfer tokens from an approved account
- **`icrc2_allowance`**: Check current allowance

**Implementation Status**: Not yet implemented, but can be added if needed.

### Mint/Burn Operations
ckBTC supports minting (from Bitcoin) and burning (to Bitcoin):
- **Minting**: Convert Bitcoin to ckBTC (requires Bitcoin deposit)
- **Burning**: Convert ckBTC back to Bitcoin (requires withdrawal request)

**Note**: These operations typically require interaction with the Bitcoin network and may need additional infrastructure.

### Transaction History
- Query transaction history from the ledger
- View past transfers, mints, and burns
- Filter by account, date range, or transaction type

**Implementation Status**: Can be added using ledger's transaction query methods.

### Security Verification
- Verify no tainted Bitcoin is used
- Check transaction compliance
- Validate on-chain activities

**Implementation Status**: Requires integration with compliance/verification services.

## 🎯 Recommended Next Steps

1. **Add ICRC-2 Testing**:
   - Test approval mechanism
   - Test transfer_from functionality
   - Display allowance information

2. **Add Transaction History**:
   - Query and display past transactions
   - Filter and search capabilities
   - Export transaction data

3. **Add Fee Calculator**:
   - Calculate fees for different transaction types
   - Estimate costs for mint/burn operations
   - Display fee breakdown

4. **Add Balance History**:
   - Track balance changes over time
   - Visualize balance trends
   - Export balance data

5. **Add Error Handling Tests**:
   - Test insufficient funds scenarios
   - Test invalid principal errors
   - Test fee calculation errors

## 📚 Resources

- [ckBTC Overview](https://internetcomputer.org/docs/defi/chain-key-tokens/ckbtc/overview/)
- [ICRC-1 Standard](https://github.com/dfinity/ICRC-1)
- [ICRC-2 Standard](https://github.com/dfinity/ICRC-2)
- [ckBTC Reference](https://internetcomputer.org/docs/references/ckbtc-reference/)

## 🔧 Configuration

### Testnet ckBTC Ledger
```
Canister ID: mxzaz-hqaaa-aaaar-qaada-cai
Network: Bitcoin testnet4
```

### Mainnet ckBTC Ledger
```
Canister ID: (check latest documentation)
Network: Bitcoin mainnet
```

## 💡 Usage Tips

1. **Start with Metadata**: Always fetch metadata first to understand token properties
2. **Check Fees**: Query fees before transfers to ensure sufficient balance
3. **Test with Small Amounts**: Use testnet and small amounts for initial testing
4. **Verify Principals**: Always validate principal addresses before transfers
5. **Monitor Results**: Check test results for detailed error messages

## 🚀 Quick Test Flow

1. Connect your identity
2. Set ckBTC ledger canister ID (testnet or mainnet)
3. Get metadata to verify connection
4. Get your balance
5. Get fee information
6. Test a transfer with a small amount
7. Verify the transfer in test results

