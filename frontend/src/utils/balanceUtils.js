// Balance checking utilities
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { TOKEN_CANISTERS } from '../wallet-assets';

/**
 * Check balances via icexplorer.io API
 * @param {string|null} principalText - Principal ID (with hyphens)
 * @param {string|null} accountIdHex - Account ID (64 hex characters)
 * @returns {Promise<Array|null>} - Array of balance objects or null if failed
 */
export async function checkBalancesViaExplorerAPI(principalText, accountIdHex) {
  const balances = [];
  
  // Use icexplorer.io API - it supports Principal IDs
  try {
    const address = accountIdHex || principalText;
    
    if (address) {
      // Primary: Use icexplorer.io API endpoints
      // Based on https://www.icexplorer.io/address/details/{address}
      const endpoints = [
        `https://www.icexplorer.io/api/address/${address}`,
        `https://www.icexplorer.io/api/v1/address/${address}`,
        `https://api.icexplorer.io/v1/address/${address}`,
        `https://api.icexplorer.io/v1/account/${address}/balance`,
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log('Querying icexplorer.io API (primary):', endpoint);
          const response = await fetch(endpoint, { 
            method: 'GET',
            headers: { 
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            mode: 'cors'
          });
          
          if (response.ok) {
            let data;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
              data = await response.json();
            } else {
              // If HTML response, try to parse embedded JSON
              const html = await response.text();
              // Look for embedded JSON data
              const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/s) ||
                               html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>(.+?)<\/script>/s) ||
                               html.match(/<script[^>]*type="application\/json"[^>]*>(.+?)<\/script>/s);
              if (jsonMatch) {
                try {
                  data = JSON.parse(jsonMatch[1]);
                } catch (e) {
                  console.warn('Failed to parse embedded JSON:', e);
                  continue;
                }
              } else {
                console.warn('No JSON data found in HTML response');
                continue;
              }
            }
            
            console.log('icexplorer.io API response:', data);
            
            // Parse icexplorer.io response format
            let balanceArray = [];
            
            if (data.balances && Array.isArray(data.balances)) {
              balanceArray = data.balances;
            } else if (data.tokens && Array.isArray(data.tokens)) {
              balanceArray = data.tokens;
            } else if (data.token_balances && Array.isArray(data.token_balances)) {
              balanceArray = data.token_balances;
            } else if (data.account && data.account.balances) {
              balanceArray = Array.isArray(data.account.balances) ? data.account.balances : [];
            } else if (data.address && data.address.balances) {
              balanceArray = Array.isArray(data.address.balances) ? data.address.balances : [];
            } else if (data.data && data.data.balances) {
              balanceArray = Array.isArray(data.data.balances) ? data.data.balances : [];
            } else if (Array.isArray(data)) {
              balanceArray = data;
            } else if (data.balance !== undefined || data.icp_balance !== undefined) {
              // Single balance response - parse string like "123.456 ICP" or number
              let balanceValue = data.balance || data.icp_balance || 0;
              if (typeof balanceValue === 'string') {
                // Extract number from string like "123.456 ICP"
                const match = balanceValue.match(/([\d.,]+)/);
                if (match) {
                  balanceValue = parseFloat(match[1].replace(/,/g, ''));
                  // If it's a small number (< 1000), assume human-readable format
                  if (balanceValue < 1000) {
                    balanceValue = balanceValue * Math.pow(10, 8);
                  }
                } else {
                  balanceValue = 0;
                }
              }
              balanceArray = [{ symbol: 'ICP', balance: balanceValue }];
            }
            
            balanceArray.forEach(balance => {
              const symbol = balance.symbol || balance.token_symbol || balance.name || balance.token || balance.type || 'ICP';
              let balanceValue = balance.balance || balance.amount || balance.value || balance.amount_e8s || balance.e8s || balance.icp_balance || 0;
              
              // Handle string balances like "123.456 ICP" or "1234567890" (smallest unit)
              if (typeof balanceValue === 'string') {
                // Check if it contains decimal point (human-readable) or is all digits (smallest unit)
                if (balanceValue.includes('.') || balanceValue.includes(',')) {
                  // Human-readable format - extract number and convert to smallest unit
                  const match = balanceValue.match(/([\d.,]+)/);
                  if (match) {
                    balanceValue = parseFloat(match[1].replace(/,/g, ''));
                    balanceValue = balanceValue * Math.pow(10, 8); // Convert to smallest unit
                  } else {
                    balanceValue = 0;
                  }
                } else {
                  // Assume it's already in smallest unit
                  balanceValue = parseFloat(balanceValue) || 0;
                }
              }
              
              const tokenInfo = Object.values(TOKEN_CANISTERS).find(t => 
                t.symbol.toLowerCase() === symbol?.toLowerCase() ||
                symbol?.toLowerCase().includes(t.symbol.toLowerCase())
              );
              
              if (tokenInfo && balanceValue !== undefined && balanceValue !== null) {
                const balanceNum = Number(balanceValue);
                
                if (!isNaN(balanceNum)) {
                  const existingIndex = balances.findIndex(b => b.symbol === tokenInfo.symbol);
                  if (existingIndex < 0) {
                    balances.push({
                      success: true,
                      balance: balanceNum,
                      balanceFormatted: balanceNum / Math.pow(10, tokenInfo.decimals),
                      symbol: tokenInfo.symbol,
                      name: tokenInfo.name,
                      icon: tokenInfo.icon,
                      color: tokenInfo.color,
                      decimals: tokenInfo.decimals,
                      hasBalance: balanceNum > 0
                    });
                  } else {
                    // Update if API result has balance
                    if (balanceNum > 0) {
                      balances[existingIndex] = {
                        success: true,
                        balance: balanceNum,
                        balanceFormatted: balanceNum / Math.pow(10, tokenInfo.decimals),
                        symbol: tokenInfo.symbol,
                        name: tokenInfo.name,
                        icon: tokenInfo.icon,
                        color: tokenInfo.color,
                        decimals: tokenInfo.decimals,
                        hasBalance: balanceNum > 0
                      };
                    }
                  }
                }
              }
            });
            
            // If we got results, break out of the loop
            if (balances.length > 0) {
              console.log('Successfully retrieved balances from icexplorer.io (primary):', balances);
              break;
            }
          } else {
            console.warn(`icexplorer.io API endpoint ${endpoint} returned status:`, response.status);
          }
        } catch (endpointError) {
          console.warn(`icexplorer.io API endpoint ${endpoint} failed:`, endpointError);
          continue;
        }
      }
    }
  } catch (error) {
    console.warn('icexplorer.io API failed:', error);
  }
  
  return balances.length > 0 ? balances : null;
}

