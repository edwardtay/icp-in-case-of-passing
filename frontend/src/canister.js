import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from './deadman_switch.did.js';

// Canister ID - will be set from environment or dfx
const CANISTER_ID = import.meta.env.VITE_CANISTER_ID || 'rrkah-fqaaa-aaaaa-aaaaq-cai';

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
      cachedIdentity = agentIdentity;
    } catch (error) {
      console.warn('No identity found, using anonymous');
    }
  } else {
    cachedIdentity = agentIdentity;
  }

  const agent = new HttpAgent({
    host: HOST,
    identity: agentIdentity,
  });

  // For local development, fetch root key
  if (import.meta.env.DEV) {
    try {
      await agent.fetchRootKey();
    } catch (error) {
      console.warn('Could not fetch root key:', error);
    }
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: CANISTER_ID,
  });
}

export function getCachedIdentity() {
  return cachedIdentity;
}

export { CANISTER_ID };
