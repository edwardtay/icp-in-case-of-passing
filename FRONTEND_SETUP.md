# Frontend Setup Guide

Quick guide to get the frontend running on localhost.

## Prerequisites

1. **DFX running**: `dfx start` (in a separate terminal)
2. **Canister deployed**: `dfx deploy deadman_switch`
3. **Node.js 18+**: Check with `node --version`

## Quick Start

### Option 1: Use the start script (Recommended)

```bash
./start-frontend.sh
```

This script will:
- Check if canister is deployed
- Get the canister ID
- Create .env file
- Install dependencies (if needed)
- Start the dev server

### Option 2: Manual setup

```bash
# 1. Deploy canister (if not already deployed)
dfx deploy deadman_switch

# 2. Get canister ID and set environment variable
cd frontend
CANISTER_ID=$(dfx canister id deadman_switch)
echo "VITE_CANISTER_ID=$CANISTER_ID" > .env

# 3. Install dependencies
npm install

# 4. Start dev server
npm run dev
```

## Access the Frontend

Once running, open your browser to:
**http://localhost:3000**

## First Time Setup

1. **Connect Wallet**: Click "Connect Wallet" button
2. **Create Internet Identity**: If you don't have one, create a new Internet Identity
3. **Register Account**: Fill in timeout duration and beneficiary principal
4. **Send Heartbeat**: Test the heartbeat functionality
5. **Deposit**: Record a ckBTC deposit (after transferring to canister)

## Troubleshooting

### Port 3000 already in use

Change the port in `frontend/vite.config.js`:
```javascript
server: {
  port: 3001, // Change to available port
}
```

### Canister ID not found

Make sure:
- DFX is running: `dfx start`
- Canister is deployed: `dfx deploy deadman_switch`
- Check canister ID: `dfx canister id deadman_switch`

### Authentication not working

For local development:
- Internet Identity runs on `http://localhost:4943`
- Make sure dfx is running
- Try clearing browser cache/localStorage

### Module not found errors

Reinstall dependencies:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Development

### Hot Reload

Vite provides instant hot module replacement. Changes to React components will update automatically.

### View Logs

Check browser console (F12) for:
- Canister connection status
- API call results
- Error messages

### Test Different Functions

1. **Register**: Create a new account
2. **Heartbeat**: Reset timeout timer
3. **Deposit**: Record ckBTC deposit
4. **Account Info**: View account status

## Production Build

To build for production:

```bash
cd frontend
npm run build
```

Output will be in `frontend/dist/` directory.

## Notes

- Frontend connects to local canister via DFX proxy (port 4943)
- Authentication uses Internet Identity (local for dev)
- All canister calls require authentication
- Canister ID is set via environment variable

