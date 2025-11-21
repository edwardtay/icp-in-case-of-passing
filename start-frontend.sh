#!/bin/bash
# Start script for frontend development

set -e

echo "=== Starting Dead Man Switch Frontend ==="
echo ""

# Check if canister is deployed locally
if ! dfx canister id deadman_switch 2>/dev/null; then
    echo "⚠️  Warning: Canister not found locally. Deploying..."
    dfx deploy deadman_switch
fi

CANISTER_ID=$(dfx canister id deadman_switch)
echo "✓ Canister ID: $CANISTER_ID"
echo ""

# Create .env file with canister ID
cd frontend
echo "VITE_CANISTER_ID=$CANISTER_ID" > .env
echo "✓ Created .env file with canister ID"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo "✓ Dependencies installed"
    echo ""
fi

echo "Starting development server..."
echo "Frontend will be available at: http://localhost:3000"
echo ""
echo "Make sure dfx is running: dfx start"
echo ""

npm run dev