/**
 * Query balances by Account ID directly from ICP Ledger
 * @param {string} accountIdHex - Account ID (64 hex characters)
 * @returns {Promise<Array|null>} - Array of balance objects or null if failed
 */
export async function queryBalancesByAccountId(accountIdHex) {
  const balances = [];
  
  try {
    // Convert hex Account ID to bytes (32 bytes = 64 hex chars)
    const accountIdBytes = new Uint8Array(
      accountIdHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
    );
    
    if (accountIdBytes.length !== 32) {
      throw new Error('Invalid Account ID length. Must be 64 hex characters (32 bytes).');
    }
    
    console.log('Querying ICP Ledger with Account ID:', accountIdHex);
    
    // Create agent
    const agent = new HttpAgent({
      host: import.meta.env.DEV ? 'http://localhost:4943' : 'https://ic0.app',
    });

    if (import.meta.env.DEV) {
      await agent.fetchRootKey();
    }

    // Query ICP Ledger using account_balance method
    const ICP_LEDGER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
    
    // Import IDL dynamically to avoid "global is not defined" error
    const { IDL: IDLModule } = await import('@dfinity/candid');
    
    const icpLedgerIdl = IDLModule.Service({
      account_balance: IDLModule.Func(
        [IDLModule.Record({ account: IDLModule.Vec(IDLModule.Nat8) })],
        [IDLModule.Record({ e8s: IDLModule.Nat64 })],
        ['query']
      ),
    });
    
    const icpLedger = Principal.fromText(ICP_LEDGER_ID);
    const icpActor = Actor.createActor(icpLedgerIdl, {
      agent,
      canisterId: icpLedger,
    });
    
    const accountBytes = Array.from(accountIdBytes);
    console.log('Calling account_balance with account bytes length:', accountBytes.length);
    
    const result = await icpActor.account_balance({ account: accountBytes });
    console.log('ICP Ledger result:', result);
    
    if (result && result.e8s !== undefined) {
      const balanceNum = Number(result.e8s);
      if (balanceNum >= 0) {
        balances.push({
          success: true,
          balance: balanceNum,
          balanceFormatted: balanceNum / Math.pow(10, 8),
          symbol: 'ICP',
          name: 'Internet Computer',
          icon: '🌐',
          color: '#29ABE2',
          decimals: 8,
          hasBalance: balanceNum > 0
        });
      }
    }
    
    // Note: ckBTC and other ICRC-1 tokens require Principal + subaccount,
    // which cannot be derived from Account ID alone. Only ICP Ledger supports Account ID queries.
    
  } catch (error) {
    console.error('Error querying balances by Account ID:', error);
    throw error; // Re-throw to be caught by caller
  }
  
  return balances.length > 0 ? balances : null;
}

/**
 * Merge balance results from ledger and API sources
 * @param {Array} ledgerBalances - Balances from direct ledger queries
 * @param {Array} apiBalances - Balances from API queries
 * @returns {Array} - Merged balance array
 */
export function mergeBalanceResults(ledgerBalances, apiBalances) {
  const merged = [...ledgerBalances];
  
  apiBalances.forEach(apiBalance => {
    const existingIndex = merged.findIndex(b => b.symbol === apiBalance.symbol);
    if (existingIndex >= 0) {
      // Prefer API result if it shows a balance or if ledger result failed
      if (apiBalance.hasBalance || !merged[existingIndex].success) {
        merged[existingIndex] = apiBalance;
      }
    } else {
      merged.push(apiBalance);
    }
  });
  
  return merged;
}

