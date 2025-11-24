#!/bin/bash
# One-command demo setup script for hackathon

set -e

echo "🚀 Starting Dead Man Switch Demo..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if dfx is available
if ! command -v dfx &> /dev/null; then
    echo "⚠️  dfx not found. Please install DFX SDK first."
    echo "   See: https://internetcomputer.org/docs/current/developer-docs/setup/install/"
    exit 1
fi

echo "1️⃣  Stopping any running replica..."
dfx stop 2>/dev/null || true

echo ""
echo "2️⃣  Starting local replica..."
dfx start --background --clean

echo ""
echo "3️⃣  Waiting for replica to be ready..."
sleep 5

echo ""
echo "4️⃣  Creating canister (if needed)..."
dfx canister create deadman_switch 2>/dev/null || echo "   Canister already exists, continuing..."

echo ""
echo "5️⃣  Building canister..."
dfx build deadman_switch

echo ""
echo "6️⃣  Deploying canisters..."
dfx deploy deadman_switch --no-wallet
dfx deploy internet_identity --no-wallet 2>/dev/null || echo "   Internet Identity already deployed"

echo ""
echo "7️⃣  Installing Internet Identity WASM (if needed)..."
if [ -f install-local-ii.sh ]; then
    ./install-local-ii.sh 2>&1 | grep -E "✅|❌|Module hash" || echo "   Internet Identity ready"
else
    echo "   Skipping (install-local-ii.sh not found)"
fi

echo ""
echo "8️⃣  Getting canister ID..."
CANISTER_ID=$(dfx canister id deadman_switch)
echo "   Canister ID: ${GREEN}$CANISTER_ID${NC}"

echo ""
echo "9️⃣  Setting up frontend environment..."
cd frontend
if [ ! -f .env ]; then
    echo "VITE_CANISTER_ID=$CANISTER_ID" > .env
    echo "   Created .env file"
else
    echo "VITE_CANISTER_ID=$CANISTER_ID" > .env
    echo "   Updated .env file"
fi

echo ""
echo "🔟 Installing frontend dependencies..."
if [ ! -d node_modules ]; then
    npm install
else
    echo "   Dependencies already installed"
fi

echo ""
echo "✅ Demo setup complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "   1. Frontend will start automatically..."
echo "   2. Open browser to: ${GREEN}http://localhost:3002${NC}"
echo "   3. Click 'Connect' and authenticate with Local Internet Identity"
echo "   4. Register your account (see DEMO.md for details)"
echo "   5. Follow the demo guide in DEMO.md"
echo ""
echo "🎯 Quick test commands:"
echo ""
echo "   # Register (replace PRINCIPAL with your principal)"
echo "   dfx canister call deadman_switch register '(record {"
echo "     timeout_duration_seconds = 60 : nat64;"
echo "     beneficiary = principal \"PRINCIPAL\";"
echo "   })'"
echo ""
echo "   # Send heartbeat"
echo "   dfx canister call deadman_switch heartbeat"
echo ""
echo "   # Check account"
echo "   dfx canister call deadman_switch get_account_info"
echo ""
echo "📖 See DEMO.md for full demo script"
echo ""

# Start frontend in background
echo "🌐 Starting frontend..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Frontend running (PID: $FRONTEND_PID)"
echo "Press Ctrl+C to stop everything"
echo ""

# Wait for interrupt
trap "echo ''; echo 'Stopping...'; kill $FRONTEND_PID 2>/dev/null; dfx stop; exit" INT
wait $FRONTEND_PID

