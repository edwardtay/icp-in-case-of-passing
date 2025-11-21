#!/bin/bash
# Setup script for Dead Man Switch Canister project

set -e

echo "=== Setting up Dead Man Switch Canister Project ==="
echo ""

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "Error: dfx is not installed. Please install it from https://internetcomputer.org/docs/current/developer-docs/setup/install/"
    exit 1
fi

echo "✓ dfx found: $(dfx --version)"
echo ""

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "Error: Rust is not installed. Please install it from https://rustup.rs/"
    exit 1
fi

echo "✓ Rust found: $(rustc --version)"
echo ""

# Install wasm32 target if not already installed
if ! rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
    echo "Installing wasm32-unknown-unknown target..."
    rustup target add wasm32-unknown-unknown
    echo "✓ wasm32-unknown-unknown target installed"
else
    echo "✓ wasm32-unknown-unknown target already installed"
fi
echo ""

# Verify project structure
echo "Verifying project structure..."
if [ ! -f "dfx.json" ]; then
    echo "Error: dfx.json not found"
    exit 1
fi

if [ ! -f "deadman_switch/Cargo.toml" ]; then
    echo "Error: deadman_switch/Cargo.toml not found"
    exit 1
fi

if [ ! -f "deadman_switch/src/lib.rs" ]; then
    echo "Error: deadman_switch/src/lib.rs not found"
    exit 1
fi

echo "✓ Project structure verified"
echo ""

# Try to build (optional, can be skipped if dependencies aren't available)
echo "Attempting to verify build configuration..."
if cargo check --manifest-path deadman_switch/Cargo.toml --target wasm32-unknown-unknown 2>/dev/null; then
    echo "✓ Build configuration verified"
else
    echo "⚠ Build check skipped (dependencies may need to be fetched)"
fi
echo ""

echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Update CKBTC_LEDGER_CANISTER_ID in deadman_switch/src/lib.rs with testnet ckBTC ledger ID"
echo "2. Run 'dfx build' to build the canister"
echo "3. Run 'dfx deploy --network testnet' to deploy to testnet"
echo "4. See README.md for usage instructions"
echo ""

