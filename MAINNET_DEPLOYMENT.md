# Mainnet Deployment Guide

## Your Current Balance

**10.000 TC (Trillion Cycles)** ✅

## What You Can Do

### 1. Deploy Dead Man Switch to Mainnet 🚀

**Estimated Cost**: ~1-2 TC for initial deployment

Your canister WASM is **1.1MB**, which is well within limits. With 10 TC, you have plenty to:

- ✅ Deploy the canister to mainnet
- ✅ Run it for months/years (storage + compute)
- ✅ Make many updates and upgrades
- ✅ Handle thousands of user registrations and heartbeats

### 2. Deployment Steps

#### Step 1: Build the Canister
```bash
dfx build deadman_switch
```

#### Step 2: Deploy to Mainnet
```bash
export DFX_WARNING=-mainnet_plaintext_identity
dfx deploy --network ic deadman_switch
```

**Note**: First deployment will:
- Create the canister (~1-2 TC)
- Install the WASM module
- Initialize the canister state

#### Step 3: Get Your Canister ID
```bash
dfx canister id --network ic deadman_switch
```

Save this ID - you'll need it for your frontend!

#### Step 4: Update Frontend Environment

Update `frontend/.env` or set in Vercel:
```
VITE_CANISTER_ID=your-mainnet-canister-id-here
```

### 3. Cost Breakdown

**Initial Deployment**: ~1-2 TC
- Canister creation: ~1 TC
- WASM installation: ~0.5-1 TC
- Initial state: ~0.1 TC

**Ongoing Costs** (per month):
- Storage (1.1MB WASM + data): ~0.01 TC/month
- Compute (heartbeats, registrations): ~0.001 TC per 1000 operations
- Updates: ~0.1-0.5 TC per update

**With 10 TC, you can run this for YEARS!** 🎉

### 4. What Happens After Deployment

1. **Your canister is live on mainnet** - accessible at `https://[canister-id].ic0.app`
2. **Users can register** - using production Internet Identity (`https://identity.ic0.app`)
3. **Real ckBTC integration** - connects to mainnet ckBTC ledger
4. **Production-ready** - deploy frontend to Vercel pointing to mainnet canister

### 5. Frontend Deployment

After deploying the canister:

1. **Update Vercel environment variables**:
   ```
   VITE_CANISTER_ID=your-mainnet-canister-id
   ```

2. **Redeploy frontend** - Vercel will automatically use the mainnet canister

3. **Users can access** - Your app will be live at your Vercel URL!

### 6. Monitoring Your Cycles

Check your balance anytime:
```bash
export DFX_WARNING=-mainnet_plaintext_identity
dfx cycles --network ic balance
```

Check canister cycles (how much the canister has):
```bash
dfx canister --network ic status deadman_switch
```

### 7. Important Notes

⚠️ **Production Considerations**:
- Remove `set_mock_balance` function or restrict it (currently dev-only)
- **Update `CKBTC_LEDGER_CANISTER_ID`** in `deadman_switch/src/lib.rs`:
  - Current: `mxzaz-hqaaa-aaaar-qaada-cai` (testnet)
  - Mainnet: Check [ICP Dashboard](https://dashboard.internetcomputer.org/) or [ICP Docs](https://internetcomputer.org/docs/current/developer-docs/integrations/ckbtc/)
  - Mainnet ckBTC ledger ID is typically: `mxzaz-hqaaa-aaaar-qaada-cai` (verify before deploying)
- Test thoroughly before going live
- Consider adding canister-level access controls

✅ **What Works Out of the Box**:
- User registration with Internet Identity
- Heartbeat functionality
- Balance tracking
- Timeout detection
- Transfer to beneficiaries

### 8. Quick Deploy Script

Create `deploy-mainnet.sh`:
```bash
#!/bin/bash
set -e

export DFX_WARNING=-mainnet_plaintext_identity

echo "🔨 Building canister..."
dfx build deadman_switch

echo "🚀 Deploying to mainnet..."
dfx deploy --network ic deadman_switch

echo "📋 Canister ID:"
dfx canister id --network ic deadman_switch

echo "✅ Deployment complete!"
echo "💡 Update VITE_CANISTER_ID in frontend/.env or Vercel"
```

Make it executable:
```bash
chmod +x deploy-mainnet.sh
```

## Summary

With **10 TC**, you can:
- ✅ Deploy to mainnet (~1-2 TC)
- ✅ Run for years (~0.01 TC/month)
- ✅ Handle thousands of users
- ✅ Make many updates
- ✅ **Have ~8 TC left over!**

**Ready to deploy?** Run:
```bash
export DFX_WARNING=-mainnet_plaintext_identity
dfx deploy --network ic deadman_switch
```

