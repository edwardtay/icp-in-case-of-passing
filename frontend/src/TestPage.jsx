import React, { useState } from 'react';
import { createActor, CANISTER_ID } from './canister';
import { Principal } from '@dfinity/principal';
import { formatError, logICPEvent } from './icp-utils';
import './App.css';

function TestPage() {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIdentity, setCurrentIdentity] = useState(null);
  const [principal, setPrincipal] = useState(null);

  // Test states
  const [testPrincipal, setTestPrincipal] = useState('');
  const [testTimeout, setTestTimeout] = useState('3600');
  const [testBeneficiary, setTestBeneficiary] = useState('');
  const [testAmount, setTestAmount] = useState('1000000');
  const [testMessage, setTestMessage] = useState('');
  
  // ckBTC specific states
  const [ckbtcLedgerId, setCkbtcLedgerId] = useState('mxzaz-hqaaa-aaaar-qaada-cai'); // Testnet ckBTC ledger
  const [testTransferTo, setTestTransferTo] = useState('');
  const [testApproveSpender, setTestApproveSpender] = useState('');
  const [testApproveAmount, setTestApproveAmount] = useState('1000000');
  const [testTransferFrom, setTestTransferFrom] = useState('');
  const [ckbtcMetadata, setCkbtcMetadata] = useState(null);
  const [ckbtcFee, setCkbtcFee] = useState(null);

  const addTestResult = (testName, result, error = null) => {
    const resultObj = {
      id: Date.now(),
      test: testName,
      success: !error,
      result: result,
      error: error,
      timestamp: new Date().toISOString()
    };
    setTestResults(prev => [resultObj, ...prev]);
    logICPEvent('test_executed', { test: testName, success: !error });
  };

  const connectForTesting = async () => {
    setLoading(true);
    try {
      const { AuthClient } = await import('@dfinity/auth-client');
      const authClient = await AuthClient.create();
      
      // Use local II for local development, mainnet II for production
      const identityProvider = import.meta.env.DEV 
        ? `http://localhost:4943?canisterId=rdmx6-jaaaa-aaaaa-aaadq-cai`
        : 'https://identity.ic0.app';
      
      return new Promise((resolve, reject) => {
        authClient.login({
          identityProvider: identityProvider,
          maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000),
          onSuccess: () => {
            try {
              const identity = authClient.getIdentity();
              if (identity && !identity.getPrincipal().isAnonymous()) {
                const principalText = identity.getPrincipal().toText();
                setCurrentIdentity(identity);
                setPrincipal(principalText);
                addTestResult('Connect Identity', `Connected: ${principalText}`, null);
                resolve(identity);
              } else {
                throw new Error('Anonymous identity');
              }
            } catch (e) {
              addTestResult('Connect Identity', null, e.message);
              reject(e);
            }
          },
          onError: (error) => {
            addTestResult('Connect Identity', null, error.message || 'Login failed');
            reject(error);
          }
        });
      });
    } catch (error) {
      addTestResult('Connect Identity', null, error.message);
    } finally {
      setLoading(false);
    }
  };

  const testGreet = async () => {
    if (!currentIdentity) {
      addTestResult('Greet Test', null, 'Not connected. Please connect first.');
      return;
    }

    setLoading(true);
    try {
      // Check if canister is available
      if (!CANISTER_ID || CANISTER_ID === 'rrkah-fqaaa-aaaaa-aaaaq-cai') {
        addTestResult('Greet Test', null, 'Canister ID not set. Make sure the canister is deployed and VITE_CANISTER_ID is set.');
        return;
      }

      const actor = await createActor(currentIdentity);
      const result = await actor.greet('Test User');
      addTestResult('Greet Test', result, null);
    } catch (error) {
      const errorMsg = formatError(error);
      // Provide helpful error messages
      if (errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
        addTestResult('Greet Test', null, `Connection failed: ${errorMsg}. Make sure dfx is running (dfx start) and the canister is deployed (dfx deploy).`);
      } else {
        addTestResult('Greet Test', null, errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const testGetAccountInfo = async () => {
    if (!currentIdentity) {
      addTestResult('Get Account Info', null, 'Not connected. Please connect first.');
      return;
    }

    setLoading(true);
    try {
      if (!CANISTER_ID || CANISTER_ID === 'rrkah-fqaaa-aaaaa-aaaaq-cai') {
        addTestResult('Get Account Info', null, 'Canister ID not set. Make sure the canister is deployed.');
        return;
      }

      const actor = await createActor(currentIdentity);
      const result = await actor.get_account_info();
      if ('ok' in result) {
        addTestResult('Get Account Info', JSON.stringify(result.ok, null, 2), null);
      } else {
        addTestResult('Get Account Info', null, result.err);
      }
    } catch (error) {
      const errorMsg = formatError(error);
      if (errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
        addTestResult('Get Account Info', null, `Connection failed: ${errorMsg}. Make sure dfx is running.`);
      } else {
        addTestResult('Get Account Info', null, errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const testRegister = async () => {
    if (!currentIdentity) {
      addTestResult('Register Test', null, 'Not connected. Please connect first.');
      return;
    }

    if (!testBeneficiary) {
      addTestResult('Register Test', null, 'Please enter a beneficiary principal');
      return;
    }

    setLoading(true);
    try {
      if (!CANISTER_ID || CANISTER_ID === 'rrkah-fqaaa-aaaaa-aaaaq-cai') {
        addTestResult('Register Test', null, 'Canister ID not set. Make sure the canister is deployed.');
        return;
      }

      const actor = await createActor(currentIdentity);
      const beneficiaryPrincipal = Principal.fromText(testBeneficiary);
      const result = await actor.register({
        timeout_duration_seconds: BigInt(parseInt(testTimeout)),
        beneficiary: beneficiaryPrincipal
      });

      if ('ok' in result) {
        addTestResult('Register Test', result.ok, null);
      } else {
        addTestResult('Register Test', null, result.err);
      }
    } catch (error) {
      const errorMsg = formatError(error);
      if (errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
        addTestResult('Register Test', null, `Connection failed: ${errorMsg}. Make sure dfx is running.`);
      } else {
        addTestResult('Register Test', null, errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const testHeartbeat = async () => {
    if (!currentIdentity) {
      addTestResult('Heartbeat Test', null, 'Not connected. Please connect first.');
      return;
    }

    setLoading(true);
    try {
      if (!CANISTER_ID || CANISTER_ID === 'rrkah-fqaaa-aaaaa-aaaaq-cai') {
        addTestResult('Heartbeat Test', null, 'Canister ID not set. Make sure the canister is deployed.');
        return;
      }

      const actor = await createActor(currentIdentity);
      const result = await actor.heartbeat();
      if ('ok' in result) {
        addTestResult('Heartbeat Test', JSON.stringify(result.ok, null, 2), null);
      } else {
        addTestResult('Heartbeat Test', null, result.err);
      }
    } catch (error) {
      const errorMsg = formatError(error);
      if (errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
        addTestResult('Heartbeat Test', null, `Connection failed: ${errorMsg}. Make sure dfx is running (dfx start) and the canister is deployed (dfx deploy).`);
      } else {
        addTestResult('Heartbeat Test', null, errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const testDeposit = async () => {
    if (!currentIdentity) {
      addTestResult('Deposit Test', null, 'Not connected. Please connect first.');
      return;
    }

    setLoading(true);
    try {
      if (!CANISTER_ID || CANISTER_ID === 'rrkah-fqaaa-aaaaa-aaaaq-cai') {
        addTestResult('Deposit Test', null, 'Canister ID not set. Make sure the canister is deployed.');
        return;
      }

      const actor = await createActor(currentIdentity);
      const amount = BigInt(testAmount);
      const result = await actor.deposit(amount);
      if ('ok' in result) {
        addTestResult('Deposit Test', result.ok, null);
      } else {
        addTestResult('Deposit Test', null, result.err);
      }
    } catch (error) {
      const errorMsg = formatError(error);
      if (errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
        addTestResult('Deposit Test', null, `Connection failed: ${errorMsg}. Make sure dfx is running.`);
      } else {
        addTestResult('Deposit Test', null, errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const testGetBalance = async () => {
    if (!currentIdentity) {
      addTestResult('Get Balance Test', null, 'Not connected. Please connect first.');
      return;
    }

    setLoading(true);
    try {
      if (!CANISTER_ID || CANISTER_ID === 'rrkah-fqaaa-aaaaa-aaaaq-cai') {
        addTestResult('Get Balance Test', null, 'Canister ID not set. Make sure the canister is deployed.');
        return;
      }

      const actor = await createActor(currentIdentity);
      const result = await actor.get_ckbtc_balance();
      if ('ok' in result) {
        addTestResult('Get Balance Test', `Balance: ${result.ok} (${Number(result.ok) / 100_000_000} ckBTC)`, null);
      } else {
        addTestResult('Get Balance Test', null, result.err);
      }
    } catch (error) {
      const errorMsg = formatError(error);
      if (errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
        addTestResult('Get Balance Test', null, `Connection failed: ${errorMsg}. Make sure dfx is running.`);
      } else {
        addTestResult('Get Balance Test', null, errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const testListUsers = async () => {
    if (!currentIdentity) {
      addTestResult('List Users Test', null, 'Not connected. Please connect first.');
      return;
    }

    setLoading(true);
    try {
      if (!CANISTER_ID || CANISTER_ID === 'rrkah-fqaaa-aaaaa-aaaaq-cai') {
        addTestResult('List Users Test', null, 'Canister ID not set. Make sure the canister is deployed.');
        return;
      }

      const actor = await createActor(currentIdentity);
      const result = await actor.list_users();
      addTestResult('List Users Test', `Found ${result.length} users: ${JSON.stringify(result, null, 2)}`, null);
    } catch (error) {
      const errorMsg = formatError(error);
      if (errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
        addTestResult('List Users Test', null, `Connection failed: ${errorMsg}. Make sure dfx is running.`);
      } else {
        addTestResult('List Users Test', null, errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const testPrincipalValidation = () => {
    try {
      if (!testPrincipal) {
        addTestResult('Principal Validation', null, 'Please enter a principal');
        return;
      }
      const principal = Principal.fromText(testPrincipal);
      addTestResult('Principal Validation', `Valid: ${principal.toText()}`, null);
    } catch (error) {
      addTestResult('Principal Validation', null, error.message);
    }
  };

  // ckBTC Ledger Direct Tests
  const createCkbtcActor = async () => {
    const { Actor, HttpAgent } = await import('@dfinity/agent');
    
    // Define inline IDL for ICRC-1 standard
    const idlFactory = ({ IDL }) => {
      // Define TransferError variant
      const TransferError = IDL.Variant({
        InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
        GenericError: IDL.Record({ message: IDL.Text, error_code: IDL.Nat }),
        TemporarilyUnavailable: IDL.Null,
        BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
        Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
        BadFee: IDL.Record({ expected_fee: IDL.Nat }),
        CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
        TooOld: IDL.Null,
        InsufficientAllowance: IDL.Record({ allowance: IDL.Nat }),
      });
      
      // Define TransferResult variant
      const TransferResult = IDL.Variant({
        Ok: IDL.Nat,
        Err: TransferError,
      });
      
      // Define MetadataValue variant
      const MetadataValue = IDL.Variant({
        Nat: IDL.Nat,
        Int: IDL.Int,
        Text: IDL.Text,
        Blob: IDL.Vec(IDL.Nat8),
      });
      
      // Define Account record
      const Account = IDL.Record({
        owner: IDL.Principal,
        subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
      });
      
      // Define TransferArgs record
      const TransferArgs = IDL.Record({
        from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
        to: Account,
        amount: IDL.Nat,
        fee: IDL.Opt(IDL.Nat),
        memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
        created_at_time: IDL.Opt(IDL.Nat64),
      });
      
      return IDL.Service({
        icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query']),
        icrc1_transfer: IDL.Func([TransferArgs], [TransferResult], []),
        icrc1_metadata: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, MetadataValue))], ['query']),
        icrc1_fee: IDL.Func([], [IDL.Nat], ['query']),
        icrc1_decimals: IDL.Func([], [IDL.Nat8], ['query']),
        icrc1_symbol: IDL.Func([], [IDL.Text], ['query']),
        icrc1_name: IDL.Func([], [IDL.Text], ['query']),
      });
    };

    const agent = new HttpAgent({
      host: import.meta.env.DEV ? 'http://localhost:4943' : 'https://ic0.app',
      identity: currentIdentity,
    });

    if (import.meta.env.DEV) {
      await agent.fetchRootKey();
    }

    return Actor.createActor(idlFactory, {
      agent,
      canisterId: Principal.fromText(ckbtcLedgerId),
    });
  };

  const testCkbtcBalance = async () => {
    if (!currentIdentity) {
      addTestResult('ckBTC Balance', null, 'Not connected. Please connect first.');
      return;
    }

    setLoading(true);
    try {
      const actor = await createCkbtcActor();
      const account = {
        owner: currentIdentity.getPrincipal(),
        subaccount: [],
      };
      const balance = await actor.icrc1_balance_of(account);
      const balanceFormatted = Number(balance) / 100_000_000;
      addTestResult('ckBTC Balance', `Balance: ${balance} (${balanceFormatted} ckBTC)`, null);
    } catch (error) {
      addTestResult('ckBTC Balance', null, formatError(error));
    } finally {
      setLoading(false);
    }
  };

  const testCkbtcMetadata = async () => {
    setLoading(true);
    try {
      const actor = await createCkbtcActor();
      const metadata = await actor.icrc1_metadata();
      const name = await actor.icrc1_name();
      const symbol = await actor.icrc1_symbol();
      const decimals = await actor.icrc1_decimals();
      const fee = await actor.icrc1_fee();
      
      const metadataObj = {
        name,
        symbol,
        decimals: Number(decimals),
        fee: Number(fee),
        feeFormatted: Number(fee) / 100_000_000,
        metadata: metadata.reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {}),
      };
      
      setCkbtcMetadata(metadataObj);
      addTestResult('ckBTC Metadata', JSON.stringify(metadataObj, null, 2), null);
    } catch (error) {
      addTestResult('ckBTC Metadata', null, formatError(error));
    } finally {
      setLoading(false);
    }
  };

  const testCkbtcTransfer = async () => {
    if (!currentIdentity) {
      addTestResult('ckBTC Transfer', null, 'Not connected. Please connect first.');
      return;
    }

    if (!testTransferTo) {
      addTestResult('ckBTC Transfer', null, 'Please enter recipient principal');
      return;
    }

    setLoading(true);
    try {
      const actor = await createCkbtcActor();
      const toPrincipal = Principal.fromText(testTransferTo);
      const transferArgs = {
        from_subaccount: [],
        to: {
          owner: toPrincipal,
          subaccount: [],
        },
        amount: BigInt(testAmount),
        fee: [],
        memo: [],
        created_at_time: [],
      };

      const result = await actor.icrc1_transfer(transferArgs);
      if ('Ok' in result) {
        addTestResult('ckBTC Transfer', `Success! Block index: ${result.Ok}`, null);
      } else {
        addTestResult('ckBTC Transfer', null, `Error: ${JSON.stringify(result.Err)}`);
      }
    } catch (error) {
      addTestResult('ckBTC Transfer', null, formatError(error));
    } finally {
      setLoading(false);
    }
  };

  const testCkbtcFee = async () => {
    setLoading(true);
    try {
      const actor = await createCkbtcActor();
      const fee = await actor.icrc1_fee();
      const feeFormatted = Number(fee) / 100_000_000;
      setCkbtcFee(Number(fee));
      addTestResult('ckBTC Fee', `Transfer fee: ${fee} (${feeFormatted} ckBTC)`, null);
    } catch (error) {
      addTestResult('ckBTC Fee', null, formatError(error));
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const exportResults = () => {
    const dataStr = JSON.stringify(testResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `test-results-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🧪 Test & Debug Page</h1>
        <p>Development testing interface for Dead Man Switch Canister</p>
        {principal && (
          <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#666' }}>
            Connected: <code>{principal}</code>
          </div>
        )}
      </header>

      <div className="dashboard">
        {/* Connection Section */}
        <div className="card">
          <h2>Connection</h2>
          <button 
            onClick={connectForTesting} 
            className="btn btn-primary" 
            disabled={loading || !!currentIdentity}
          >
            {currentIdentity ? '✓ Connected' : 'Connect for Testing'}
          </button>
          {currentIdentity && (
            <button 
              onClick={() => {
                setCurrentIdentity(null);
                setPrincipal(null);
                addTestResult('Disconnect', 'Disconnected', null);
              }} 
              className="btn" 
              style={{ marginTop: '8px' }}
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Quick Tests */}
        <div className="card">
          <h2>Quick Tests</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
            <button onClick={testGreet} className="btn" disabled={loading || !currentIdentity}>
              Test Greet
            </button>
            <button onClick={testGetAccountInfo} className="btn" disabled={loading || !currentIdentity}>
              Get Account Info
            </button>
            <button onClick={testHeartbeat} className="btn" disabled={loading || !currentIdentity}>
              Test Heartbeat
            </button>
            <button onClick={testGetBalance} className="btn" disabled={loading || !currentIdentity}>
              Get Balance
            </button>
            <button onClick={testListUsers} className="btn" disabled={loading || !currentIdentity}>
              List Users
            </button>
          </div>
        </div>

        {/* Register Test */}
        <div className="card">
          <h2>Register Test</h2>
          <div className="form-group">
            <label>Timeout Duration (seconds)</label>
            <input
              type="number"
              value={testTimeout}
              onChange={(e) => setTestTimeout(e.target.value)}
              min="60"
            />
          </div>
          <div className="form-group">
            <label>Beneficiary Principal</label>
            <input
              type="text"
              value={testBeneficiary}
              onChange={(e) => setTestBeneficiary(e.target.value)}
              placeholder="Enter beneficiary principal"
            />
            {principal && (
              <button
                type="button"
                onClick={() => setTestBeneficiary(principal)}
                className="btn-refresh-small"
                style={{ marginTop: '8px' }}
              >
                Use My Principal
              </button>
            )}
          </div>
          <button onClick={testRegister} className="btn btn-primary" disabled={loading || !currentIdentity}>
            Test Register
          </button>
        </div>

        {/* Deposit Test */}
        <div className="card">
          <h2>Deposit Test</h2>
          <div className="form-group">
            <label>Amount (smallest unit, 8 decimals)</label>
            <input
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(e.target.value)}
              placeholder="1000000 = 0.01 ckBTC"
            />
          </div>
          <button onClick={testDeposit} className="btn btn-primary" disabled={loading || !currentIdentity}>
            Test Deposit
          </button>
        </div>

        {/* Principal Validation */}
        <div className="card">
          <h2>Principal Validation</h2>
          <div className="form-group">
            <label>Principal to Validate</label>
            <input
              type="text"
              value={testPrincipal}
              onChange={(e) => setTestPrincipal(e.target.value)}
              placeholder="Enter principal ID"
            />
          </div>
          <button onClick={testPrincipalValidation} className="btn btn-primary" disabled={loading}>
            Validate Principal
          </button>
        </div>

        {/* ckBTC Ledger Direct Tests */}
        <div className="card">
          <h2>ckBTC Ledger Tests</h2>
          <div className="form-group">
            <label>ckBTC Ledger Canister ID</label>
            <input
              type="text"
              value={ckbtcLedgerId}
              onChange={(e) => setCkbtcLedgerId(e.target.value)}
              placeholder="mxzaz-hqaaa-aaaar-qaada-cai"
            />
            <small>Testnet: mxzaz-hqaaa-aaaar-qaada-cai | Mainnet: (check docs)</small>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '16px' }}>
            <button onClick={testCkbtcBalance} className="btn" disabled={loading || !currentIdentity}>
              Get Balance
            </button>
            <button onClick={testCkbtcMetadata} className="btn" disabled={loading}>
              Get Metadata
            </button>
            <button onClick={testCkbtcFee} className="btn" disabled={loading}>
              Get Fee
            </button>
          </div>

          {ckbtcMetadata && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#f0f9f4', border: '1px solid #10b981', borderRadius: '4px' }}>
              <strong>Metadata:</strong>
              <div style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                <div>Name: {ckbtcMetadata.name}</div>
                <div>Symbol: {ckbtcMetadata.symbol}</div>
                <div>Decimals: {ckbtcMetadata.decimals}</div>
                <div>Fee: {ckbtcMetadata.fee} ({ckbtcMetadata.feeFormatted} ckBTC)</div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Transfer To (Principal)</label>
            <input
              type="text"
              value={testTransferTo}
              onChange={(e) => setTestTransferTo(e.target.value)}
              placeholder="Enter recipient principal"
            />
            {principal && (
              <button
                type="button"
                onClick={() => setTestTransferTo(principal)}
                className="btn-refresh-small"
                style={{ marginTop: '8px' }}
              >
                Use My Principal
              </button>
            )}
          </div>
          <div className="form-group">
            <label>Transfer Amount (smallest unit, 8 decimals)</label>
            <input
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(e.target.value)}
              placeholder="1000000 = 0.01 ckBTC"
            />
            {ckbtcFee && (
              <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                Fee: {ckbtcFee} ({ckbtcFee / 100_000_000} ckBTC) | Total: {Number(testAmount || 0) + ckbtcFee} ({(Number(testAmount || 0) + ckbtcFee) / 100_000_000} ckBTC)
              </small>
            )}
          </div>
          <button onClick={testCkbtcTransfer} className="btn btn-primary" disabled={loading || !currentIdentity || !testTransferTo}>
            Test ckBTC Transfer
          </button>
        </div>

        {/* Canister Info */}
        <div className="card">
          <h2>Canister Information</h2>
          <div className="info-grid">
            <div>
              <label>Canister ID:</label>
              <code>{CANISTER_ID || 'Not set'}</code>
              {(!CANISTER_ID || CANISTER_ID === 'rrkah-fqaaa-aaaaa-aaaaq-cai') && (
                <small style={{ color: '#ef4444', marginTop: '4px', display: 'block' }}>
                  ⚠️ Canister ID not configured. Run: dfx deploy
                </small>
              )}
            </div>
            <div>
              <label>Network:</label>
              <span>{import.meta.env.DEV ? 'Local Development' : 'Mainnet'}</span>
            </div>
            <div>
              <label>Host:</label>
              <code>{import.meta.env.DEV ? 'http://localhost:4943' : 'https://ic0.app'}</code>
              {import.meta.env.DEV && (
                <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                  Make sure dfx is running: dfx start
                </small>
              )}
            </div>
          </div>
          {import.meta.env.DEV && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '4px' }}>
              <strong style={{ display: 'block', marginBottom: '8px', color: '#9a3412' }}>Local Development Setup:</strong>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#666' }}>
                <li>Start dfx: <code style={{ background: '#fafafa', padding: '2px 6px', borderRadius: '2px' }}>dfx start</code></li>
                <li>Deploy canister: <code style={{ background: '#fafafa', padding: '2px 6px', borderRadius: '2px' }}>dfx deploy</code></li>
                <li>Set VITE_CANISTER_ID in .env or restart frontend</li>
              </ol>
            </div>
          )}
        </div>

        {/* Test Results */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0 }}>Test Results</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={exportResults} className="btn-refresh-small" disabled={testResults.length === 0}>
                📥 Export
              </button>
              <button onClick={clearResults} className="btn-refresh-small" disabled={testResults.length === 0}>
                🗑️ Clear
              </button>
            </div>
          </div>
          
          {testResults.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
              No test results yet. Run some tests to see results here.
            </div>
          ) : (
            <div className="test-results">
              {testResults.map((result) => (
                <div 
                  key={result.id} 
                  className={`test-result ${result.success ? 'test-success' : 'test-error'}`}
                >
                  <div className="test-result-header">
                    <span className="test-result-icon">
                      {result.success ? '✓' : '✗'}
                    </span>
                    <span className="test-result-name">{result.test}</span>
                    <span className="test-result-time">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {result.result && (
                    <div className="test-result-content">
                      <pre>{result.result}</pre>
                    </div>
                  )}
                  {result.error && (
                    <div className="test-result-error">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TestPage;

