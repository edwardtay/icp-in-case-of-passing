import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from './deadman_switch.did.js';

// Canister ID - will be set from environment or dfx
// Default to local canister ID if env var not set
const CANISTER_ID = import.meta.env.VITE_CANISTER_ID || 'uqqxf-5h777-77774-qaaaa-cai';

// Debug: Log canister ID to verify it's correct
console.log('🔍 Canister ID:', CANISTER_ID, 'Env var:', import.meta.env.VITE_CANISTER_ID);

// For local development, use localhost
const HOST = import.meta.env.DEV 
  ? 'http://localhost:4943'
  : 'https://ic0.app';

let cachedActor = null;
let cachedIdentity = null;

export async function createActor(identity = null) {
  // If identity is provided, use it; otherwise try to get from auth client
  let agentIdentity = identity;
  
  if (!agentIdentity) {
    try {
      const { AuthClient } = await import('@dfinity/auth-client');
      const authClient = await AuthClient.create();
      agentIdentity = await authClient.getIdentity();
      
      // Check if identity is valid (not anonymous and has valid delegation)
      if (!agentIdentity || agentIdentity.getPrincipal().isAnonymous()) {
        throw new Error('Invalid identity: anonymous or missing');
      }
      
      cachedIdentity = agentIdentity;
    } catch (error) {
      console.warn('No identity found, using anonymous');
      throw new Error('Authentication required. Please connect your wallet first.');
    }
  } else {
    cachedIdentity = agentIdentity;
  }

  // Always create a fresh agent to avoid stale certificate issues
  const agent = new HttpAgent({
    host: HOST,
    identity: agentIdentity,
    // Disable verification for local development to avoid certificate issues
    verifyQuerySignatures: false,
  });

  // For local development, fetch root key (required for certificate verification)
  if (import.meta.env.DEV || HOST.includes('localhost')) {
    try {
      await agent.fetchRootKey();
      console.log('Root key fetched successfully for local development');
    } catch (error) {
      console.error('Could not fetch root key:', error);
      // This is critical for local dev - throw to prevent invalid certificate errors
      throw new Error('Failed to fetch root key. Make sure local replica is running: dfx start');
    }
  }

  // Don't cache actor - create fresh each time to avoid stale state
  return Actor.createActor(idlFactory, {
    agent,
    canisterId: CANISTER_ID,
  });
}

// Function to clear cached identity (useful when replica restarts)
export function clearCachedIdentity() {
  cachedIdentity = null;
  cachedActor = null;
}

export function getCachedIdentity() {
  return cachedIdentity;
}

export { CANISTER_ID };
