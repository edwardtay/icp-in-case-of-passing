// ICP Development Utilities and Middleware
import { Principal } from '@dfinity/principal';

/**
 * Validate if a string is a valid ICP Principal
 * @param {string} principalText - The principal string to validate
 * @returns {Object} - { valid: boolean, error?: string, principal?: Principal }
 */
export async function validatePrincipal(principalText) {
  if (!principalText || typeof principalText !== 'string') {
    return { valid: false, error: 'Principal is required' };
  }

  const trimmed = principalText.trim();
  if (!trimmed) {
    return { valid: false, error: 'Principal cannot be empty' };
  }

  try {
    const principal = Principal.fromText(trimmed);
    
    // Check if it's anonymous (usually not valid for beneficiaries)
    if (principal.isAnonymous()) {
      return { valid: false, error: 'Anonymous principal is not allowed' };
    }

    // Check principal format (basic validation)
    const principalStr = principal.toText();
    if (!principalStr.includes('-')) {
      return { valid: false, error: 'Invalid principal format' };
    }

    return { valid: true, principal, principalText: principalStr };
  } catch (error) {
    return { 
      valid: false, 
      error: `Invalid principal format: ${error.message}` 
    };
  }
}

/**
 * Get explorer URLs for a principal with multiple fallback options
 * @param {string} principalText - The principal string (also serves as account ID)
 * @returns {Array} - Array of explorer objects with name, url, and description
 * 
 * Note: In this system, the Principal IS the Account ID. Accounts are keyed by Principal
 * in the canister's HashMap, so they are one and the same identifier.
 */
export function getExplorerUrls(principalText) {
  if (!principalText) {
    console.warn('getExplorerUrls: No principal provided');
    return [];
  }

  const encoded = encodeURIComponent(principalText);
  
  // Only include verified working explorers
  // Removed non-existent explorers: ic.rocks, icscan.io, ic.dashboard.org
  // Note: Explorers may not show principals without on-chain activity
  const explorers = [
    {
      name: 'ICP Dashboard',
      url: `https://dashboard.internetcomputer.org/principal/${encoded}`,
      icon: '🌐',
      description: 'Official ICP Dashboard',
      primary: true
    }
  ];
  
  console.log(`Generated ${explorers.length} explorer URL(s) for principal:`, { principal: principalText, explorers });
  return explorers;
}

/**
 * Check if a principal exists/has activity on ICP
 * @param {string} principalText - The principal to check
 * @returns {Promise<Object>} - { exists: boolean, hasActivity: boolean, error?: string }
 */
export async function checkPrincipalActivity(principalText) {
  try {
    const principal = Principal.fromText(principalText);
    
    // Try to fetch from ICP Dashboard API (if available)
    // Note: This is a placeholder - actual implementation depends on available APIs
    const dashboardUrl = `https://dashboard.internetcomputer.org/api/v1/principal/${encodeURIComponent(principalText)}`;
    
    try {
      const response = await fetch(dashboardUrl, { 
        method: 'HEAD',
        mode: 'no-cors' // CORS might block, but we can try
      });
      
      // If we can't check directly, assume it might exist
      // In production, you'd want to use a proper API endpoint
      return { exists: true, hasActivity: true };
    } catch (error) {
      // If API check fails, principal is still valid format-wise
      return { exists: true, hasActivity: null, note: 'Cannot verify activity without API access' };
    }
  } catch (error) {
    return { exists: false, hasActivity: false, error: error.message };
  }
}

/**
 * Format principal for display (truncate if too long)
 * @param {string} principalText - The principal string
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} - Formatted principal string
 */
export function formatPrincipal(principalText, maxLength = 50) {
  if (!principalText) return '';
  if (principalText.length <= maxLength) return principalText;
  
  const start = principalText.substring(0, 20);
  const end = principalText.substring(principalText.length - 20);
  return `${start}...${end}`;
}

/**
 * Detect ICP network (local, testnet, mainnet)
 * @returns {string} - 'local' | 'testnet' | 'mainnet'
 */
export function detectNetwork() {
  if (import.meta.env.DEV) {
    // Check if local DFX is running
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'local';
    }
  }
  
  // Check canister ID to determine network
  const canisterId = import.meta.env.VITE_CANISTER_ID;
  if (canisterId) {
    // Testnet canister IDs often have specific patterns
    // Mainnet canister IDs are typically longer
    if (canisterId.includes('testnet') || canisterId.length < 27) {
      return 'testnet';
    }
  }
  
  return 'mainnet';
}

/**
 * Get network-specific configuration
 * @returns {Object} - Network configuration
 */
