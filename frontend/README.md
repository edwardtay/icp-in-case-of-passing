# Dead Man Switch Frontend

React frontend for the Dead Man Switch Canister, running on localhost.

## Quick Start

### Prerequisites

- Node.js 18+ installed
- DFX running locally (`dfx start`)
- Canister deployed locally (`dfx deploy`)

### Start Frontend

```bash
# From project root
./start-frontend.sh

# Or manually:
cd frontend
npm install
npm run dev
```

The frontend will be available at **http://localhost:3000**

## Manual Setup

1. **Deploy canister locally**:
   ```bash
   dfx start --background
   dfx deploy deadman_switch
   ```

2. **Get canister ID**:
   ```bash
   dfx canister id deadman_switch
   ```

3. **Set environment variable**:
   ```bash
   cd frontend
   echo "VITE_CANISTER_ID=$(dfx canister id deadman_switch)" > .env
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Start dev server**:
   ```bash
   npm run dev
   ```

## Features

- 🔐 **Internet Identity Authentication**: Connect with your Internet Identity
- 📝 **User Registration**: Register with timeout and beneficiary
- 💓 **Heartbeat**: Send heartbeats to reset timeout
- 💰 **Deposit Tracking**: Record ckBTC deposits
- 📊 **Account Dashboard**: View account status and information

## Development

### Project Structure

```
frontend/
├── src/
│   ├── App.jsx              # Main application component
│   ├── App.css              # Styles
│   ├── main.jsx             # Entry point
│   ├── index.css            # Global styles
│   ├── canister.js          # Canister connection utilities
│   └── deadman_switch.did.js # Candid IDL factory
├── index.html               # HTML template
├── vite.config.js           # Vite configuration
└── package.json             # Dependencies
```

### Environment Variables

- `VITE_CANISTER_ID`: The canister ID (set automatically by start script)

### Building for Production

```bash
npm run build
npm run preview
```

## Troubleshooting

### Canister Not Found

Make sure the canister is deployed:
```bash
dfx deploy deadman_switch
```

### Authentication Issues

For local development, Internet Identity runs on `http://localhost:4943`. Make sure dfx is running:
```bash
dfx start
```

### CORS Issues

The frontend connects to the local canister via the DFX proxy. Ensure dfx is running on the default port (4943).

## Notes

- The frontend uses Vite for fast development
- Authentication uses Internet Identity (local for dev, ic0.app for production)
- All canister calls are authenticated with the user's identity

