# Vercel Deployment Guide

## Prerequisites

1. **Deploy canister to mainnet** (required for production)
   ```bash
   dfx deploy --network ic deadman_switch
   ```

2. **Get canister ID**
   ```bash
   dfx canister id --network ic deadman_switch
   ```

## Vercel Setup

### 1. Install Vercel CLI (optional)
```bash
npm i -g vercel
```

### 2. Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` (or leave blank if deploying from root)
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`

### 3. Set Environment Variables

In Vercel project settings → Environment Variables, add:

```
VITE_CANISTER_ID=your-mainnet-canister-id-here
```

**Important**: Replace `your-mainnet-canister-id-here` with your actual mainnet canister ID.

### 4. Deploy

Click "Deploy" and wait for build to complete.

## Configuration Files

- `vercel.json` - Vercel configuration (already created)
- `frontend/vite.config.js` - Vite build configuration (updated)

## Environment Detection

The app automatically detects production vs development:

- **Development**: Uses `http://localhost:4943` and local Internet Identity
- **Production**: Uses `https://ic0.app` and production Internet Identity (`https://identity.ic0.app`)

## Troubleshooting

### Build Fails

1. Check that `frontend/package.json` has all dependencies
2. Verify Node.js version (Vercel uses Node 18+ by default)
3. Check build logs in Vercel dashboard

### Canister Not Found

1. Verify `VITE_CANISTER_ID` environment variable is set correctly
2. Make sure canister is deployed to mainnet
3. Check browser console for errors

### Authentication Issues

- Production uses `https://identity.ic0.app` (mainnet Internet Identity)
- Users need to authenticate with their Internet Identity
- Make sure canister allows mainnet Internet Identity principals

## Notes

- Vercel automatically handles HTTPS
- The app is a Single Page Application (SPA) - all routes redirect to `index.html`
- Static assets are served from `frontend/dist`
- Environment variables prefixed with `VITE_` are available in the browser

## Quick Deploy Command

```bash
# From project root
cd frontend
vercel --prod
```

Or use Vercel dashboard for easier management.

