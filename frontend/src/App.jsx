import React, { useState, useEffect } from 'react';
import { createActor, CANISTER_ID } from './canister';
import { detectWallets, connectWallet, WALLETS } from './wallet';
import { 
  validatePrincipalEnhanced, 
  getExplorerUrls, 
  formatError,
  logICPEvent 
} from './icp-utils';
import { getAllTokenBalances, formatTokenBalance, TOKEN_CANISTERS } from './wallet-assets';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { ErrorBoundary } from './components/ErrorBoundary';
import AddressBalanceChecker from './components/AddressBalanceChecker';
import InfoModal from './components/InfoModal';
import TimeoutCalendar from './components/TimeoutCalendar';
import RegistrationForm from './components/RegistrationForm';
import HeartbeatButton from './components/HeartbeatButton';
import AccountDashboard from './components/AccountDashboard';
import TransactionHistory from './components/TransactionHistory';
import './App.css';
import './components.css';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [principal, setPrincipal] = useState(null);
  const [accountInfo, setAccountInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [availableWallets, setAvailableWallets] = useState([]);
  const [currentWallet, setCurrentWallet] = useState(null);
  const [currentIdentity, setCurrentIdentity] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Form states
  const [registerForm, setRegisterForm] = useState({
    timeoutDuration: 3600,
    beneficiary: ''
  });
  const [depositAmount, setDepositAmount] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [ledgerBalance, setLedgerBalance] = useState(null);
  const [canisterAddress, setCanisterAddress] = useState(null);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [showStepsTooltip, setShowStepsTooltip] = useState(false);
  const [identityNumber, setIdentityNumber] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [beneficiaryError, setBeneficiaryError] = useState('');
  const [showAccountMetadata, setShowAccountMetadata] = useState(false);
  const [connectionTime, setConnectionTime] = useState(null);
  const [ckbtcPrice, setCkbtcPrice] = useState(null);
  const [walletAssets, setWalletAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState(null);
  const [priceSource, setPriceSource] = useState(null);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [showUpdateSettings, setShowUpdateSettings] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawTo, setWithdrawTo] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [autoHeartbeatReminder, setAutoHeartbeatReminder] = useState(localStorage.getItem('autoHeartbeatReminder') === 'true');
  const [heartbeatReminderInterval, setHeartbeatReminderInterval] = useState(null);

  useEffect(() => {
    checkWallets();
    checkConnection();
    // Load saved identity number from localStorage
    const savedIdNumber = localStorage.getItem('icp_identity_number');
    if (savedIdNumber && !isNaN(savedIdNumber)) {
      setIdentityNumber(Number(savedIdNumber));
    }
  }, []);

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!showInfoTooltip && !showStepsTooltip && !showAccountMetadata) return;
    
    const handleClickOutside = (event) => {
      if (!event.target.closest('.info-icon-container') &&
          !event.target.closest('.steps-icon-container') &&
          !event.target.closest('.wallet-badge-container')) {
        setShowInfoTooltip(false);
        setShowStepsTooltip(false);
        setShowAccountMetadata(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showInfoTooltip, showStepsTooltip, showAccountMetadata]);

  // Auto-refresh account info every 30 seconds
  useEffect(() => {
    if (!isConnected || !accountInfo) return;
    
    const interval = setInterval(() => {
      loadAccountInfo();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, accountInfo]);

  // Update countdown timer every second and check for notifications
  useEffect(() => {
    if (!accountInfo) {
      setTimeRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const lastHeartbeat = Number(accountInfo.last_heartbeat) / 1_000_000_000; // Convert nanoseconds to seconds
      const timeoutDuration = Number(accountInfo.timeout_duration_seconds);
      const nextDue = lastHeartbeat + timeoutDuration;
      const now = Date.now() / 1000; // Current time in seconds
      const remaining = Math.max(0, nextDue - now);
      setTimeRemaining(remaining);

      // Browser notifications for timeout warnings
      if (notificationPermission === 'granted' && remaining > 0 && remaining <= 3600 && remaining % 300 === 0) {
        // Notify every 5 minutes when less than 1 hour remains
        new Notification('⚠️ Timeout Warning', {
          body: `You have ${Math.floor(remaining / 60)} minutes remaining before automatic transfer. Send a heartbeat now!`,
          icon: '/favicon.ico',
          tag: 'timeout-warning',
        });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [accountInfo, notificationPermission]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && notificationPermission === 'default') {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
      });
    }
  }, [notificationPermission]);

  // Auto heartbeat reminder
  useEffect(() => {
    if (!autoHeartbeatReminder || !accountInfo || !timeRemaining) return;

    const reminderInterval = setInterval(() => {
      if (timeRemaining && timeRemaining < accountInfo.timeout_duration_seconds * 0.5) {
        // Remind when less than 50% of timeout remains
        if (notificationPermission === 'granted') {
          new Notification('💓 Heartbeat Reminder', {
            body: 'Consider sending a heartbeat to reset your timeout timer.',
            icon: '/favicon.ico',
            tag: 'heartbeat-reminder',
          });
        }
      }
    }, 60000); // Check every minute

    setHeartbeatReminderInterval(reminderInterval);
    return () => clearInterval(reminderInterval);
  }, [autoHeartbeatReminder, accountInfo, timeRemaining, notificationPermission]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // ESC key to close modals
      if (e.key === 'Escape') {
        if (showAccountMetadata) {
          setShowAccountMetadata(false);
        }
        if (showUpdateSettings) {
          setShowUpdateSettings(false);
        }
        if (showWithdraw) {
          setShowWithdraw(false);
        }
      }
      // Ctrl+H or Cmd+H for heartbeat
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        if (accountInfo && !loading) {
          handleHeartbeat();
        }
      }
      // Ctrl+R or Cmd+R for refresh (but allow default if not on dashboard)
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && isConnected) {
        // Only prevent if we're on the dashboard
        if (accountInfo) {
          e.preventDefault();
          loadAccountInfo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [accountInfo, loading, isConnected, showInfoTooltip, showAccountMetadata, showUpdateSettings, showWithdraw]);


  // Fetch ckBTC price from APIs with detailed stats
  useEffect(() => {
    const fetchPrice = async () => {
      setPriceLoading(true);
      setPriceError(null);

      try {
        let priceData = null;
        let source = null;

        // Strategy 1: Try CoinGecko with correct ckBTC coin ID
        const coinGeckoIds = ['chain-key-bitcoin', 'ckbtc'];
        for (const coinId of coinGeckoIds) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(
              `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_7d_change=true&include_30d_change=true&include_market_cap=true&include_24hr_vol=true&include_last_updated_at=true`,
              { 
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                },
                signal: controller.signal
              }
            );
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const data = await response.json();
              if (data[coinId] && data[coinId].usd) {
                priceData = {
                  price: data[coinId].usd,
                  change24h: data[coinId].usd_24h_change || 0,
                  change7d: data[coinId].usd_7d_change ?? null,
                  change30d: data[coinId].usd_30d_change ?? null,
                  marketCap: data[coinId].usd_market_cap ?? null,
                  volume24h: data[coinId].usd_24h_vol ?? null,
                  lastUpdated: data[coinId].last_updated_at ?? null,
                  source: 'CoinGecko'
                };
                source = coinId;
                console.log(`Successfully fetched ckBTC price from CoinGecko (${coinId}):`, priceData);
                break;
              }
            } else {
              console.warn(`CoinGecko API returned ${response.status} for ${coinId}`);
            }
          } catch (e) {
            if (e.name !== 'AbortError') {
              console.warn(`CoinGecko API failed for ${coinId}:`, e.message);
            }
            continue;
          }
        }

        // Strategy 2: Fallback to Bitcoin price (ckBTC is 1:1 with BTC)
        if (!priceData) {
          try {
            console.log('Falling back to Bitcoin price as proxy...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const btcResponse = await fetch(
              'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_7d_change=true&include_30d_change=true&include_market_cap=true&include_24hr_vol=true&include_last_updated_at=true',
              {
                signal: controller.signal
              }
            );
            
            clearTimeout(timeoutId);
            
            if (btcResponse.ok) {
              const btcData = await btcResponse.json();
              if (btcData.bitcoin && btcData.bitcoin.usd) {
                priceData = {
                  price: btcData.bitcoin.usd,
                  change24h: btcData.bitcoin.usd_24h_change || 0,
                  change7d: btcData.bitcoin.usd_7d_change ?? null,
                  change30d: btcData.bitcoin.usd_30d_change ?? null,
                  marketCap: btcData.bitcoin.usd_market_cap ?? null,
                  volume24h: btcData.bitcoin.usd_24h_vol ?? null,
                  lastUpdated: btcData.bitcoin.last_updated_at ?? null,
                  source: 'CoinGecko (Bitcoin proxy)'
                };
                source = 'bitcoin-proxy';
                console.log('Using Bitcoin price as proxy for ckBTC:', priceData);
              }
            }
          } catch (e) {
            if (e.name !== 'AbortError') {
              console.warn('Bitcoin proxy fetch failed:', e.message);
            }
          }
        }

        // Strategy 3: Try alternative API (CoinCap as backup)
        if (!priceData) {
          try {
            console.log('Trying CoinCap API as backup...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const coinCapResponse = await fetch(
              'https://api.coincap.io/v2/assets/bitcoin',
              {
                signal: controller.signal
              }
            );
            
            clearTimeout(timeoutId);
            
            if (coinCapResponse.ok) {
              const coinCapData = await coinCapResponse.json();
              if (coinCapData.data && coinCapData.data.priceUsd) {
                const btcPrice = parseFloat(coinCapData.data.priceUsd);
                const change24h = parseFloat(coinCapData.data.changePercent24Hr || 0);
                
                priceData = {
                  price: btcPrice,
                  change24h: change24h,
                  change7d: null,
                  change30d: null,
                  marketCap: coinCapData.data.marketCapUsd ? parseFloat(coinCapData.data.marketCapUsd) : null,
                  volume24h: coinCapData.data.volumeUsd24Hr ? parseFloat(coinCapData.data.volumeUsd24Hr) : null,
                  lastUpdated: Date.now() / 1000,
                  source: 'CoinCap (Bitcoin proxy)'
                };
                source = 'coincap-proxy';
                console.log('Using CoinCap Bitcoin price as proxy:', priceData);
              }
            }
          } catch (e) {
            // Silently handle network errors (common in local dev)
            if (e.name !== 'AbortError' && !e.message?.includes('Failed to fetch')) {
              console.warn('CoinCap API failed:', e.message);
            }
          }
        }

        if (priceData && priceData.price) {
          setCkbtcPrice(priceData);
          setPriceSource(source);
          setPriceError(null);
          console.log('Price successfully set:', priceData);
        } else {
          // Last resort: Try a simple Bitcoin fetch without all the extra params
          console.log('All strategies failed, trying simple Bitcoin fetch...');
          try {
            const simpleBtcResponse = await fetch(
              'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
            );
            if (simpleBtcResponse.ok) {
              const simpleBtcData = await simpleBtcResponse.json();
              if (simpleBtcData.bitcoin && simpleBtcData.bitcoin.usd) {
                priceData = {
                  price: simpleBtcData.bitcoin.usd,
                  change24h: 0,
                  change7d: null,
                  change30d: null,
                  marketCap: null,
                  volume24h: null,
                  lastUpdated: Date.now() / 1000,
                  source: 'CoinGecko (Bitcoin - Simple)'
                };
                setCkbtcPrice(priceData);
                setPriceSource('bitcoin-simple');
                setPriceError(null);
                console.log('Using simple Bitcoin price:', priceData);
              } else {
                throw new Error('No price data available from any source');
              }
            } else {
              throw new Error('No price data available from any source');
            }
          } catch (finalError) {
            // Only log if it's not a network error (common in local dev)
            if (!finalError.message?.includes('Failed to fetch')) {
              console.error('Final price fetch attempt failed:', finalError);
            }
            // Even if all APIs fail, we can show a message that ckBTC = BTC
            // But don't throw - let the error handler deal with it
            throw new Error('Unable to fetch price. ckBTC is 1:1 with Bitcoin.');
          }
        }
      } catch (error) {
        // Only log error if it's not a network/CORS issue (common in local dev)
        if (!error.message.includes('Failed to fetch') && !error.message.includes('CORS')) {
          console.error('Price fetch error:', error);
        }
        const errorMsg = error.message || 'Unable to fetch price data';
        setPriceError(errorMsg);
        
        // Only set price to null if we don't have a previous price
        // This way, if a previous fetch succeeded, we keep showing that price
        if (!ckbtcPrice || !ckbtcPrice.price) {
          setCkbtcPrice({
            price: null,
            change24h: null,
            change7d: null,
            change30d: null,
            marketCap: null,
            volume24h: null,
            lastUpdated: null,
            source: 'Unavailable',
            note: 'ckBTC is 1:1 with Bitcoin. Check Bitcoin price as reference.'
          });
        }
      } finally {
        setPriceLoading(false);
      }
    };

    fetchPrice();
    // Refresh price every 5 minutes
    const interval = setInterval(fetchPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkWallets = () => {
    const detected = detectWallets();
    setAvailableWallets(detected);
    
    // If no extension wallets detected, show download suggestions
    const extensionWallets = detected.filter(w => w.id !== 'ii');
    if (extensionWallets.length === 0) {
      setShowWalletModal(true);
    }
  };

  const checkConnection = async () => {
    try {
      // Check localStorage for saved connection
      const savedPrincipal = localStorage.getItem('icp_principal');
      const savedWallet = localStorage.getItem('icp_wallet');
      
      if (savedPrincipal && savedWallet) {
        // Restore connection time
        const savedConnectionTime = localStorage.getItem('icp_connection_time');
        if (savedConnectionTime) {
          setConnectionTime(savedConnectionTime);
        }
        
        // If Internet Identity, verify session is still valid
        if (savedWallet === 'ii') {
          try {
            const { AuthClient } = await import('@dfinity/auth-client');
            const authClient = await AuthClient.create();
            const identity = await authClient.getIdentity();
            
            if (identity && !identity.getPrincipal().isAnonymous()) {
              const currentPrincipal = identity.getPrincipal().toText();
              if (currentPrincipal === savedPrincipal) {
                console.log('Internet Identity: Restoring session', currentPrincipal);
                setPrincipal(currentPrincipal);
                setCurrentIdentity(identity);
                setCurrentWallet(savedWallet);
                setIsConnected(true);
                // Load identity number
                loadIdentityNumber(currentPrincipal).catch(e => console.warn('Failed to load identity number on restore:', e));
                // Load account info in background - pass identity directly to avoid state timing issues
                loadAccountInfo(identity).catch(e => console.warn('Failed to load account info on restore:', e));
                return;
              } else {
                console.log('Internet Identity: Principal mismatch, clearing session');
                localStorage.removeItem('icp_principal');
                localStorage.removeItem('icp_wallet');
              }
            } else {
              console.log('Internet Identity: Session expired or invalid');
              localStorage.removeItem('icp_principal');
              localStorage.removeItem('icp_wallet');
            }
          } catch (error) {
            console.log('Internet Identity: Error checking session', error);
            // Clear invalid session
            localStorage.removeItem('icp_principal');
            localStorage.removeItem('icp_wallet');
          }
        } else {
          // For extension wallets, just restore the saved state
          console.log('Extension wallet: Restoring saved state', savedWallet);
          setPrincipal(savedPrincipal);
          setCurrentWallet(savedWallet);
          setIsConnected(true);
          // Note: Extension wallet identity needs to be reconnected
        }
      }
    } catch (error) {
      console.log('Not connected to canister yet', error);
    }
  };

  const handleConnectWallet = async (walletId) => {
    setLoading(true);
    setMessage('');
    setMessageType('');
    
    try {
      console.log(`Connecting to wallet: ${walletId}`);
      const result = await connectWallet(walletId);
      
      if (!result || !result.principal || !result.identity) {
        throw new Error('Invalid connection result');
      }
      
      console.log('Connection successful:', result.principal);
      setPrincipal(result.principal);
      setCurrentIdentity(result.identity);
      setCurrentWallet(walletId);
      setIsConnected(true);
      
      // Save to localStorage
      localStorage.setItem('icp_principal', result.principal);
      localStorage.setItem('icp_wallet', walletId);
      localStorage.setItem('icp_connection_time', new Date().toISOString());
      
      // Store connection time
      setConnectionTime(new Date().toISOString());
      
      // Load Internet Identity number if using Internet Identity
      if (walletId === 'ii') {
        try {
          await loadIdentityNumber(result.principal);
        } catch (e) {
          console.warn('Failed to load identity number:', e);
        }
      }
      
      // Load account info - pass identity directly to avoid state timing issues
      try {
        await loadAccountInfo(result.identity);
      } catch (e) {
        console.warn('Failed to load account info:', e);
        // Don't fail the connection if account info fails
      }
      
      // Load wallet assets
      try {
        await loadWalletAssets();
      } catch (e) {
        console.warn('Failed to load wallet assets:', e);
        // Don't fail the connection if assets fail
      }
      
      setShowWalletModal(false);
      const walletName = WALLETS[walletId.toUpperCase()]?.name || walletId;
      showMessage(`Successfully connected with ${walletName}!`, 'success');
    } catch (error) {
      console.error('Connection error:', error);
      const errorMsg = error.message || 'Unknown error occurred';
      showMessage(`Failed to connect: ${errorMsg}`, 'error');
      
      // If Internet Identity fails, provide helpful guidance
      if (walletId === 'ii') {
        setTimeout(() => {
          showMessage('Tip: Make sure you have Internet Identity set up. Visit https://identity.ic0.app to create one.', 'error');
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setPrincipal(null);
    setCurrentIdentity(null);
    setCurrentWallet(null);
    setAccountInfo(null);
    setConnectionTime(null);
    setShowAccountMetadata(false);
    // Don't clear identity number on disconnect - keep it for next session
    localStorage.removeItem('icp_principal');
    localStorage.removeItem('icp_wallet');
    localStorage.removeItem('icp_connection_time');
    showMessage('Disconnected', 'success');
  };

  const loadAccountInfo = async (providedIdentity = null) => {
    try {
      let identity = providedIdentity || currentIdentity;
      
      // If no identity but we're connected, try to get it
      if (!identity && currentWallet === 'ii') {
        // For Internet Identity, get from auth client
        const { AuthClient } = await import('@dfinity/auth-client');
        const authClient = await AuthClient.create();
        identity = await authClient.getIdentity();
        
        if (identity && !identity.getPrincipal().isAnonymous()) {
          setCurrentIdentity(identity);
        } else {
          console.log('No valid Internet Identity found');
          return;
        }
      }
      
      if (!identity) {
        console.log('No identity available for loading account info');
        return;
      }
      
      const actor = await createActor(identity);
      const result = await actor.get_account_info();
      if ('ok' in result) {
        console.log('Account info loaded successfully, user is registered');
        setAccountInfo(result.ok);
        // Load ledger balance
        loadLedgerBalance(actor);
        // Generate canister address
        generateCanisterAddress();
        // Load wallet assets
        loadWalletAssets();
        // Load transaction history
        try {
          const historyResult = await actor.get_transaction_history();
          if ('ok' in historyResult) {
            setTransactionHistory(historyResult.ok);
          }
        } catch (e) {
          console.warn('Could not load transaction history:', e);
        }
      } else {
        console.log('User not registered yet');
        setAccountInfo(null);
        setTransactionHistory([]);
      }
    } catch (error) {
      console.error('Error loading account info:', error);
      setAccountInfo(null);
      setTransactionHistory([]);
    }
  };

  const loadLedgerBalance = async (actor) => {
    try {
      const result = await actor.get_ckbtc_balance();
      if ('ok' in result) {
        setLedgerBalance(result.ok);
      }
    } catch (error) {
      console.error('Error loading ledger balance:', error);
    }
  };

  const generateCanisterAddress = () => {
    try {
      // Use the canister ID from the canister module
      if (CANISTER_ID) {
        // For ICRC-1, the account address is the canister principal
        setCanisterAddress(CANISTER_ID);
      }
    } catch (error) {
      console.error('Error generating canister address:', error);
    }
  };

  const loadWalletAssets = async () => {
    if (!principal || !currentIdentity) {
      setWalletAssets([]);
      return;
    }

    setAssetsLoading(true);
    setAssetsError(null);

    try {
      const principalObj = Principal.fromText(principal);
      const agent = new HttpAgent({
        host: import.meta.env.DEV ? 'http://localhost:4943' : 'https://ic0.app',
        identity: currentIdentity,
      });

      if (import.meta.env.DEV) {
        try {
          await agent.fetchRootKey();
        } catch (e) {
          console.warn('Could not fetch root key:', e);
        }
      }

      const balances = await getAllTokenBalances(principalObj, agent);
      
      // Filter to only show tokens with balance or show all if none have balance
      const hasAnyBalance = balances.some(b => b.hasBalance);
      const filteredBalances = hasAnyBalance 
        ? balances.filter(b => b.hasBalance)
        : balances;

      setWalletAssets(filteredBalances);
      logICPEvent('wallet_assets_loaded', { 
        assetCount: filteredBalances.length,
        hasBalances: hasAnyBalance
      });
    } catch (error) {
      console.error('Error loading wallet assets:', error);
      setAssetsError(formatError(error));
      setWalletAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  };


  // Helper function to check balances via icexplorer.io API

  const loadIdentityNumber = async (principalText) => {
    try {
      // Check localStorage first (might have been set manually)
      const savedId = localStorage.getItem('icp_identity_number');
      if (savedId && !isNaN(savedId)) {
        setIdentityNumber(Number(savedId));
        console.log('Using saved identity number from localStorage:', savedId);
        return;
      }

      // Internet Identity canister ID (use local for dev, mainnet for production)
      const II_CANISTER_ID = import.meta.env.DEV 
        ? 'uzt4z-lp777-77774-qaabq-cai'  // Local Internet Identity
        : 'rdmx6-jaaaa-aaaaa-aaadq-cai'; // Mainnet Internet Identity
      
      const { Principal } = await import('@dfinity/principal');
      const { Actor, HttpAgent } = await import('@dfinity/agent');
      const { idlFactory } = await import('./internet_identity.did.js');

      // Use authenticated agent - this is important for lookup to work
      let identity = currentIdentity;
      if (!identity && currentWallet === 'ii') {
        try {
          const { AuthClient } = await import('@dfinity/auth-client');
          const authClient = await AuthClient.create();
          identity = await authClient.getIdentity();
        } catch (e) {
          console.warn('Could not get identity for II lookup:', e);
          return; // Can't proceed without identity
        }
      }

      if (!identity || identity.getPrincipal().isAnonymous()) {
        console.log('No valid identity available for lookup');
        return;
      }

      const agent = new HttpAgent({
        host: import.meta.env.DEV ? 'http://localhost:4943' : 'https://ic0.app',
        identity: identity,
      });

      if (import.meta.env.DEV) {
        try {
          await agent.fetchRootKey();
        } catch (e) {
          console.warn('Could not fetch root key:', e);
        }
      }

      // Create actor for Internet Identity canister
      const iiPrincipal = Principal.fromText(II_CANISTER_ID);
      const iiActor = Actor.createActor(idlFactory, {
        agent,
        canisterId: iiPrincipal,
      });

      // Call lookup method with the principal
      const principal = Principal.fromText(principalText);
      console.log('Attempting to lookup identity number for principal:', principalText);
      
      // The lookup method returns an optional nat64
      const result = await iiActor.lookup(principal);
      console.log('Lookup result:', result, 'Type:', typeof result);

      // Handle different possible result formats
      let idNumber = null;
      if (result !== null && result !== undefined) {
        // Result could be BigInt, number, or array
        if (typeof result === 'bigint') {
          idNumber = Number(result);
        } else if (Array.isArray(result) && result.length > 0 && result[0] !== null) {
          idNumber = Number(result[0]);
        } else if (typeof result === 'number') {
          idNumber = result;
        } else if (result.toString) {
          idNumber = Number(result.toString());
        }
      }

      if (idNumber && !isNaN(idNumber) && idNumber > 0) {
        setIdentityNumber(idNumber);
        // Save to localStorage for future use
        localStorage.setItem('icp_identity_number', idNumber.toString());
        console.log('Internet Identity number found:', idNumber);
      } else {
        console.log('No valid identity number found. Result:', result);
        // Don't set identityNumber, allow manual entry
      }
    } catch (error) {
      console.error('Error loading identity number:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      // Silently fail - user can manually enter if needed
    }
  };

  const getIdentity = async () => {
    // Return cached identity if available
    if (currentIdentity) {
      return currentIdentity;
    }
    
    // For Internet Identity, get from auth client
    if (currentWallet === 'ii') {
      try {
        const { AuthClient } = await import('@dfinity/auth-client');
        const authClient = await AuthClient.create();
        const identity = await authClient.getIdentity();
        
        if (identity && !identity.getPrincipal().isAnonymous()) {
          setCurrentIdentity(identity);
          // Update principal if it changed
          const principalText = identity.getPrincipal().toText();
          if (principalText !== principal) {
            setPrincipal(principalText);
            localStorage.setItem('icp_principal', principalText);
          }
          return identity;
        } else {
          throw new Error('Internet Identity session expired. Please reconnect.');
        }
      } catch (error) {
        console.error('Error getting Internet Identity:', error);
        throw new Error('Failed to get Internet Identity. Please reconnect.');
      }
    }
    
    throw new Error('No identity available. Please connect your wallet.');
  };

  const handleBeneficiaryChange = (value) => {
    // Clear error when user starts typing
    if (beneficiaryError) {
      setBeneficiaryError('');
    }
    setRegisterForm({
      ...registerForm,
      beneficiary: value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validate beneficiary before proceeding
    const validation = await validatePrincipalEnhanced(registerForm.beneficiary, { checkActivity: false });
    if (!validation.valid) {
      setBeneficiaryError(validation.error);
      showMessage(`Invalid beneficiary: ${validation.error}`, 'error');
      return;
    }
    
    // Log validation success
    logICPEvent('beneficiary_validated', { principal: validation.principalText });
    
    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const confirmRegister = async () => {
    setShowConfirmDialog(false);
    setLoading(true);
    try {
      const identity = await getIdentity();
      const actor = await createActor(identity);
      
      // Parse beneficiary principal
      const { Principal } = await import('@dfinity/principal');
      const beneficiaryPrincipal = Principal.fromText(registerForm.beneficiary.trim());
      
      const result = await actor.register({
        timeout_duration_seconds: BigInt(registerForm.timeoutDuration),
        beneficiary: beneficiaryPrincipal
      });
      
      if ('ok' in result) {
        showMessage(result.ok, 'success');
        await loadAccountInfo();
      } else {
        // Improve error messages
        const errorMsg = result.err || 'Registration failed';
        let userFriendlyMsg = errorMsg;
        if (errorMsg.includes('already registered')) {
          userFriendlyMsg = 'You are already registered. If you need to change your settings, please contact support.';
        } else if (errorMsg.includes('timeout')) {
          userFriendlyMsg = 'Invalid timeout duration. Please ensure it is at least 60 seconds.';
        } else if (errorMsg.includes('beneficiary')) {
          userFriendlyMsg = 'Invalid beneficiary principal. Please check the format and try again.';
        }
        showMessage(userFriendlyMsg, 'error');
      }
    } catch (error) {
      let errorMsg = error.message || 'Registration failed';
      
      // Check for certificate/signature errors (common after replica restart)
      if (error.message && (
        error.message.includes('Invalid delegation') ||
        error.message.includes('Invalid canister signature') ||
        error.message.includes('certificate verification failed') ||
        error.message.includes('threshold signature')
      )) {
        // In local dev, this is expected - production II doesn't work with local replica
        if (import.meta.env.DEV) {
          errorMsg = 'Local Development: Registration via UI requires mainnet deployment. ' +
                     'Production Internet Identity delegations cannot be verified by local replica. ' +
                     'For local testing, use CLI: dfx canister call deadman_switch register \'(record { timeout_duration_seconds = 60 : nat64; beneficiary = principal "YOUR-PRINCIPAL"; })\'';
        } else {
          errorMsg = 'Certificate verification failed. This usually happens after the replica restarts. Please disconnect and reconnect your wallet to refresh your identity session.';
        }
        console.error('Certificate error detected:', error);
      } else if (error.message && error.message.includes('Invalid text')) {
        errorMsg = 'Invalid beneficiary principal format. Please check and try again.';
      } else if (error.message && error.message.includes('anonymous')) {
        errorMsg = 'Cannot register with anonymous principal. Please connect your wallet.';
      }
      showMessage(`Registration failed: ${errorMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleHeartbeat = async () => {
    setLoading(true);
    try {
      const identity = await getIdentity();
      const actor = await createActor(identity);
      const result = await actor.heartbeat();
      
      if ('ok' in result) {
        const nextDue = Number(result.ok.next_heartbeat_due) / 1_000_000;
        showMessage(`Heartbeat sent! Next due: ${new Date(nextDue).toLocaleString()}`, 'success');
        await loadAccountInfo();
      } else {
        showMessage(result.err, 'error');
      }
    } catch (error) {
      showMessage(`Heartbeat failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const identity = await getIdentity();
      const actor = await createActor(identity);
      const amount = BigInt(depositAmount);
      const result = await actor.deposit(amount);
      
      if ('ok' in result) {
        showMessage(result.ok, 'success');
        setDepositAmount('');
        await loadAccountInfo();
      } else {
        showMessage(result.err, 'error');
      }
    } catch (error) {
      const errorMsg = formatError(error);
      logICPEvent('deposit_error', { error: errorMsg });
      showMessage(`Deposit failed: ${errorMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (newTimeout, newBeneficiary) => {
    setLoading(true);
    try {
      const identity = await getIdentity();
      const actor = await createActor(identity);
      
      const timeout = newTimeout ? BigInt(newTimeout) : null;
      let beneficiaryPrincipal = null;
      if (newBeneficiary) {
        const { Principal } = await import('@dfinity/principal');
        beneficiaryPrincipal = Principal.fromText(newBeneficiary.trim());
      }

      const result = await actor.update_settings(timeout, beneficiaryPrincipal);
      if ('ok' in result) {
        showMessage(result.ok, 'success');
        await loadAccountInfo();
        setShowUpdateSettings(false);
      } else {
        showMessage(result.err, 'error');
      }
    } catch (error) {
      showMessage(`Update failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const identity = await getIdentity();
      const actor = await createActor(identity);
      const { Principal } = await import('@dfinity/principal');
      
      const amount = BigInt(withdrawAmount);
      const toPrincipal = Principal.fromText(withdrawTo.trim());
      
      const result = await actor.withdraw(amount, toPrincipal);
      if ('ok' in result) {
        showMessage(result.ok, 'success');
        setWithdrawAmount('');
        setWithdrawTo('');
        setShowWithdraw(false);
        await loadAccountInfo();
      } else {
        showMessage(result.err, 'error');
      }
    } catch (error) {
      showMessage(`Withdrawal failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportSettings = () => {
    if (!accountInfo) return;
    const settings = {
      timeout_duration_seconds: accountInfo.timeout_duration_seconds?.toString(),
      beneficiary: accountInfo.beneficiary?.toText ? accountInfo.beneficiary.toText() : String(accountInfo.beneficiary),
      principal: principal,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deadman-switch-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMessage('Settings exported!', 'success');
  };

  const importSettings = async (file) => {
    try {
      const text = await file.text();
      const settings = JSON.parse(text);
      if (settings.timeout_duration_seconds && settings.beneficiary) {
        await handleUpdateSettings(
          Number(settings.timeout_duration_seconds),
          settings.beneficiary
        );
      }
    } catch (error) {
      showMessage('Failed to import settings: ' + error.message, 'error');
    }
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const formatTime = (nanoseconds) => {
    const seconds = Number(nanoseconds) / 1_000_000_000;
    const date = new Date(seconds * 1000);
    return date.toLocaleString();
  };

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return 'N/A';
    const secs = Math.floor(seconds);
    if (secs < 60) {
      return `${secs} second${secs !== 1 ? 's' : ''}`;
    }
    const minutes = Math.floor(secs / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
      }
      return `${hours} hour${hours !== 1 ? 's' : ''}, ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
    return `${days} day${days !== 1 ? 's' : ''}, ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
  };

  const formatTimeRemaining = (seconds) => {
    if (seconds === null || seconds === undefined) return 'Calculating...';
    if (seconds <= 0) return 'TIMEOUT - Transfer pending';
    
    const secs = Math.floor(seconds);
    const days = Math.floor(secs / 86400);
    const hours = Math.floor((secs % 86400) / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const remainingSecs = secs % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (remainingSecs > 0 && days === 0) parts.push(`${remainingSecs}s`);

    return parts.join(' ') || '0s';
  };

  const formatBalance = (balance) => {
    if (!balance && balance !== 0) return '0';
    const btc = Number(balance) / 100_000_000; // 8 decimals
    return btc.toFixed(8);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showMessage('Copied to clipboard!', 'success');
    } catch (error) {
      console.error('Failed to copy:', error);
      showMessage('Failed to copy to clipboard', 'error');
    }
  };

  const extensionWallets = availableWallets.filter(w => w.id !== 'ii');
  const allWallets = Object.values(WALLETS);

  return (
    <ErrorBoundary>
      <div className="app">
      <header className="app-header">
        <div className="header-top-right">
          <div className="info-icon-container">
            <button
              className="info-icon"
              onClick={() => setShowInfoTooltip(!showInfoTooltip)}
              aria-label="About this app"
              title="About & FAQ"
            >
              ℹ️
            </button>
          </div>
        </div>
        <div className="header-title-container">
          <h1>🔐 ICP: In Case of Passing</h1>
        </div>
        <p>Automated ckBTC Transfer on Internet Computer Protocol (ICP)</p>
        {isConnected && (
          <div className="wallet-info">
            <div className="wallet-info-top">
              <div className="wallet-badge-container">
                <div className="wallet-badge">
                  {WALLETS[currentWallet?.toUpperCase()]?.icon} {WALLETS[currentWallet?.toUpperCase()]?.name || 'Connected'}
                </div>
              </div>
              <button onClick={handleDisconnect} className="btn-disconnect">
                Disconnect
              </button>
            </div>
            {principal && (
              <div className="principal-display">
                {principal}
              </div>
            )}
            {showAccountMetadata && (
                <div className="modal-overlay" onClick={() => setShowAccountMetadata(false)}>
                  <div className="modal-content account-metadata-modal" onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0 }}>Account Details</h3>
                      <button
                        onClick={() => setShowAccountMetadata(false)}
                        className="btn-refresh-small"
                        style={{ padding: '4px 8px', fontSize: '1rem' }}
                        title="Close"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="account-metadata-content">
                    <div className="metadata-grid">
                      <div className="metadata-item">
                        <label>Principal:</label>
                        <div className="metadata-value">
                          <code style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{principal}</code>
                          <button
                            onClick={() => copyToClipboard(principal)}
                            className="btn-copy-small"
                            title="Copy principal"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                      {identityNumber && (
                        <div className="metadata-item">
                          <label>Internet Identity #:</label>
                          <div className="metadata-value">{identityNumber}</div>
                        </div>
                      )}
                      {accountInfo ? (
                        <>
                          <div className="metadata-item">
                            <label>Account Status:</label>
                            <div className="metadata-value">
                              <span className="status-badge status-active">Registered</span>
                            </div>
                          </div>
                          <div className="metadata-item">
                            <label>Tracked Balance:</label>
                            <div className="metadata-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div>
                                <strong>{formatBalance(accountInfo.balance)} ckBTC</strong>
                                {ckbtcPrice?.price && (
                                  <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '2px' }}>
                                    ≈ ${((Number(accountInfo.balance) / 100_000_000) * ckbtcPrice.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                )}
                              </div>
                              <button 
                                onClick={async () => {
                                  try {
                                    await loadAccountInfo();
                                    showMessage('Tracked balance refreshed!', 'success');
                                  } catch (error) {
                                    showMessage('Failed to refresh balance', 'error');
                                  }
                                }}
                                className="btn-refresh-small"
                                title="Refresh tracked balance"
                                style={{ margin: 0 }}
                              >
                                ↻
                              </button>
                            </div>
                          </div>
                          {ledgerBalance !== null && (
                            <div className="metadata-item">
                              <label>Ledger Balance:</label>
                              <div className="metadata-value">
                                <strong>{formatBalance(ledgerBalance)} ckBTC</strong>
                                {ckbtcPrice?.price && (
                                  <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '2px' }}>
                                    ≈ ${((Number(ledgerBalance) / 100_000_000) * ckbtcPrice.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="metadata-item">
                            <label>Timeout Duration:</label>
                            <div className="metadata-value">
                              {formatDuration(Number(accountInfo.timeout_duration_seconds))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="metadata-item">
                          <label>Account Status:</label>
                          <div className="metadata-value">
                            <span className="status-badge status-inactive">Not Registered</span>
                          </div>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}
      </header>

      {message && (
        <div className={`message message-${messageType}`}>
          {message}
        </div>
      )}

      {showConfirmDialog && (
        <div className="modal-overlay" onClick={() => setShowConfirmDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Registration</h3>
            <p>You are about to register with the following settings:</p>
            <div className="confirm-details">
              <div><strong>Timeout Duration:</strong> {formatDuration(registerForm.timeoutDuration)}</div>
              <div><strong>Beneficiary:</strong> <code style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{registerForm.beneficiary.trim()}</code></div>
            </div>
            <p style={{ color: '#ef4444', fontSize: '0.9rem', marginTop: '16px' }}>
              ⚠️ <strong>Important:</strong> If you don't send a heartbeat within {formatDuration(registerForm.timeoutDuration)}, 
              your funds will automatically transfer to the beneficiary. Make sure you can send heartbeats regularly.
            </p>
            <div className="modal-actions">
              <button 
                onClick={() => setShowConfirmDialog(false)} 
                className="btn"
                style={{ background: 'white', color: '#1a1a1a' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmRegister} 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Registering...' : 'Confirm Registration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isConnected ? (
        <div className="card">
          <h2>Connect</h2>
          
          {/* Internet Identity - Primary Option */}
          <div className="wallet-list wallet-list-primary">
            <button
              onClick={() => handleConnectWallet('ii')}
              className="btn btn-primary-wallet"
              disabled={loading}
            >
              {WALLETS.INTERNET_IDENTITY.name}
            </button>
          </div>

        </div>
      ) : (
        <div className="dashboard">
          <div className="card price-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.1rem' }}>
                <span style={{ fontSize: '1.2rem' }}>₿</span>
                <span>ckBTC Price</span>
              </h2>
              <button
                onClick={async () => {
                  // Use the main fetchPrice function
                  await fetchPrice();
                  if (!priceError && ckbtcPrice && ckbtcPrice.price) {
                    showMessage('Price refreshed!', 'success');
                  }
                }}
                className="btn-refresh-small"
                title="Refresh price data"
                disabled={priceLoading}
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              >
                {priceLoading ? '⏳' : '↻'}
              </button>
            </div>

            {priceLoading && !ckbtcPrice ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '0.85rem' }}>
                ⏳ Loading...
              </div>
            ) : ckbtcPrice && ckbtcPrice.price ? (
              <div className="price-display-compact">
                <div className="price-header-compact">
                  <div className="price-main-compact">
                    <div className="price-value-compact">
                      ${ckbtcPrice.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {ckbtcPrice.change24h !== null && (
                      <div className={`price-change-compact ${ckbtcPrice.change24h >= 0 ? 'positive' : 'negative'}`}>
                        <span>{ckbtcPrice.change24h >= 0 ? '↗' : '↘'}</span>
                        <span>{Math.abs(ckbtcPrice.change24h).toFixed(2)}%</span>
                        <span className="change-period-compact">24h</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="price-stats-grid-compact">
                  {ckbtcPrice.marketCap && (
                    <div className="stat-card-compact">
                      <span className="stat-icon-compact">💎</span>
                      <div className="stat-content-compact">
                        <div className="stat-label-compact">Market Cap</div>
                        <div className="stat-value-compact">
                          ${(ckbtcPrice.marketCap / 1e6).toFixed(2)}M
                        </div>
                        <div className="stat-subvalue-compact">
                          ${ckbtcPrice.marketCap.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>
                  )}

                  {ckbtcPrice.volume24h && (
                    <div className="stat-card-compact">
                      <span className="stat-icon-compact">📊</span>
                      <div className="stat-content-compact">
                        <div className="stat-label-compact">24h Volume</div>
                        <div className="stat-value-compact">
                          ${(ckbtcPrice.volume24h / 1e6).toFixed(2)}M
                        </div>
                        <div className="stat-subvalue-compact">
                          ${ckbtcPrice.volume24h.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>
                  )}

                  {ckbtcPrice.change7d !== null && (
                    <div className="stat-card-compact">
                      <span className="stat-icon-compact">📈</span>
                      <div className="stat-content-compact">
                        <div className="stat-label-compact">7d</div>
                        <div className={`stat-value-compact ${ckbtcPrice.change7d >= 0 ? 'positive' : 'negative'}`}>
                          {ckbtcPrice.change7d >= 0 ? '+' : ''}{ckbtcPrice.change7d.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  )}

                  {ckbtcPrice.change30d !== null && (
                    <div className="stat-card-compact">
                      <span className="stat-icon-compact">📅</span>
                      <div className="stat-content-compact">
                        <div className="stat-label-compact">30d</div>
                        <div className={`stat-value-compact ${ckbtcPrice.change30d >= 0 ? 'positive' : 'negative'}`}>
                          {ckbtcPrice.change30d >= 0 ? '+' : ''}{ckbtcPrice.change30d.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="price-footer-compact">
                  <div className="ckbtc-info-compact">
                    <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                      <span style={{ fontSize: '1rem' }}>💡</span>
                      <div>
                        <strong style={{ display: 'block', marginBottom: '4px', color: '#9a3412', fontSize: '0.85rem' }}>About ckBTC</strong>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#D4731C', lineHeight: '1.5' }}>
                          ckBTC (Chain-key Bitcoin) is a 1:1 representation of Bitcoin on ICP. It offers faster transactions and lower fees while maintaining Bitcoin's value.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="price-links-compact">
                    <a 
                      href="https://coinmarketcap.com/currencies/chain-key-bitcoin/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="price-link-compact"
                    >
                      CMC
                    </a>
                    <a 
                      href="https://www.coingecko.com/en/coins/chain-key-bitcoin" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="price-link-compact"
                    >
                      CG
                    </a>
                    {ckbtcPrice.source.includes('Bitcoin proxy') && (
                      <a 
                        href="https://www.coingecko.com/en/coins/bitcoin" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="price-link-compact"
                      >
                        BTC
                      </a>
                    )}
                  </div>
                  {ckbtcPrice.lastUpdated && (
                    <div className="price-updated-compact">
                      {new Date(ckbtcPrice.lastUpdated * 1000).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="price-error-compact">
                <div className="error-card-compact">
                  <span>⚠️</span> Price unavailable
                </div>
                <div className="price-links-compact" style={{ marginTop: '8px' }}>
                  <a href="https://coinmarketcap.com/currencies/chain-key-bitcoin/" target="_blank" rel="noopener noreferrer" className="price-link-compact">CMC</a>
                  <a href="https://www.coingecko.com/en/coins/chain-key-bitcoin" target="_blank" rel="noopener noreferrer" className="price-link-compact">CG</a>
                  <a href="https://www.coingecko.com/en/coins/bitcoin" target="_blank" rel="noopener noreferrer" className="price-link-compact">BTC</a>
                </div>
              </div>
            )}
          </div>

          {/* Wallet Assets Section */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>💼</span>
                <span>Wallet Assets</span>
              </h2>
              <button
                onClick={loadWalletAssets}
                className="btn-refresh-small"
                title="Refresh assets"
                disabled={assetsLoading}
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              >
                {assetsLoading ? '⏳' : '↻'}
              </button>
            </div>

            {/* Check Any Address Section */}
            <AddressBalanceChecker />

            {/* How to Get ckBTC Section */}
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e5e5' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>💱</span>
                <span>How to Get ckBTC</span>
              </h3>
              
              <div className="ckbtc-guide">
                <div className="guide-section">
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔄</span>
                    <span>Method 1: Swap on DEX</span>
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px', lineHeight: '1.5' }}>
                    Swap ICP or other tokens for ckBTC on decentralized exchanges:
                  </p>
                  <div className="guide-links">
                    <a 
                      href="https://app.icpswap.com/swap" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="guide-link"
                    >
                      <span>🔄</span>
                      <span>ICPSwap</span>
                      <span>→</span>
                    </a>
                    <a 
                      href="https://kongswap.io" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="guide-link"
                    >
                      <span>🦍</span>
                      <span>KongSwap</span>
                      <span>→</span>
                    </a>
                  </div>
                </div>

                <div className="guide-section" style={{ marginTop: '20px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🏪</span>
                    <span>Method 2: Buy on Exchange</span>
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px', lineHeight: '1.5' }}>
                    Purchase ckBTC directly from centralized exchanges:
                  </p>
                  <div className="guide-links">
                    <a 
                      href="https://www.gate.io/trade/ckBTC_USDT" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="guide-link"
                    >
                      <span>💳</span>
                      <span>Gate.io</span>
                      <span>→</span>
                    </a>
                    <a 
                      href="https://www.kucoin.com/trade/ckBTC-USDT" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="guide-link"
                    >
                      <span>💳</span>
                      <span>KuCoin</span>
                      <span>→</span>
                    </a>
                    <a 
                      href="https://www.okx.com/trade-spot/ckbtc-usdt" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="guide-link"
                    >
                      <span>💳</span>
                      <span>OKX</span>
                      <span>→</span>
                    </a>
                    <a 
                      href="https://www.mexc.com/exchange/ckBTC_USDT" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="guide-link"
                    >
                      <span>💳</span>
                      <span>MEXC</span>
                      <span>→</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Account Status</h2>
              <button 
                onClick={async () => {
                  try {
                    await loadAccountInfo();
                    showMessage('Account info refreshed!', 'success');
                  } catch (error) {
                    showMessage('Failed to refresh account info', 'error');
                  }
                }}
                className="btn-refresh-small"
                title="Refresh account info"
              >
                ↻ Refresh
              </button>
            </div>
            <div className="info-grid">
              <div>
                <label>Principal:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <code style={{ flex: 1, minWidth: 0 }}>{principal}</code>
                  {identityNumber && (
                    <span style={{ 
                      background: '#fff7ed', 
                      color: '#9a3412', 
                      padding: '4px 10px', 
                      borderRadius: '2px',
                      fontSize: '0.85rem',
                      fontWeight: '500'
                    }}>
                      ID: {identityNumber}
                    </span>
                  )}
                  <button
                    onClick={() => copyToClipboard(principal)}
                    className="btn-refresh-small"
                    title="Copy principal"
                  >
                    📋
                  </button>
                </div>
              </div>
              {accountInfo ? (
                <>
                  <div>
                    <label>Status:</label>
                    <span className="status-badge status-active">Registered</span>
                  </div>
                  {timeRemaining !== null && (
                    <>
                  <div>
                        <label>Time Until Timeout:</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ 
                            color: timeRemaining < 3600 ? '#ef4444' : timeRemaining < 86400 ? '#f59e0b' : '#F7931A',
                            fontSize: '1.1rem'
                          }}>
                            {formatTimeRemaining(timeRemaining)}
                          </strong>
                          {timeRemaining < 3600 && (
                            <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>⚠️ Urgent</span>
                          )}
                        </div>
                      </div>
                      {timeRemaining < 3600 && (
                        <div className="timeout-urgent">
                          <strong style={{ color: '#ef4444', display: 'block', marginBottom: '4px' }}>
                            ⚠️ URGENT: Timeout Approaching
                          </strong>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#991b1b' }}>
                            You have less than 1 hour remaining. Send a heartbeat immediately to prevent automatic transfer to your beneficiary.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  <div>
                    <label>Tracked Balance:</label>
                    <div>
                    <strong>{formatBalance(accountInfo.balance)} ckBTC</strong>
                      {ckbtcPrice?.price && (
                        <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                          ≈ ${((Number(accountInfo.balance) / 100_000_000) * ckbtcPrice.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                      )}
                    </div>
                  </div>
                  {ledgerBalance !== null && (
                    <div>
                      <label>Ledger Balance:</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div>
                          <strong>{formatBalance(ledgerBalance)} ckBTC</strong>
                          {ckbtcPrice?.price && (
                            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                              ≈ ${((Number(ledgerBalance) / 100_000_000) * ckbtcPrice.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={async () => {
                            try {
                              const identity = await getIdentity();
                              const actor = await createActor(identity);
                              await loadLedgerBalance(actor);
                              showMessage('Balance refreshed!', 'success');
                            } catch (error) {
                              showMessage('Failed to refresh balance', 'error');
                            }
                          }}
                          className="btn-refresh-small"
                          style={{ margin: 0 }}
                        >
                          ↻
                        </button>
                      </div>
                    </div>
                  )}
                  <div>
                    <label>Timeout Duration:</label>
                    <span>{formatDuration(Number(accountInfo.timeout_duration_seconds))}</span>
                  </div>
                  <div>
                    <label>Last Heartbeat:</label>
                    <span>{formatTime(accountInfo.last_heartbeat)}</span>
                  </div>
                  <div>
                    <label>Beneficiary:</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <code style={{ flex: 1 }}>
                        {accountInfo.beneficiary?.toText ? accountInfo.beneficiary.toText() : String(accountInfo.beneficiary)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(accountInfo.beneficiary?.toText ? accountInfo.beneficiary.toText() : String(accountInfo.beneficiary))}
                        className="btn-refresh-small"
                        title="Copy beneficiary"
                      >
                        📋
                      </button>
                      <a
                        href={`https://dashboard.internetcomputer.org/principal/${encodeURIComponent(accountInfo.beneficiary?.toText ? accountInfo.beneficiary.toText() : String(accountInfo.beneficiary))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-refresh-small"
                        style={{ textDecoration: 'none', color: 'inherit' }}
                        title="View on ICP Explorer"
                      >
                        🔍
                      </a>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label>Status:</label>
                  <span className="status-badge status-inactive">Not Registered</span>
                </div>
              )}
            </div>
          </div>

          {/* Step-by-Step Flow */}
          {!accountInfo ? (
            <>
              {/* Step 1: Connect Identity - Already Completed */}
              {isConnected && (
                <div className="card step-card" style={{ borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ 
                      background: '#10b981', 
                      color: 'white', 
                      borderRadius: '50%', 
                      width: '32px', 
                      height: '32px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '1.1rem'
                    }}>
                      ✓
                    </div>
                    <h2 style={{ margin: 0, color: '#10b981' }}>Step 1: Connect Identity</h2>
                  </div>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.9rem', marginBottom: '8px' }}>
                    ✅ Identity (Principal ID) connected successfully. You're ready to register your account.
                  </p>
                  <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '6px', border: '1px solid #a7f3d0', fontSize: '0.85rem', color: '#065f46' }}>
                    <strong style={{ display: 'block', marginBottom: '4px' }}>🔒 Privacy Note:</strong>
                    <p style={{ margin: 0, lineHeight: '1.5' }}>
                      Your Principal ID is used for authentication. Wallet addresses (where tokens are stored) are derived from your Principal but cannot be reverse-looked up, providing privacy-preserving separation between your identity and your assets.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: Register Account */}
              <div id="register">
                <RegistrationForm
                  onRegister={async (formData) => {
                    setLoading(true);
                    try {
                      const identity = await getIdentity();
                      const actor = await createActor(identity);
                      const { Principal } = await import('@dfinity/principal');
                      const beneficiaryPrincipal = Principal.fromText(formData.beneficiary.trim());
                      
                      const result = await actor.register({
                        timeout_duration_seconds: BigInt(formData.timeoutDuration),
                        beneficiary: beneficiaryPrincipal
                      });
                      
                      if ('ok' in result) {
                        showMessage(result.ok, 'success');
                        await loadAccountInfo();
                      } else {
                        const errorMsg = result.err || 'Registration failed';
                        showMessage(errorMsg, 'error');
                      }
                    } catch (error) {
                      let errorMsg = error.message || 'Registration failed';
                      
                      // Check for certificate/signature errors
                      if (error.message && (
                        error.message.includes('Invalid delegation') ||
                        error.message.includes('Invalid canister signature') ||
                        error.message.includes('certificate verification failed') ||
                        error.message.includes('threshold signature')
                      )) {
                        // In local dev, this is expected - production II doesn't work with local replica
                        if (import.meta.env.DEV) {
                          errorMsg = 'Local Development: Registration via UI requires mainnet deployment. ' +
                                     'For local testing, use CLI commands (see terminal).';
                        } else {
                          errorMsg = 'Certificate verification failed. Please disconnect and reconnect your wallet to refresh your identity session.';
                        }
                        console.error('Certificate error detected:', error);
                      }
                      showMessage(`Registration failed: ${errorMsg}`, 'error');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  loading={loading}
                  accountInfo={accountInfo}
                  showMessage={showMessage}
                />
              </div>
            </>
          ) : (
            <>
              {/* Step 1 & 2: Completed */}
              <div className="card step-card" style={{ borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ 
                    background: '#10b981', 
                    color: 'white', 
                    borderRadius: '50%', 
                    width: '28px', 
                    height: '28px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}>
                    ✓
                  </div>
                  <span style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: '500' }}>Step 1: Identity Connected</span>
                </div>
              </div>
              <div className="card step-card" style={{ borderLeft: '4px solid #10b981', background: '#f0fdf4', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ 
                    background: '#10b981', 
                    color: 'white', 
                    borderRadius: '50%', 
                    width: '28px', 
                    height: '28px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}>
                    ✓
                  </div>
                  <span style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: '500' }}>Step 2: Account Registered</span>
                </div>
              </div>

              {/* Step 3: Deposit ckBTC */}
              <div className="card step-card" id="deposit" style={{ borderLeft: '4px solid #3b82f6', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ 
                    background: '#3b82f6', 
                    color: 'white', 
                    borderRadius: '50%', 
                    width: '32px', 
                    height: '32px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '1.1rem'
                  }}>
                    3
                  </div>
                  <div>
                    <h2 style={{ margin: 0 }}>Step 3: Deposit ckBTC</h2>
                    <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '0.85rem' }}>
                      Transfer ckBTC to the canister and record your deposit
                    </p>
                  </div>
                </div>
                <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #bfdbfe' }}>
                  <strong style={{ color: '#1e40af', display: 'block', marginBottom: '4px' }}>📋 Instructions:</strong>
                  <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: '#1e40af', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    <li>Copy the canister address below</li>
                    <li>Send ckBTC from your wallet to this address</li>
                    <li>Enter the amount you transferred and click "Record Deposit"</li>
                  </ol>
                </div>
                {canisterAddress && (
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label>Canister Address (Send ckBTC here):</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <code style={{ flex: 1, padding: '10px 12px', background: '#fafafa', border: '1px solid #e5e5e5', wordBreak: 'break-all' }}>
                        {canisterAddress}
                      </code>
                      <button
                        onClick={() => copyToClipboard(canisterAddress)}
                        className="btn-refresh-small"
                        title="Copy address"
                        style={{ padding: '10px 12px' }}
                      >
                        📋
                      </button>
                    </div>
                    <small>Send ckBTC to this canister address from your wallet</small>
                    {canisterAddress && (
                      <div style={{ marginTop: '8px' }}>
                        <a
                          href={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(canisterAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.85rem', color: '#1a1a1a', textDecoration: 'underline' }}
                        >
                          📱 Show QR Code
                        </a>
                      </div>
                    )}
                  </div>
                )}
                <form onSubmit={handleDeposit}>
                  <div className="form-group">
                    <label>Amount (smallest unit, 8 decimals)</label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="1000000 = 0.01 ckBTC"
                      required
                    />
                    <small>Enter the amount you transferred (e.g., 1000000 = 0.01 ckBTC)</small>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Processing...' : 'Record Deposit'}
                  </button>
                </form>
              </div>

              {/* Step 4: Send Heartbeats */}
              <div id="heartbeat" style={{ marginTop: '12px' }}>
                <HeartbeatButton
                  onHeartbeat={async () => {
                    const identity = await getIdentity();
                    const actor = await createActor(identity);
                    const result = await actor.heartbeat();
                    
                    if ('ok' in result) {
                      await loadAccountInfo();
                      return result.ok;
                    } else {
                      throw new Error(result.err);
                    }
                  }}
                  accountInfo={accountInfo}
                  loading={loading}
                  showMessage={showMessage}
                />
              </div>

              {/* Step 5: Account Dashboard */}
              <div id="account-status" style={{ marginTop: '12px' }}>
                <AccountDashboard
                  accountInfo={accountInfo}
                  ledgerBalance={ledgerBalance}
                  onUpdateSettings={() => setShowUpdateSettings(true)}
                  onWithdraw={() => setShowWithdraw(true)}
                  showMessage={showMessage}
                  onSetMockBalance={async () => {
                    const currentBalance = accountInfo?.balance ? Number(accountInfo.balance) / 100_000_000 : 0;
                    const amount = prompt(`Enter amount to ADD in ckBTC (e.g., 0.5 to add 0.5 ckBTC):\n\nCurrent balance: ${currentBalance.toFixed(8)} ckBTC`, '0.5');
                    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
                      showMessage('Invalid amount. Please enter a positive number.', 'error');
                      return;
                    }
                    const amountSatoshi = BigInt(Math.floor(parseFloat(amount) * 100_000_000));
                    setLoading(true);
                    try {
                      const identity = await getIdentity();
                      const actor = await createActor(identity);
                      const result = await actor.set_mock_balance(amountSatoshi);
                      if ('ok' in result) {
                        showMessage(result.ok, 'success');
                        await loadAccountInfo(identity);
                      } else {
                        showMessage(`Failed: ${result.err}`, 'error');
                      }
                    } catch (error) {
                      showMessage(`Error: ${error.message}`, 'error');
                    } finally {
                      setLoading(false);
                    }
                  }}
                />
              </div>

              {/* Transaction History */}
              <div style={{ marginTop: '12px' }}>
                <TransactionHistory
                  accountInfo={accountInfo}
                  onLoadHistory={async () => {
                    const identity = await getIdentity();
                    const actor = await createActor(identity);
                    return await actor.get_transaction_history();
                  }}
                />
              </div>

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h2 style={{ margin: 0 }}>Update Settings</h2>
                  <button
                    onClick={() => setShowUpdateSettings(!showUpdateSettings)}
                    className="btn-refresh-small"
                    style={{ padding: '6px 12px' }}
                  >
                    {showUpdateSettings ? '✕ Cancel' : '⚙️ Update'}
                  </button>
                </div>
                {showUpdateSettings && (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const newTimeout = e.target.timeout?.value ? parseInt(e.target.timeout.value) : null;
                    const newBeneficiary = e.target.beneficiary?.value || null;
                    handleUpdateSettings(newTimeout, newBeneficiary);
                  }}>
                    <div className="form-group">
                      <label>New Timeout Duration (optional)</label>
                      <input
                        type="number"
                        name="timeout"
                        min="60"
                        placeholder={accountInfo?.timeout_duration_seconds?.toString() || '3600'}
                      />
                      <small>Leave empty to keep current timeout</small>
                    </div>
                    <div className="form-group">
                      <label>New Beneficiary (optional)</label>
                      <input
                        type="text"
                        name="beneficiary"
                        placeholder={accountInfo?.beneficiary?.toText ? accountInfo.beneficiary.toText() : String(accountInfo?.beneficiary || '')}
                      />
                      <small>Leave empty to keep current beneficiary</small>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Updating...' : 'Update Settings'}
                    </button>
                  </form>
                )}
                {!showUpdateSettings && (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                    <button
                      onClick={exportSettings}
                      className="btn-refresh-small"
                      style={{ padding: '6px 12px' }}
                    >
                      📥 Export Settings
                    </button>
                    <label className="btn-refresh-small" style={{ padding: '6px 12px', cursor: 'pointer' }}>
                      📤 Import Settings
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) importSettings(file);
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h2 style={{ margin: 0 }}>Withdraw ckBTC</h2>
                  <button
                    onClick={() => setShowWithdraw(!showWithdraw)}
                    className="btn-refresh-small"
                    style={{ padding: '6px 12px' }}
                  >
                    {showWithdraw ? '✕ Cancel' : '💸 Withdraw'}
                  </button>
                </div>
                {showWithdraw && (
                  <form onSubmit={handleWithdraw}>
                    <div className="form-group">
                      <label>Amount (smallest unit, 8 decimals)</label>
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="1000000 = 0.01 ckBTC"
                        required
                      />
                      <small>Enter amount to withdraw (e.g., 1000000 = 0.01 ckBTC)</small>
                    </div>
                    <div className="form-group">
                      <label>Withdraw To (Principal)</label>
                      <input
                        type="text"
                        value={withdrawTo}
                        onChange={(e) => setWithdrawTo(e.target.value)}
                        placeholder="Enter principal address"
                        required
                      />
                      {principal && (
                        <button
                          type="button"
                          onClick={() => setWithdrawTo(principal)}
                          className="btn-refresh-small"
                          style={{ marginTop: '8px', padding: '6px 12px' }}
                        >
                          Use My Principal
                        </button>
                      )}
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Processing...' : 'Withdraw'}
                    </button>
                  </form>
                )}
                {!showWithdraw && (
                  <p style={{ color: '#666', fontSize: '0.9rem' }}>Withdraw ckBTC from the dead man switch before timeout occurs.</p>
                )}
              </div>

              <div className="card">
                <h2>Statistics</h2>
                {accountInfo && transactionHistory && (
                  <div className="statistics-grid">
                    <div className="stat-item">
                      <div className="stat-label">Total Heartbeats</div>
                      <div className="stat-value">
                        {transactionHistory.filter(tx => tx.transaction_type === 'heartbeat').length}
                      </div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">Total Deposits</div>
                      <div className="stat-value">
                        {transactionHistory.filter(tx => tx.transaction_type === 'deposit').length}
                      </div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">Days Active</div>
                      <div className="stat-value">
                        {transactionHistory.length > 0 ? Math.ceil((Number(transactionHistory[transactionHistory.length - 1].timestamp) - Number(transactionHistory[0].timestamp)) / 1_000_000 / 86400) : 0}
                      </div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">Last Activity</div>
                      <div className="stat-value" style={{ fontSize: '0.85rem' }}>
                        {transactionHistory.length > 0 ? new Date(Number(transactionHistory[transactionHistory.length - 1].timestamp) / 1_000_000).toLocaleDateString() : 'Never'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="card">
                <h2>Transaction History</h2>
                {transactionHistory && transactionHistory.length > 0 ? (
                  <div className="transaction-history">
                    {transactionHistory.slice().reverse().map((tx, index) => (
                      <div key={index} className="transaction-item">
                        <div className="transaction-header">
                          <span className={`transaction-type transaction-${tx.transaction_type}`}>
                            {tx.transaction_type === 'heartbeat' ? '💓' : 
                             tx.transaction_type === 'deposit' ? '💰' :
                             tx.transaction_type === 'withdrawal' ? '💸' :
                             tx.transaction_type === 'transfer' ? '🔄' :
                             tx.transaction_type === 'update' ? '⚙️' : '📝'}
                            {tx.transaction_type.charAt(0).toUpperCase() + tx.transaction_type.slice(1)}
                          </span>
                          <span className="transaction-time">
                            {new Date(Number(tx.timestamp) / 1_000_000).toLocaleString()}
                          </span>
                        </div>
                        {tx.amount && (
                          <div className="transaction-amount">
                            {formatBalance(tx.amount)} ckBTC
                            {ckbtcPrice?.price && (
                              <span style={{ marginLeft: '8px', color: '#999', fontSize: '0.85rem' }}>
                                (${((Number(tx.amount) / 100_000_000) * ckbtcPrice.price).toFixed(2)})
                              </span>
                            )}
                          </div>
                        )}
                        <div className="transaction-details">{tx.details}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                    No transaction history yet
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
      
      <footer className="app-footer">
        <div className="footer-content">
          <span>
            <a 
              href="https://internetcomputer.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
            >
              🌐 Built on ICP
            </a>
          </span>
          <span className="footer-separator">|</span>
          <span>
            Made by{' '}
            <a 
              href="https://github.com/edwardtay" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
            >
              👨‍💻 Edward
            </a>
          </span>
        </div>
      </footer>


      </div>

      {/* Info Modal */}
      <InfoModal 
        show={showInfoTooltip} 
        onClose={() => setShowInfoTooltip(false)} 
      />
    </ErrorBoundary>
  );
}

export default App;