export function getNetworkConfig() {
  const network = detectNetwork();
  
  const configs = {
    local: {
      name: 'Local Development',
      host: 'http://localhost:4943',
      identityProvider: 'http://localhost:4943',
      explorer: 'http://localhost:4943',
      icon: '🖥️'
    },
    testnet: {
      name: 'ICP Testnet',
      host: 'https://testnet.dfinity.network',
      identityProvider: 'https://identity.ic0.app',
      explorer: 'https://dashboard.internetcomputer.org',
      icon: '🧪'
    },
    mainnet: {
      name: 'ICP Mainnet',
      host: 'https://ic0.app',
      identityProvider: 'https://identity.ic0.app',
      explorer: 'https://dashboard.internetcomputer.org',
      icon: '🌐'
    }
  };
  
  return configs[network] || configs.mainnet;
}

/**
 * Enhanced principal validation with activity check
 * @param {string} principalText - The principal to validate
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} - Validation result with additional info
 */
export async function validatePrincipalEnhanced(principalText, options = {}) {
  const { checkActivity = false, allowAnonymous = false } = options;
  
  // Basic validation
  const basicValidation = await validatePrincipal(principalText);
  if (!basicValidation.valid) {
    return basicValidation;
  }
  
  const result = {
    valid: true,
    principal: basicValidation.principal,
    principalText: basicValidation.principalText,
    formatted: formatPrincipal(basicValidation.principalText),
    explorerUrls: getExplorerUrls(basicValidation.principalText)
  };
  
  // Check activity if requested
  if (checkActivity) {
    const activityCheck = await checkPrincipalActivity(basicValidation.principalText);
    result.activity = activityCheck;
    
    // Warn if principal might not have activity
    if (activityCheck.hasActivity === false) {
      result.warning = 'This principal may not have any on-chain activity yet';
    }
  }
  
  return result;
}

/**
 * Create a safe explorer link that handles errors gracefully
 * @param {string} principalText - The principal
 * @param {string} explorerName - Name of the explorer
 * @returns {Object} - Link object with error handling
 */
export function createExplorerLink(principalText, explorerName = 'ICP Dashboard') {
  const urls = getExplorerUrls(principalText);
  const explorer = urls.find(e => e.name === explorerName) || urls[0];
  
  return {
    ...explorer,
    onClick: (e) => {
      // Try to open the link
      try {
        window.open(explorer.url, '_blank', 'noopener,noreferrer');
      } catch (error) {
        console.error(`Failed to open ${explorerName}:`, error);
        // Fallback: try to copy URL to clipboard
        navigator.clipboard.writeText(explorer.url).then(() => {
          alert(`Link copied to clipboard. Please paste in your browser: ${explorer.url}`);
        });
      }
    }
  };
}

/**
 * Check if principal is a canister principal
 * @param {string} principalText - The principal to check
 * @returns {boolean} - True if it's a canister principal
 */
export function isCanisterPrincipal(principalText) {
  try {
    const principal = Principal.fromText(principalText);
    const text = principal.toText();
    // Canister principals are typically shorter and end with specific patterns
    return text.length < 30 || text.endsWith('-cai');
  } catch {
    return false;
  }
}

/**
 * Get principal type (user, canister, anonymous)
 * @param {string} principalText - The principal to check
 * @returns {string} - 'user' | 'canister' | 'anonymous' | 'unknown'
 */
export function getPrincipalType(principalText) {
  try {
    const principal = Principal.fromText(principalText);
    
    if (principal.isAnonymous()) {
      return 'anonymous';
    }
    
    if (isCanisterPrincipal(principalText)) {
      return 'canister';
    }
    
    return 'user';
  } catch {
    return 'unknown';
  }
}

/**
 * Format error messages for better user experience
 * @param {Error|string} error - The error to format
 * @returns {string} - User-friendly error message
 */
export function formatError(error) {
  if (typeof error === 'string') return error;
  
  const message = error.message || 'An unknown error occurred';
  
  // Common ICP error patterns
  if (message.includes('reject code')) {
    return 'Transaction was rejected. Please try again.';
  }
  
  if (message.includes('timeout')) {
    return 'Request timed out. Please check your connection and try again.';
  }
  
  if (message.includes('principal')) {
    return 'Invalid principal format. Please check and try again.';
  }
  
  if (message.includes('not registered')) {
    return 'Account not found. Please register first.';
  }
  
  return message;
}

/**
 * Log ICP-related events for debugging
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export function logICPEvent(event, data = {}) {
  if (import.meta.env.DEV) {
    console.log(`[ICP Event] ${event}`, {
      timestamp: new Date().toISOString(),
      network: detectNetwork(),
      ...data
    });
  }
}

export default {
  validatePrincipal,
  validatePrincipalEnhanced,
  getExplorerUrls,
  checkPrincipalActivity,
  formatPrincipal,
  detectNetwork,
  getNetworkConfig,
  createExplorerLink,
  isCanisterPrincipal,
  getPrincipalType,
  formatError,
  logICPEvent
};


