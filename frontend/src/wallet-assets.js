// Wallet Assets Utilities - Fetch token balances from ICP wallets
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// Common ICRC-1 token canister IDs (mainnet)
export const TOKEN_CANISTERS = {
  ICP: {
    name: 'Internet Computer',
    symbol: 'ICP',
    decimals: 8,
    canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai', // ICP Ledger
    icon: '🌐',
    color: '#29ABE2'
  },
  ckBTC: {
    name: 'Chain-key Bitcoin',
    symbol: 'ckBTC',
    decimals: 8,
    canisterId: 'mxzaz-hqaaa-aaaar-qaada-cai', // Testnet ckBTC (update for mainnet)
    icon: '₿',
    color: '#F7931A'
  },
  // Add more tokens as needed
  // ckETH: {
  //   name: 'Chain-key Ethereum',
  //   symbol: 'ckETH',
  //   decimals: 18,
  //   canisterId: 'ss2fx-dyaaa-aaaar-qacoq-cai',
  //   icon: 'Ξ',
  //   color: '#627EEA'
  // }
};

// Minimal ICRC-1 IDL for balance queries - using factory function to avoid global issues
const createICRC1Idl = async () => {
  // Import IDL dynamically to avoid "global is not defined" error
  const { IDL } = await import('@dfinity/candid');
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

/**
 * Get balance for a specific token
 * @param {Principal} principal - User's principal
 * @param {string} canisterId - Token canister ID
 * @param {Object} tokenInfo - Token information
 * @param {HttpAgent} agent - HTTP agent (optional, will create if not provided)
 * @returns {Promise<Object>} - Balance information
 */
export async function getTokenBalance(principal, canisterId, tokenInfo, agent = null) {
  try {
    if (!agent) {
      agent = new HttpAgent({
        host: import.meta.env.DEV ? 'http://localhost:4943' : 'https://ic0.app',
      });
      
      if (import.meta.env.DEV) {
        await agent.fetchRootKey();
      }
    }

    const tokenCanister = Principal.fromText(canisterId);
    
    // Get IDL - import dynamically to avoid "global is not defined" error
    const idl = await createICRC1Idl();
    
    const actor = Actor.createActor(idl, {
      agent,
      canisterId: tokenCanister,
    });

    // Create account from principal
    const account = {
      owner: principal,
      subaccount: [],
    };

    // Get balance
    const balance = await actor.icrc1_balance_of(account);
    const decimals = tokenInfo.decimals || 8;
    
    // Convert from smallest unit to human-readable
    const balanceNumber = Number(balance);
    const humanReadable = balanceNumber / Math.pow(10, decimals);

    return {
      success: true,
      balance: balanceNumber,
      balanceFormatted: humanReadable,
      symbol: tokenInfo.symbol,
      name: tokenInfo.name,
      icon: tokenInfo.icon,
      color: tokenInfo.color,
      decimals: decimals,
      hasBalance: balanceNumber > 0
    };
  } catch (error) {
    console.error(`Error fetching ${tokenInfo.symbol} balance:`, error);
    return {
      success: false,
      error: error.message,
      symbol: tokenInfo.symbol,
      name: tokenInfo.name,
      icon: tokenInfo.icon,
      balance: 0,
      balanceFormatted: 0,
      hasBalance: false
    };
  }
}

/**
 * Get all token balances for a principal
 * @param {Principal} principal - User's principal
 * @param {HttpAgent} agent - HTTP agent (optional)
 * @param {Array} tokens - Array of token configs to check (defaults to all)
 * @returns {Promise<Array>} - Array of balance results
 */
export async function getAllTokenBalances(principal, agent = null, tokens = null) {
  const tokensToCheck = tokens || Object.values(TOKEN_CANISTERS);
  const results = [];

  // Fetch all balances in parallel
  const promises = tokensToCheck.map(tokenInfo => 
    getTokenBalance(principal, tokenInfo.canisterId, tokenInfo, agent)
  );

  const balances = await Promise.allSettled(promises);
  
  balances.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      // Handle failed requests
      const tokenInfo = tokensToCheck[index];
      results.push({
        success: false,
        error: result.reason?.message || 'Unknown error',
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
        icon: tokenInfo.icon,
        balance: 0,
        balanceFormatted: 0,
        hasBalance: false
      });
    }
  });

  return results;
}

/**
 * Format balance for display
 * @param {number} balance - Balance in smallest unit
 * @param {number} decimals - Number of decimals
 * @returns {string} - Formatted balance string
 */
export function formatTokenBalance(balance, decimals = 8) {
  const humanReadable = balance / Math.pow(10, decimals);
  
  if (humanReadable === 0) return '0';
  if (humanReadable < 0.0001) return '< 0.0001';
  if (humanReadable < 1) return humanReadable.toFixed(6);
  if (humanReadable < 1000) return humanReadable.toFixed(4);
  if (humanReadable < 1000000) return humanReadable.toFixed(2);
  
  return humanReadable.toLocaleString('en-US', { 
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
}

/**
 * Get total portfolio value (if prices available)
 * @param {Array} balances - Array of balance results
 * @param {Object} prices - Price data object { symbol: price }
 * @returns {number} - Total USD value
 */
export function calculatePortfolioValue(balances, prices = {}) {
  return balances.reduce((total, token) => {
    if (!token.hasBalance) return total;
    const price = prices[token.symbol] || 0;
    return total + (token.balanceFormatted * price);
  }, 0);
}

export default {
  TOKEN_CANISTERS,
  getTokenBalance,
  getAllTokenBalances,
  formatTokenBalance,
  calculatePortfolioValue
};

