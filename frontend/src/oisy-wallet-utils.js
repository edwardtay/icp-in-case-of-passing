// OISY Wallet Enhanced API Utilities
// Provides additional wallet information APIs for OISY wallet integration
// Reference: https://github.com/dfinity/oisy-wallet

import { Principal } from '@dfinity/principal';
import { Actor, HttpAgent } from '@dfinity/agent';

/**
 * Get OISY wallet instance if available
 * @returns {Object|null} OISY wallet instance or null
 */
export function getOisyWallet() {
  if (typeof window !== 'undefined' && window.ic?.oisy) {
    return window.ic.oisy;
  }
  return null;
}

/**
 * Check if OISY wallet is connected
 * @returns {boolean} True if OISY is connected
 */
export function isOisyConnected() {
  const oisy = getOisyWallet();
  return oisy && oisy.principalId !== null && oisy.principalId !== undefined;
}

/**
 * Get connected principal from OISY wallet
 * @returns {string|null} Principal ID or null
 */
export function getOisyPrincipal() {
  const oisy = getOisyWallet();
  if (oisy && isOisyConnected()) {
    return oisy.principalId;
  }
  return null;
}

/**
 * Get OISY wallet agent for making canister calls
 * @returns {HttpAgent|null} HttpAgent instance or null
 */
export function getOisyAgent() {
  const oisy = getOisyWallet();
  if (oisy && oisy.agent) {
    return oisy.agent;
  }
  return null;
}

/**
 * Get OISY wallet identity
 * @returns {Identity|null} Identity instance or null
 */
export function getOisyIdentity() {
  const oisy = getOisyWallet();
  if (oisy && oisy.agent) {
    try {
      return oisy.agent.getIdentity();
    } catch (e) {
      console.warn('Could not get OISY identity:', e);
      return null;
    }
  }
  return null;
}

/**
 * Get comprehensive wallet information from OISY
 * @returns {Promise<Object>} Wallet information object
 */
export async function getOisyWalletInfo() {
  const oisy = getOisyWallet();
  
  if (!oisy) {
    throw new Error('OISY wallet not detected');
  }

  if (!isOisyConnected()) {
    throw new Error('OISY wallet not connected');
  }

  try {
    const principal = oisy.principalId;
    const agent = oisy.agent;
    const identity = getOisyIdentity();

    return {
      principal: principal,
      principalText: typeof principal === 'string' ? principal : principal?.toText?.() || String(principal),
      agent: agent,
      identity: identity,
      isConnected: true,
      walletType: 'oisy',
      // Additional OISY-specific info if available
      walletVersion: oisy.version || 'unknown',
      // Network info
      network: agent?._host || 'unknown'
    };
  } catch (error) {
    console.error('Error getting OISY wallet info:', error);
    throw new Error(`Failed to get OISY wallet info: ${error.message}`);
  }
}

/**
 * Get ICP balance using OISY wallet agent
 * @param {string} principalText - Principal ID (optional, uses connected wallet if not provided)
 * @returns {Promise<Object>} Balance information
 */
export async function getOisyICPBalance(principalText = null) {
  const oisy = getOisyWallet();
  
  if (!oisy || !isOisyConnected()) {
    throw new Error('OISY wallet not connected');
  }

  try {
    const principal = principalText 
      ? Principal.fromText(principalText)
      : Principal.fromText(oisy.principalId);
    
    const agent = oisy.agent;
    const ICP_LEDGER_CANISTER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
    
    // Create ICRC-1 IDL factory
    const idlFactory = ({ IDL }) => {
      const Account = IDL.Record({
        owner: IDL.Principal,
        subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
      });
      
      return IDL.Service({
        icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query']),
        icrc1_decimals: IDL.Func([], [IDL.Nat8], ['query']),
        icrc1_symbol: IDL.Func([], [IDL.Text], ['query']),
        icrc1_name: IDL.Func([], [IDL.Text], ['query']),
      });
    };

    const ledgerCanister = Principal.fromText(ICP_LEDGER_CANISTER_ID);
    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: ledgerCanister,
    });

    const account = {
      owner: principal,
      subaccount: [],
    };

    const balance = await actor.icrc1_balance_of(account);
    const decimals = await actor.icrc1_decimals();
    const symbol = await actor.icrc1_symbol();
    const name = await actor.icrc1_name();

    const balanceNumber = Number(balance);
    const humanReadable = balanceNumber / Math.pow(10, Number(decimals));

    return {
      success: true,
      balance: balanceNumber,
      balanceFormatted: humanReadable,
      symbol: symbol,
      name: name,
      decimals: Number(decimals),
      principal: principal.toText(),
    };
  } catch (error) {
    console.error('Error getting ICP balance from OISY:', error);
    return {
      success: false,
      error: error.message,
      balance: 0,
      balanceFormatted: 0,
    };
  }
}

/**
 * Get ckBTC balance using OISY wallet agent
 * @param {string} principalText - Principal ID (optional, uses connected wallet if not provided)
 * @param {string} ledgerCanisterId - ckBTC ledger canister ID (defaults to testnet)
 * @returns {Promise<Object>} Balance information
 */
