import React from 'react';
import { Principal } from '@dfinity/principal';

/**
 * AccountDashboard Component - Displays comprehensive account information
 */
export default function AccountDashboard({ 
  accountInfo, 
  ledgerBalance,
  onUpdateSettings,
  onWithdraw,
  showMessage,
  onSetMockBalance
}) {
  if (!accountInfo) {
    return (
      <div className="card">
        <h2>📊 Account Dashboard</h2>
        <p style={{ color: '#666' }}>Please register first to view your account dashboard.</p>
      </div>
    );
  }

  const formatBalance = (balance) => {
    if (!balance) return '0.00000000';
    const balanceNum = Number(balance);
    return (balanceNum / 100_000_000).toFixed(8); // ckBTC has 8 decimals
  };

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${seconds / 60} minutes`;
    if (seconds < 86400) return `${seconds / 3600} hours`;
    if (seconds < 604800) return `${seconds / 86400} days`;
    return `${seconds / 604800} weeks`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleString();
  };

  const timeoutSeconds = Number(accountInfo.timeout_duration_seconds);
  const lastHeartbeat = accountInfo.last_heartbeat 
    ? Number(accountInfo.last_heartbeat) / 1_000_000 
    : null;
  const nextDue = lastHeartbeat 
    ? new Date(lastHeartbeat + (timeoutSeconds * 1000))
    : null;

  return (
    <div className="card dashboard-card">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <span>📊</span>
        <span>Account Dashboard</span>
      </h2>

      <div className="dashboard-grid">
        {/* Balance Section */}
        <div className="dashboard-section">
          <h3 className="section-title">💰 Balance</h3>
          <div className="balance-display">
            <div className="balance-main">
              <span className="balance-value">{formatBalance(accountInfo.balance)}</span>
              <span className="balance-unit">ckBTC</span>
            </div>
            {ledgerBalance !== null && (
              <div className="balance-secondary">
                Ledger Balance: {formatBalance(ledgerBalance)} ckBTC
              </div>
            )}
          </div>
        </div>

        {/* Timeout Settings */}
        <div className="dashboard-section">
          <h3 className="section-title">⏱️ Timeout Settings</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Duration:</span>
              <span className="info-value">{formatDuration(timeoutSeconds)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Last Heartbeat:</span>
              <span className="info-value">{formatDate(accountInfo.last_heartbeat)}</span>
            </div>
            {nextDue && (
              <div className="info-item">
                <span className="info-label">Next Due:</span>
                <span className="info-value">{nextDue.toLocaleString()}</span>
              </div>
            )}
            <div className="info-item">
              <span className="info-label">Grace Period:</span>
              <span className="info-value">
                {formatDuration(Number(accountInfo.contestation_period_seconds))}
              </span>
            </div>
          </div>
        </div>

        {/* Beneficiary Info */}
        <div className="dashboard-section">
          <h3 className="section-title">👤 Beneficiary</h3>
          <div className="beneficiary-info">
            <div className="info-item">
              <span className="info-label">Principal:</span>
              <span className="info-value code" style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>
                {accountInfo.beneficiary.toText()}
              </span>
            </div>
            {accountInfo.beneficiaries && accountInfo.beneficiaries.length > 0 && (
              <div className="info-item">
                <span className="info-label">Multiple Beneficiaries:</span>
                <span className="info-value">{accountInfo.beneficiaries.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Trusted Parties */}
        {accountInfo.trusted_parties && accountInfo.trusted_parties.length > 0 && (
          <div className="dashboard-section">
            <h3 className="section-title">🔐 Trusted Parties</h3>
            <div className="trusted-parties-list">
              {accountInfo.trusted_parties.map((party, index) => (
                <div key={index} className="trusted-party-item">
                  <span className="code" style={{ fontSize: '0.85rem' }}>
                    {party.toText()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeout Status */}
        {accountInfo.timeout_detected_at && (
          <div className="dashboard-section warning-section">
            <h3 className="section-title">⚠️ Timeout Detected</h3>
            <div className="info-item">
              <span className="info-label">Detected At:</span>
              <span className="info-value">{formatDate(accountInfo.timeout_detected_at)}</span>
            </div>
            <div className="warning-box" style={{ marginTop: '12px', padding: '12px', background: '#fee2e2', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#991b1b' }}>
                A timeout has been detected. Funds will transfer after the grace period expires.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="dashboard-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onUpdateSettings && onUpdateSettings()}
          className="btn"
          style={{ flex: 1, minWidth: '150px' }}
        >
          ⚙️ Update Settings
        </button>
        {Number(accountInfo.balance) > 0 && (
          <button
            onClick={() => onWithdraw && onWithdraw()}
            className="btn"
            style={{ flex: 1, minWidth: '150px' }}
          >
            💸 Withdraw Funds
          </button>
        )}
        {import.meta.env.DEV && onSetMockBalance && Number(accountInfo.balance) === 0 && (
          <button
            onClick={() => onSetMockBalance()}
            className="btn"
            style={{ 
              flex: 1, 
              minWidth: '150px',
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              color: '#92400e'
            }}
            title="Add mock balance for demo (dev only)"
          >
            💰 Add Mock Balance (Demo)
          </button>
        )}
      </div>
    </div>
  );
}

