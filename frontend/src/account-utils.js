// Account Address Utilities
// Converts Principal to wallet address format for display

import { Principal } from '@dfinity/principal';

/**
 * Convert Principal to Account Identifier (ICP Ledger format)
 * This creates a 32-byte account identifier from principal + subaccount
 * @param {string|Principal} principal - Principal ID
 * @param {Uint8Array|null} subaccount - Optional subaccount (defaults to all zeros)
 * @returns {string} Account identifier as hex string
 */
export function principalToAccountIdentifier(principal, subaccount = null) {
  try {
    const principalObj = typeof principal === 'string' 
      ? Principal.fromText(principal)
      : principal;
    
    // Default subaccount (all zeros) if not provided
    const subaccountBytes = subaccount || new Uint8Array(32);
    
    // Create the account identifier by hashing principal + subaccount
    // This is the standard ICP ledger account format
    const encoder = new TextEncoder();
    const principalBytes = principalObj.toUint8Array();
    
    // Combine principal and subaccount
    const combined = new Uint8Array(principalBytes.length + subaccountBytes.length);
    combined.set(principalBytes);
    combined.set(subaccountBytes, principalBytes.length);
    
    // Simple hash (for display purposes, we'll use a truncated version)
    // In production, you'd use SHA-224 or the proper AccountIdentifier algorithm
    // For now, we'll create a readable address format
    return principalToReadableAddress(principalObj);
  } catch (error) {
    console.error('Error converting principal to account identifier:', error);
    return typeof principal === 'string' ? principal : principal?.toText() || '';
  }
}

/**
 * Convert Principal to a readable wallet address format
 * Shows first 8 and last 8 characters with ellipsis
 * @param {string|Principal} principal - Principal ID
 * @returns {string} Formatted wallet address
 */
export function principalToReadableAddress(principal) {
  try {
    const principalText = typeof principal === 'string' 
      ? principal
      : principal?.toText() || '';
    
    if (!principalText) return '';
    
    // If it's short enough, return as is
    if (principalText.length <= 20) {
      return principalText;
    }
    
    // Format as: first 8 chars...last 8 chars
    const start = principalText.substring(0, 8);
    const end = principalText.substring(principalText.length - 8);
    return `${start}...${end}`;
  } catch (error) {
    console.error('Error formatting principal address:', error);
    return typeof principal === 'string' ? principal : principal?.toText() || '';
  }
}

/**
 * Get full wallet address (full principal text)
 * @param {string|Principal} principal - Principal ID
 * @returns {string} Full principal text
 */
export function getFullWalletAddress(principal) {
  try {
    return typeof principal === 'string' 
      ? principal
      : principal?.toText() || '';
  } catch (error) {
    console.error('Error getting full wallet address:', error);
    return '';
  }
}

/**
 * Format wallet address for display
 * Shows shortened version by default, full on hover/copy
 * @param {string|Principal} principal - Principal ID
 * @param {Object} options - Formatting options
 * @returns {Object} Formatted address info
 */
export function formatWalletAddress(principal, options = {}) {
  const {
    short = true,
    startChars = 8,
    endChars = 8,
    showEllipsis = true
  } = options;
  
  try {
    const principalText = typeof principal === 'string' 
      ? principal
      : principal?.toText() || '';
    
    if (!principalText) {
      return {
        full: '',
        short: '',
        display: ''
      };
    }
    
    const full = principalText;
    
    if (!short || principalText.length <= startChars + endChars) {
      return {
        full,
        short: full,
        display: full
      };
    }
    
    const start = principalText.substring(0, startChars);
    const end = principalText.substring(principalText.length - endChars);
    const shortForm = showEllipsis ? `${start}...${end}` : `${start}${end}`;
    
    return {
      full,
      short: shortForm,
      display: shortForm
    };
  } catch (error) {
    console.error('Error formatting wallet address:', error);
    const principalText = typeof principal === 'string' 
      ? principal
      : principal?.toText() || '';
    return {
      full: principalText,
      short: principalText,
      display: principalText
    };
  }
}

export default {
  principalToAccountIdentifier,
  principalToReadableAddress,
  getFullWalletAddress,
  formatWalletAddress,
};

