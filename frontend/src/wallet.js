// Wallet detection and connection utilities

export const WALLETS = {
  PLUG: {
    id: 'plug',
    name: 'Plug',
    icon: '🔌',
    downloadUrl: 'https://plugwallet.ooo/',
    check: () => typeof window !== 'undefined' && window.ic?.plug,
  },
  STOIC: {
    id: 'stoic',
    name: 'Stoic',
    icon: '🛡️',
    downloadUrl: 'https://www.stoicwallet.com/',
    check: () => typeof window !== 'undefined' && window.ic?.stoic,
  },
  OISY: {
    id: 'oisy',
    name: 'OISY',
    icon: '🌊',
    downloadUrl: 'https://www.oisy.com/',
    check: () => typeof window !== 'undefined' && window.ic?.oisy,
  },
  BITFINITY: {
    id: 'bitfinity',
    name: 'Bitfinity',
    icon: '∞',
    downloadUrl: 'https://bitfinity.network/',
    check: () => typeof window !== 'undefined' && window.ic?.bitfinity,
  },
  INTERNET_IDENTITY: {
    id: 'ii',
    name: 'Internet Identity',
    icon: '🆔',
    downloadUrl: 'https://identity.ic0.app/',
    check: () => true, // Always available
  },
};

export function detectWallets() {
  const detected = [];
  
  for (const [key, wallet] of Object.entries(WALLETS)) {
    if (wallet.check()) {
      detected.push(wallet);
    }
  }
  
  return detected;
}

export async function connectPlug() {
  if (!window.ic?.plug) {
    throw new Error('Plug wallet not detected. Please install Plug wallet extension.');
  }
  
  try {
    // Plug wallet API
    const connected = await window.ic.plug.requestConnect({
      whitelist: [],
      host: import.meta.env.DEV ? 'http://localhost:4943' : 'https://ic0.app',
    });
    
    if (connected) {
      const principal = window.ic.plug.principalId;
      const identity = window.ic.plug.agent.getIdentity();
      
      return {
        principal: principal,
        identity: identity,
      };
    }
    throw new Error('Plug connection cancelled');
  } catch (error) {
    throw new Error(`Plug connection failed: ${error.message}`);
  }
}

export async function connectStoic() {
  if (!window.ic?.stoic) {
    throw new Error('Stoic wallet not detected. Please install Stoic wallet extension.');
  }
  
  try {
    // Stoic wallet API
    const connected = await window.ic.stoic.connect();
    
    if (connected) {
      const principal = window.ic.stoic.principalId;
      const identity = window.ic.stoic.agent.getIdentity();
      
      return {
        principal: principal,
        identity: identity,
      };
    }
    throw new Error('Stoic connection cancelled');
  } catch (error) {
    throw new Error(`Stoic connection failed: ${error.message}`);
  }
}

export async function connectOISY() {
  if (!window.ic?.oisy) {
    throw new Error('OISY wallet not detected. Please install OISY wallet extension.');
  }
  
  try {
    // OISY wallet API
    const connected = await window.ic.oisy.connect();
    
    if (connected) {
      const principal = window.ic.oisy.principalId;
      const identity = window.ic.oisy.agent.getIdentity();
      
      return {
        principal: principal,
        identity: identity,
      };
    }
    throw new Error('OISY connection cancelled');
  } catch (error) {
    throw new Error(`OISY connection failed: ${error.message}`);
  }
}

export async function connectBitfinity() {
  if (!window.ic?.bitfinity) {
    throw new Error('Bitfinity wallet not detected. Please install Bitfinity wallet extension.');
  }
  
  try {
    // Bitfinity wallet API
    const connected = await window.ic.bitfinity.connect();
    
    if (connected) {
      const principal = window.ic.bitfinity.principalId;
      const identity = window.ic.bitfinity.agent.getIdentity();
      
      return {
        principal: principal,
        identity: identity,
      };
    }
    throw new Error('Bitfinity connection cancelled');
  } catch (error) {
    throw new Error(`Bitfinity connection failed: ${error.message}`);
  }
}

export async function connectInternetIdentity() {
  try {
    const { AuthClient } = await import('@dfinity/auth-client');
    const authClient = await AuthClient.create();
    
    // Check if already logged in
    try {
      const existingIdentity = await authClient.getIdentity();
      if (existingIdentity && !existingIdentity.getPrincipal().isAnonymous()) {
        const principal = existingIdentity.getPrincipal().toText();
        console.log('Internet Identity: Using existing session', principal);
        return {
          principal: principal,
          identity: existingIdentity,
        };
      }
    } catch (e) {
      console.log('Internet Identity: No existing session found');
    }
    
    // If not logged in, show login prompt
    // Use production identity provider by default for better reliability
    // Only use localhost if explicitly configured and available
    let identityProvider = 'https://identity.ic0.app';
    
    // Check if we should use local identity provider
    if (import.meta.env.DEV && import.meta.env.VITE_USE_LOCAL_II === 'true') {
      // Try to detect if local DFX is running
      try {
        const response = await fetch('http://localhost:4943', { method: 'HEAD', mode: 'no-cors' });
        identityProvider = `http://localhost:4943?canisterId=${import.meta.env.VITE_CANISTER_ID || 'rdmx6-jaaaa-aaaaa-aaadq-cai'}`;
      } catch (e) {
        // Local DFX not running, use production
        console.log('Local DFX not detected, using production Internet Identity');
      }
    }
    
    console.log('Internet Identity: Starting login flow', { identityProvider });
    
    return new Promise((resolve, reject) => {
      authClient.login({
        identityProvider,
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
        onSuccess: () => {
          try {
            const identity = authClient.getIdentity();
            if (identity && !identity.getPrincipal().isAnonymous()) {
              const principal = identity.getPrincipal().toText();
              console.log('Internet Identity: Login successful', principal);
              resolve({
                principal: principal,
                identity: identity,
              });
            } else {
              console.error('Internet Identity: Identity is anonymous after login');
              reject(new Error('Failed to get identity after login. Please try again.'));
            }
          } catch (e) {
            console.error('Internet Identity: Error getting identity after login', e);
            reject(new Error('Failed to retrieve identity after login. Please try again.'));
          }
        },
        onError: (error) => {
          console.error('Internet Identity: Login error', error);
          const errorMsg = typeof error === 'string' ? error : error.message || 'Unknown error';
          reject(new Error(`Internet Identity connection failed: ${errorMsg}`));
        },
      });
    });
  } catch (error) {
    console.error('Internet Identity: Connection error', error);
    throw new Error(`Internet Identity connection failed: ${error.message}`);
  }
}

export async function connectWallet(walletId) {
  switch (walletId) {
    case 'plug':
      return await connectPlug();
    case 'stoic':
      return await connectStoic();
    case 'oisy':
      return await connectOISY();
    case 'bitfinity':
      return await connectBitfinity();
    case 'ii':
      return await connectInternetIdentity();
    default:
      throw new Error(`Unknown wallet: ${walletId}`);
  }
}
