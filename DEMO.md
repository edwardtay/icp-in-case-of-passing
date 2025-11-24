# Hackathon Demo Guide

## 🎯 Quick Demo (5 minutes)

### Setup (Before Demo)

**Option 1: Automated Setup (Recommended)**
```bash
# 1. Start everything
./demo.sh

# 2. Open browser
# http://localhost:3002
```

**Option 2: Manual Setup**
```bash
# 1. Start local replica
dfx start --background --clean

# 2. Deploy canisters
dfx deploy deadman_switch --no-wallet
dfx deploy internet_identity --no-wallet

# 3. Install Internet Identity WASM (if needed)
./install-local-ii.sh

# 4. Start frontend
cd frontend
npm install
npm run dev

# 5. Open browser
# http://localhost:3002
```

### Demo Script

#### 1. Problem Statement (30 seconds)
- "What happens to your crypto if you die or become incapacitated?"
- "Your assets are locked forever - lost to your family"
- "Dead Man Switch solves this automatically"
- "Built on Internet Computer Protocol - fully decentralized"

#### 2. Live Demo (3 minutes)

**Step 1: Connect**
- Click "Connect" button
- Authenticate with **Local Internet Identity** (for local dev)
- Show: "Connected" status with principal ID
- Explain: "Decentralized identity, no passwords, privacy-preserving"

**Step 2: Register**
- Fill registration form:
  - **Timeout Duration**: Select "1 minute (testing)" for quick demo
  - **Beneficiary Principal**: Enter a DIFFERENT account principal (beneficiary)
    - ⚠️ **Important**: Must use a different account as beneficiary (not your own)
    - For demo, create a second dfx identity: `./create-beneficiary-identity.sh`
    - Paste the beneficiary principal from Step 2
    - The form requires a different account - cannot use your own
- Show confirmation dialog
- Click "Register"
- ✅ **Success!** "User already registered" or "Registered successfully"
- Explain: "The connected account will send funds to the beneficiary if heartbeat is missed. This ensures your assets go to a trusted person if something happens to you."

**Step 4: Add Mock Balance to Connected Account**
- **Important**: This adds balance to YOUR connected account (the one registering)
- Run: `./add-mock-balance.sh 0.5` (adds 0.5 ckBTC to your account)
- Or via CLI: `dfx canister call deadman_switch set_mock_balance "(50_000_000 : nat64)"`
- Explain: "This adds mock balance to the connected account. When timeout occurs, this balance transfers to the beneficiary"
- Refresh frontend to see balance update
- Show: Balance now displays `0.50000000 ckBTC` in dashboard

**Step 5: Show Dashboard**
- Point out **Account Dashboard**:
  - **Balance display**: Shows mock ckBTC in YOUR connected account (e.g., `0.50000000 ckBTC`)
  - **Beneficiary principal**: Shows the account that will receive funds on timeout
  - Timeout duration setting
  - Last heartbeat timestamp
  - Grace period information
- Explain: "The balance shown is in YOUR account. If you miss a heartbeat, it transfers to the beneficiary. All info is stored on-chain, transparent and auditable"

**Step 6: Show Heartbeat Button**
- Point out **Heartbeat Button** with countdown timer
- Click "Send Heartbeat"
- Show timer reset
- Show success message: "Heartbeat sent! Next due: [timestamp]"
- Explain: "This resets the countdown timer. Must send before timeout expires"

**Step 7: Show Transaction History**
- Scroll to **Transaction History** section
- Show registration transaction
- Show heartbeat transaction (if sent)
- Explain: "All actions are logged on-chain for transparency"

**Step 7: Explain Timeout Mechanism**
- "If no heartbeat within timeout period..."
- "System automatically detects timeout"
- "Funds transfer to beneficiary after grace period"
- "No manual intervention needed - fully automated"

#### 3. Technical Highlights (1 minute)
- **Built on Internet Computer**: Fully decentralized, no single point of failure
- **Rust Smart Contract**: Canister-based architecture
- **ICRC-1 Compliant**: Standard token interface for ckBTC
- **Automatic Detection**: Periodic timer checks every 60 seconds
- **Local Internet Identity**: Works seamlessly in local development
- **React Frontend**: Modern, responsive UI
- **Transaction Logging**: All actions recorded on-chain

#### 4. Current Features & Roadmap (30 seconds)

**✅ What's Working:**
- User registration
- Heartbeat mechanism
- Account dashboard
- Transaction history
- Timeout detection
- Local Internet Identity integration

**🚧 Coming Soon:**
- ckBTC transfers (logic complete, needs mainnet deployment)
- Multiple beneficiaries (architecture ready)
- Trusted party override (data structures ready)
- Mobile app

## 🎤 Talking Points

