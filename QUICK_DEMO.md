# 🚀 Quick Demo Guide (5 Minutes)

## Pre-Demo Setup (30 seconds)

```bash
# 1. Start everything
./demo.sh

# 2. Wait for frontend to start, then open:
# http://localhost:3002
```

## Demo Flow (4 minutes)

### 1. **Connect** (30s)
- Click "Connect" → Choose Internet Identity
- Show: Principal ID displayed
- **Say**: "Decentralized identity, no passwords needed"

### 2. **Register** (1 min)
- Fill form:
  - Timeout: **"1 minute (testing)"**
  - Beneficiary: Enter a different principal (or create one: `./create-beneficiary-identity.sh`)
- Click "Register Account"
- **Say**: "Sets up automated transfer if I miss heartbeat"

### 3. **Add Mock Balance** (30s)
- Click **"💰 Add Mock Balance (Demo)"** button in dashboard (only shows when balance is 0)
- Enter: `0.5` (or any amount)
- **Say**: "For demo, we add mock balance. In production, users deposit real ckBTC"
- Note: Button disappears after adding balance to keep UI clean

### 4. **Show Dashboard** (30s)
- Point out:
  - ✅ Balance: `0.50000000 ckBTC`
  - ✅ Beneficiary principal
  - ✅ Timeout: 1 minute
  - ✅ Last heartbeat timestamp
- **Say**: "All data stored on-chain, transparent"

### 5. **Send Heartbeat** (30s)
- Click **"Send Heartbeat"** button
- Show: Timer resets, success message
- **Say**: "This resets the countdown. Must send before timeout expires"

### 6. **Show Transaction History** (30s)
- Scroll to Transaction History
- Show: Mock deposit and heartbeat entries
- **Say**: "All actions are logged on-chain"

### 7. **Explain Timeout** (30s)
- **Say**: "If I don't send heartbeat within 1 minute, funds automatically transfer to beneficiary. This solves the 'what happens to my crypto if I die' problem."

## Key Talking Points

✅ **Decentralized** - Runs on Internet Computer, no central authority  
✅ **Automated** - No manual intervention needed  
✅ **Transparent** - All actions on-chain  
✅ **Secure** - Internet Identity authentication  
✅ **Real Use Case** - Solves crypto inheritance problem  

## Troubleshooting

**Can't connect?**
- Check: `dfx ping` (replica running?)
- Check: Frontend at `http://localhost:3002`

**No balance showing?**
- Click refresh button next to "Account Status"
- Or click "Add Mock Balance" again

**Registration fails?**
- Make sure beneficiary is different from your principal
- Check console for errors

## Quick Commands Reference

```bash
# Start everything
./demo.sh

# Add mock balance (CLI alternative)
./add-mock-balance.sh 0.5

# Create beneficiary identity
./create-beneficiary-identity.sh

# Check account info
dfx canister call deadman_switch get_account_info
```

---

**Total Demo Time: ~5 minutes**  
**Perfect for hackathon pitch! 🎯**

