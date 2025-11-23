import React, { useState } from 'react';
import { Principal } from '@dfinity/principal';
import { HttpAgent } from '@dfinity/agent';
import { validatePrincipalEnhanced } from '../icp-utils';
import { getAllTokenBalances, formatTokenBalance } from '../wallet-assets';
import { checkBalancesViaExplorerAPI, queryBalancesByAccountId, mergeBalanceResults } from '../utils/balanceUtils';

/**
 * AddressBalanceChecker Component - Check balances for any wallet address
 */
export default function AddressBalanceChecker() {
  const [checkAddressInput, setCheckAddressInput] = useState('');
  const [checkAddressLoading, setCheckAddressLoading] = useState(false);
  const [checkAddressError, setCheckAddressError] = useState(null);
  const [checkedAddressAssets, setCheckedAddressAssets] = useState([]);

  const checkAddressBalances = async (addressText) => {
    if (!addressText || !addressText.trim()) {
      setCheckAddressError('Please enter a wallet address (Principal ID) or Account ID');
      return;
    }

    setCheckAddressLoading(true);
    setCheckAddressError(null);
    setCheckedAddressAssets([]);

    try {
      const trimmedAddress = addressText.trim();
      let principalObj = null;
      let isAccountId = false;
      
      // Detect format: Account ID (hex, 64 chars) vs Principal ID (with hyphens)
      if (/^[0-9a-fA-F]{64}$/i.test(trimmedAddress)) {
        // This is an Account ID (hex format, 64 characters)
        isAccountId = true;
        console.log('Detected Account ID format:', trimmedAddress);
        
        // Query balances using Account ID - try icexplorer.io API first, then direct ledger
        try {
          console.log('Querying balances for Account ID:', trimmedAddress);
          
          // Try icexplorer.io API first
          let apiBalances = null;
          try {
            apiBalances = await checkBalancesViaExplorerAPI(null, trimmedAddress);
          } catch (apiErr) {
            console.warn('icexplorer.io API failed:', apiErr);
          }
          
          // If API fails, try direct ledger query for ICP
          if (!apiBalances || apiBalances.length === 0) {
            try {
              console.log('Trying direct ICP Ledger query for Account ID');
              apiBalances = await queryBalancesByAccountId(trimmedAddress);
            } catch (ledgerErr) {
              console.warn('Direct ledger query failed:', ledgerErr);
            }
          }
          
          if (apiBalances && apiBalances.length > 0) {
            setCheckedAddressAssets(apiBalances);
            setCheckAddressInput(trimmedAddress);
            setCheckAddressLoading(false);
            return;
          } else {
            // If no balances found, still show empty result
            setCheckedAddressAssets([]);
            setCheckAddressInput(trimmedAddress);
            setCheckAddressError('No balances found for this Account ID. Note: Only ICP balance can be queried with Account ID. For ckBTC and other ICRC-1 tokens, please use Principal ID format.');
            setCheckAddressLoading(false);
            return;
          }
        } catch (apiError) {
          console.error('Balance query failed:', apiError);
          const errorMsg = apiError?.message || apiError?.toString() || 'Unknown error';
          setCheckAddressError('Failed to query balances. Error: ' + errorMsg);
          setCheckedAddressAssets([]);
          setCheckAddressLoading(false);
          return;
        }
      } else {
        // This should be a Principal ID format
        const validation = await validatePrincipalEnhanced(trimmedAddress, { checkActivity: false });
        if (!validation.valid) {
          let errorMsg = validation.error || 'Invalid address format.';
          if (!trimmedAddress.includes('-') && trimmedAddress.length !== 64) {
            errorMsg += ' Please enter either a Principal ID (format: xxxxx-xxxxx-xxxxx-...) or Account ID (64 hex characters).';
          }
          setCheckAddressError(errorMsg);
          setCheckAddressLoading(false);
          return;
        }

        principalObj = Principal.fromText(trimmedAddress);
      }
      
      // Create anonymous agent (no identity needed for balance queries)
      const agent = new HttpAgent({
        host: import.meta.env.DEV ? 'http://localhost:4943' : 'https://ic0.app',
      });

      if (import.meta.env.DEV) {
        try {
          await agent.fetchRootKey();
        } catch (e) {
          console.warn('Could not fetch root key:', e);
        }
      }

      // Check balances for ckBTC and ICP using Principal
      const balances = await getAllTokenBalances(principalObj, agent);
      
      // Also try icexplorer.io API for more accurate results
      try {
        const apiBalances = await checkBalancesViaExplorerAPI(principalObj.toText(), null);
        if (apiBalances && apiBalances.length > 0) {
          // Merge results, preferring API results if available
          const mergedBalances = mergeBalanceResults(balances, apiBalances);
          const hasAnyBalance = mergedBalances.some(b => b.hasBalance);
          const filteredBalances = hasAnyBalance 
            ? mergedBalances.filter(b => b.hasBalance)
            : mergedBalances;
          
          setCheckedAddressAssets(filteredBalances);
          setCheckAddressInput(trimmedAddress);
          setCheckAddressLoading(false);
          return;
        }
      } catch (apiError) {
        console.warn('icexplorer.io API query failed, using direct ledger results:', apiError);
      }
      
      // Filter to only show tokens with balance or show all if none have balance
      const hasAnyBalance = balances.some(b => b.hasBalance);
      const filteredBalances = hasAnyBalance 
        ? balances.filter(b => b.hasBalance)
        : balances;

      setCheckedAddressAssets(filteredBalances);
      setCheckAddressInput(trimmedAddress);
      
      if (filteredBalances.length === 0 || !hasAnyBalance) {
        setCheckAddressError('No balances found for this address');
      }
    } catch (error) {
      console.error('Error checking address balances:', error);
      setCheckAddressError(error.message || 'Failed to check balances');
      setCheckedAddressAssets([]);
    } finally {
      setCheckAddressLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #e5e5e5' }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: '500', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>🔍</span>
        <span>Check Any Wallet Address</span>
      </h3>
      <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '12px', lineHeight: '1.5' }}>
        Enter a wallet address (Principal ID) or Account ID to check ckBTC and ICP balances. Note: Wallet addresses are separate from your connected identity for privacy.
      </p>
      <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '6px', border: '1px solid #bfdbfe', marginBottom: '12px', fontSize: '0.85rem', color: '#1e40af' }}>
        <strong>Supported Formats:</strong>
        <ul style={{ margin: '6px 0 0 20px', padding: 0, lineHeight: '1.6' }}>
          <li><strong>Principal ID:</strong> Base32 with hyphens (e.g., <code style={{ fontSize: '0.75rem', background: '#fff', padding: '2px 4px' }}>2gvlb-ekff7-b4m4a-g64bc-owccg-syhdp-375ir-5ry2x-hzryb-qbj5a-qae</code>)</li>
          <li><strong>Account ID:</strong> 64-character hex string (e.g., <code style={{ fontSize: '0.75rem', background: '#fff', padding: '2px 4px' }}>68c7cdd272095583b0941144b70b71432e26930a1a6404db22c2b050a07d8369</code>)</li>
        </ul>
        <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', lineHeight: '1.5' }}>
          💡 <strong>Alternatively:</strong> Check balances at{' '}
          <a 
            href="https://www.icexplorer.io/" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#1e40af', textDecoration: 'underline', fontWeight: '500' }}
          >
            icexplorer.io
          </a>
        </p>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input
          type="text"
          value={checkAddressInput}
          onChange={(e) => {
            setCheckAddressInput(e.target.value);
            setCheckAddressError(null);
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              checkAddressBalances(checkAddressInput);
            }
          }}
          placeholder="Enter wallet address / Principal ID (e.g., 2gvlb-ekff7-b4m4a-g64bc-owccg-syhdp-375ir-5ry2x-hzryb-qbj5a-qae)"
          style={{
            flex: 1,
            padding: '10px 12px',
            fontSize: '0.9rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontFamily: 'monospace'
          }}
        />
        <button
          onClick={() => checkAddressBalances(checkAddressInput)}
          className="btn btn-primary"
          disabled={checkAddressLoading || !checkAddressInput.trim()}
          style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}
        >
          {checkAddressLoading ? 'Checking...' : 'Check'}
        </button>
      </div>
      {checkAddressError && (
        <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '0.85rem', color: '#991b1b', marginTop: '8px' }}>
          ⚠️ {checkAddressError}
        </div>
      )}
      {checkedAddressAssets.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '12px' }}>
            Balances for: <code style={{ fontSize: '0.8rem', background: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>{checkAddressInput}</code>
          </div>
                  <div className="wallet-assets-grid">
                    {checkedAddressAssets.map((asset, index) => (
                      <div key={`checked-${index}`} className="asset-card" style={{ borderLeft: `3px solid ${asset.color || '#666'}` }}>
                        <div className="asset-header">
                          <div className="asset-icon" style={{ color: asset.color || '#666' }}>
                            {asset.icon || '🪙'}
                          </div>
                          <div className="asset-info">
                            <div className="asset-symbol">{asset.symbol}</div>
                            <div className="asset-name">{asset.name}</div>
                          </div>
                        </div>
                        <div className="asset-balance">
                          <div className="asset-balance-value">
                            {formatTokenBalance(asset.balance, asset.decimals || 8)}
                          </div>
                          <div className="asset-balance-symbol">{asset.symbol}</div>
                        </div>
                        {asset.success === false && asset.error && (
                          <div className="asset-error" style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '8px' }}>
                            ⚠️ {asset.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
        </div>
      )}
    </div>
  );
}