### Problem
- Crypto assets can be lost forever if owner dies or becomes incapacitated
- No automated way to transfer assets to beneficiaries
- Traditional solutions require manual intervention
- Dead Man Switch solves this automatically

### Solution
- **Automated**: No manual intervention required
- **Decentralized**: Built on ICP, no single point of failure
- **Transparent**: All actions logged on-chain
- **Easy to Use**: Simple heartbeat mechanism
- **Secure**: Internet Identity authentication

### Innovation
- **First dead man switch on ICP**: Leverages ICP's unique capabilities
- **ckBTC Integration**: Native Bitcoin on Internet Computer
- **Fully Automated**: Timer-based detection and transfer
- **ICRC-1 Compliant**: Standard token interface

### Technical Stack
- **Backend**: Rust canister on Internet Computer
- **Frontend**: React with modern UI components
- **Authentication**: Internet Identity (local for dev, production for mainnet)
- **Token Standard**: ICRC-1 for ckBTC
- **Architecture**: Canister-based, decentralized

## 📸 Screenshots to Capture

1. **Registration Form**: Show timeout selector and beneficiary input
2. **Connected State**: Show principal ID and connection status
3. **Account Dashboard**: Show balance, timeout settings, beneficiary
4. **Heartbeat Button**: Show countdown timer and button
5. **Transaction History**: Show registration and heartbeat logs
6. **ckBTC Price Display**: Show current price and market data

## ⚠️ Troubleshooting

### If Registration Fails
1. **Check canister ID**: Console should show `🔍 Canister ID: uqqxf-5h777-77774-qaaaa-cai`
2. **Clear browser cache**: Hard refresh (`Ctrl+Shift+R`)
3. **Verify replica running**: `dfx ping`
4. **Check Internet Identity**: Should use local II (`uzt4z-lp777-77774-qaabq-cai`)

### If Connection Fails
1. **Check replica**: `dfx ping` should work
2. **Restart replica**: `dfx stop && dfx start --background --clean`
3. **Clear browser storage**: DevTools → Application → Clear Local Storage
4. **Reconnect**: Disconnect and reconnect wallet

### If Account Info Doesn't Load
1. **Hard refresh**: `Ctrl+Shift+R`
2. **Check console**: Should not see "Cannot find required field principal"
3. **Verify registration**: Try registering again if needed

## 🎯 Success Metrics

Judges should understand:
- ✅ **Problem**: Crypto assets lost if owner dies
- ✅ **Solution**: Automated transfer via dead man switch
- ✅ **How it works**: Registration → Heartbeat → Auto-transfer
- ✅ **Technical**: Rust canister, React frontend, ICP platform
- ✅ **Future potential**: Mainnet deployment, multiple beneficiaries, mobile app

## 🚀 Quick Commands for Demo

```bash
# Check canister status
dfx canister status deadman_switch

# Register via CLI (backup method)
dfx canister call deadman_switch register '(record {
  timeout_duration_seconds = 60 : nat64;
  beneficiary = principal "n6zln-pg2w3-lgcsc-vk5vu-dv5a6-wptu2-jyzwy-tzkay-6xwzb-k5ujs-lqe";
})'

# Add mock balance for demo (0.5 ckBTC)
./add-mock-balance.sh 0.5

# Send heartbeat
dfx canister call deadman_switch heartbeat

# Check account info
dfx canister call deadman_switch get_account_info
```

## 📋 Demo Checklist

Before starting demo:
- [ ] Replica is running (`dfx ping`)
- [ ] Canisters are deployed (`dfx canister status`)
- [ ] Frontend is running (`http://localhost:3002`)
- [ ] Browser cache cleared
- [ ] Test account registered (via frontend)
- [ ] Mock balance added (optional): `./add-mock-balance.sh 0.5`

During demo:
- [ ] Connect wallet successfully
- [ ] Register account (or show already registered)
- [ ] Show account dashboard
- [ ] Send heartbeat
- [ ] Show transaction history
- [ ] Explain timeout mechanism

## 💡 Key Points to Emphasize

1. **Decentralized**: No central authority, runs on ICP
2. **Automated**: No manual intervention needed
3. **Transparent**: All actions on-chain
4. **Secure**: Internet Identity authentication
5. **Scalable**: Canister architecture supports growth

## 🎬 Demo Flow Summary

1. **Connect** (10s) → Show Internet Identity login
2. **Register** (30s) → Fill form, show success
3. **Dashboard** (30s) → Show account info, balance, settings
4. **Heartbeat** (20s) → Send heartbeat, show timer reset
5. **History** (20s) → Show transaction log
6. **Explain** (30s) → Timeout mechanism, auto-transfer
7. **Technical** (60s) → Architecture, ICP, Rust, React
8. **Roadmap** (30s) → Future features, mainnet deployment

**Total: ~5 minutes**