export async function getOisyCkBTCBalance(principalText = null, ledgerCanisterId = 'mxzaz-hqaaa-aaaar-qaada-cai') {
  const oisy = getOisyWallet();
  
  if (!oisy || !isOisyConnected()) {
    throw new Error('OISY wallet not connected');
  }

  try {
    const principal = principalText 
      ? Principal.fromText(principalText)
      : Principal.fromText(oisy.principalId);
    
    const agent = oisy.agent;
    
    // Create ICRC-1 IDL factory
    const idlFactory = ({ IDL }) => {
      const Account = IDL.Record({
        owner: IDL.Principal,
        subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
      });
      
      return IDL.Service({
        icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query']),
        icrc1_decimals: IDL.Func([], [IDL.Nat8], ['query']),
        icrc1_symbol: IDL.Func([], [IDL.Text], ['query']),
        icrc1_name: IDL.Func([], [IDL.Text], ['query']),
      });
    };

    const ledgerCanister = Principal.fromText(ledgerCanisterId);
    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: ledgerCanister,
    });

    const account = {
      owner: principal,
      subaccount: [],
    };

    const balance = await actor.icrc1_balance_of(account);
    const decimals = await actor.icrc1_decimals();
    const symbol = await actor.icrc1_symbol();
    const name = await actor.icrc1_name();

    const balanceNumber = Number(balance);
    const humanReadable = balanceNumber / Math.pow(10, Number(decimals));

    return {
      success: true,
      balance: balanceNumber,
      balanceFormatted: humanReadable,
      symbol: symbol,
      name: name,
      decimals: Number(decimals),
      principal: principal.toText(),
    };
  } catch (error) {
    console.error('Error getting ckBTC balance from OISY:', error);
    return {
      success: false,
      error: error.message,
      balance: 0,
      balanceFormatted: 0,
    };
  }
}

/**
 * Get all token balances for OISY wallet
 * @param {Array} tokenConfigs - Array of token configurations
 * @returns {Promise<Array>} Array of balance results
 */
export async function getOisyAllBalances(tokenConfigs = []) {
  const oisy = getOisyWallet();
  
  if (!oisy || !isOisyConnected()) {
    throw new Error('OISY wallet not connected');
  }

  const principal = Principal.fromText(oisy.principalId);
  const agent = oisy.agent;
  const results = [];

  // Default tokens if none provided
  const defaultTokens = [
    {
      name: 'Internet Computer',
      symbol: 'ICP',
      decimals: 8,
      canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
      icon: '🌐',
      color: '#29ABE2'
    },
    {
      name: 'Chain-key Bitcoin',
      symbol: 'ckBTC',
      decimals: 8,
      canisterId: 'mxzaz-hqaaa-aaaar-qaada-cai',
      icon: '₿',
      color: '#F7931A'
    }
  ];

  const tokensToCheck = tokenConfigs.length > 0 ? tokenConfigs : defaultTokens;

  for (const tokenInfo of tokensToCheck) {
    try {
      const idlFactory = ({ IDL }) => {
        const Account = IDL.Record({
          owner: IDL.Principal,
          subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
        });
        
        return IDL.Service({
          icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query']),
          icrc1_decimals: IDL.Func([], [IDL.Nat8], ['query']),
        });
      };

      const tokenCanister = Principal.fromText(tokenInfo.canisterId);
      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: tokenCanister,
      });

      const account = {
        owner: principal,
        subaccount: [],
      };

      const balance = await actor.icrc1_balance_of(account);
      const decimals = tokenInfo.decimals || 8;
      
      const balanceNumber = Number(balance);
      const humanReadable = balanceNumber / Math.pow(10, decimals);

      results.push({
        success: true,
        balance: balanceNumber,
        balanceFormatted: humanReadable,
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
        icon: tokenInfo.icon,
        color: tokenInfo.color,
        decimals: decimals,
        hasBalance: balanceNumber > 0
      });
    } catch (error) {
      console.error(`Error fetching ${tokenInfo.symbol} balance from OISY:`, error);
      results.push({
        success: false,
        error: error.message,
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
        icon: tokenInfo.icon,
        balance: 0,
        balanceFormatted: 0,
        hasBalance: false
      });
    }
  }

  return results;
}

/**
 * Disconnect OISY wallet
 * @returns {Promise<boolean>} True if disconnected successfully
 */
export async function disconnectOisy() {
  const oisy = getOisyWallet();
  
  if (!oisy) {
    return false;
  }

  try {
    if (oisy.disconnect) {
      await oisy.disconnect();
    }
    return true;
  } catch (error) {
    console.error('Error disconnecting OISY:', error);
    return false;
  }
}

export default {
  getOisyWallet,
  isOisyConnected,
  getOisyPrincipal,
  getOisyAgent,
  getOisyIdentity,
  getOisyWalletInfo,
  getOisyICPBalance,
  getOisyCkBTCBalance,
  getOisyAllBalances,
  disconnectOisy,
};




