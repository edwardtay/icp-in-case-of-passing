// Wallet detection and connection utilities

export const WALLETS = {
  // OISY is recommended and listed first
  OISY: {
    id: 'oisy',
    name: 'OISY',
    icon: '🌊',
    downloadUrl: 'https://www.oisy.com/',
    check: () => typeof window !== 'undefined' && window.ic?.oisy,
    recommended: true, // Mark as recommended
  },
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
  
  // Log what we're checking for debugging
  console.log('Detecting ICP wallets...', {
    hasWindow: typeof window !== 'undefined',
    hasWindowIc: typeof window !== 'undefined' && !!window.ic,
    windowIcKeys: typeof window !== 'undefined' && window.ic ? Object.keys(window.ic) : []
  });
  
  for (const [key, wallet] of Object.entries(WALLETS)) {
    const isAvailable = wallet.check();
    if (isAvailable) {
      console.log(`✓ ${wallet.name} detected`);
      detected.push(wallet);
    } else {
      console.log(`✗ ${wallet.name} not detected`);
    }
  }
  
  console.log(`Detected ${detected.length} wallet(s):`, detected.map(w => w.name));
  return detected;
}

/**
 * Set up wallet detection listeners (similar to EVM wallet detection)
 * Listens for wallet injection events and polls periodically
 */
export function setupWalletDetection(callback) {
  if (typeof window === 'undefined') return () => {};
  
  let lastDetectedCount = 0;
  
  // Initial detection
  const detected = detectWallets();
  lastDetectedCount = detected.length;
  if (callback) callback(detected);
  
  // Poll for wallets periodically (wallets may inject after page load)
  let pollCount = 0;
  const maxPolls = 20; // Poll for 20 seconds
  const pollInterval = setInterval(() => {
    pollCount++;
    const currentDetected = detectWallets();
    
    // If we detect new wallets or count changed, notify
    if (currentDetected.length !== lastDetectedCount && callback) {
      lastDetectedCount = currentDetected.length;
      callback(currentDetected);
      console.log('Wallet detection changed:', currentDetected.map(w => w.name));
    }
    
    // Stop polling after max attempts
    if (pollCount >= maxPolls) {
      clearInterval(pollInterval);
      console.log('Stopped polling for wallets after', maxPolls, 'seconds');
    }
  }, 1000);
  
  // Listen for focus events (user might have installed wallet in another tab)
  const checkOnFocus = () => {
    const currentDetected = detectWallets();
    if (currentDetected.length !== lastDetectedCount && callback) {
      lastDetectedCount = currentDetected.length;
      callback(currentDetected);
      console.log('Wallet detection updated on focus:', currentDetected.map(w => w.name));
    }
  };
  
  window.addEventListener('focus', checkOnFocus);
  
  // Return cleanup function
  return () => {
    clearInterval(pollInterval);
    window.removeEventListener('focus', checkOnFocus);
  };
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
      
      // Log OISY wallet info for debugging
      console.log('OISY Wallet Connected:', {
        principal: typeof principal === 'string' ? principal : principal?.toText?.(),
        hasAgent: !!window.ic.oisy.agent,
        walletType: 'oisy',
        // Additional OISY info if available
        version: window.ic.oisy.version || 'unknown'
      });
      
      return {
        principal: typeof principal === 'string' ? principal : principal?.toText?.(),
        identity: identity,
        // Include agent for additional API calls
        agent: window.ic.oisy.agent,
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
    // Use local Internet Identity for local development, production for mainnet
    let identityProvider = 'https://identity.ic0.app';
    
    // For local development, use local Internet Identity
    if (import.meta.env.DEV) {
      const LOCAL_II_CANISTER_ID = 'uzt4z-lp777-77774-qaabq-cai';
      // Use the proper format for local Internet Identity
      identityProvider = `http://${LOCAL_II_CANISTER_ID}.localhost:4943`;
      console.log('Using local Internet Identity for development:', identityProvider);
    } else {
      console.log('Using production Internet Identity');
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
