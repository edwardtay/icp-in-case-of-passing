#!/bin/bash
# Example usage script for Dead Man Switch Canister
# Make sure to set CANISTER_ID and update principal IDs before running

set -e

CANISTER_ID="deadman_switch"
NETWORK="${1:-local}"

echo "=== Dead Man Switch Canister Usage Examples ==="
echo "Network: $NETWORK"
echo ""

# Set network
if [ "$NETWORK" = "testnet" ]; then
    dfx network use testnet
else
    dfx network use local
fi

echo "1. Testing greet function..."
dfx canister call $CANISTER_ID greet '("World")'
echo ""

echo "2. Register a user account..."
echo "   Replace BENEFICIARY_PRINCIPAL with actual beneficiary principal"
# dfx canister call $CANISTER_ID register '(
#   record {
#     timeout_duration_seconds = 3600 : nat64;
#     beneficiary = principal "BENEFICIARY_PRINCIPAL";
#   }
# )'
echo ""

echo "3. Send heartbeat..."
# dfx canister call $CANISTER_ID heartbeat
echo ""

echo "4. Check account info..."
# dfx canister call $CANISTER_ID get_account_info
echo ""

echo "5. Deposit ckBTC (after transferring to canister)..."
# dfx canister call $CANISTER_ID deposit '(1000000 : nat64)'
echo ""

echo "6. Check ckBTC balance..."
# dfx canister call $CANISTER_ID get_ckbtc_balance
echo ""

echo "7. List all users (for debugging)..."
# dfx canister call $CANISTER_ID list_users
echo ""

echo "=== Usage Examples Complete ==="
echo ""
echo "Note: Uncomment the commands above and update principal IDs before running"

