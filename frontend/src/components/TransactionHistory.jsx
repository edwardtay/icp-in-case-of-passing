import React, { useState, useEffect } from 'react';

/**
 * TransactionHistory Component - Displays transaction history
 */
export default function TransactionHistory({ 
  accountInfo,
  onLoadHistory 
}) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (accountInfo && accountInfo.transaction_history) {
      setHistory([...accountInfo.transaction_history].reverse()); // Most recent first
    } else {
      loadHistory();
    }
  }, [accountInfo]);

  const loadHistory = async () => {
    if (!onLoadHistory) return;
    
    setLoading(true);
    try {
      const result = await onLoadHistory();
      if (result && result.ok) {
        setHistory([...result.ok].reverse()); // Most recent first
      }
    } catch (error) {
      console.error('Failed to load transaction history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleString();
  };

  const formatAmount = (amount) => {
    if (!amount) return '-';
    const amountNum = Number(amount);
    return (amountNum / 100_000_000).toFixed(8); // ckBTC has 8 decimals
  };

  const getTransactionIcon = (type) => {
    const icons = {
      'register': '📝',
      'heartbeat': '💓',
      'deposit': '💰',
      'withdrawal': '💸',
      'transfer': '🔄',
      'timeout_cancelled': '❌',
      'update': '⚙️',
      'balance_sync': '🔄'
    };
    return icons[type] || '📋';
  };

  const getTransactionColor = (type) => {
    const colors = {
      'register': '#3b82f6',
      'heartbeat': '#10b981',
      'deposit': '#10b981',
      'withdrawal': '#ef4444',
      'transfer': '#8b5cf6',
      'timeout_cancelled': '#f59e0b',
      'update': '#6366f1',
      'balance_sync': '#6b7280'
    };
    return colors[type] || '#6b7280';
  };

  if (!accountInfo) {
    return (
      <div className="card">
        <h2>📜 Transaction History</h2>
        <p style={{ color: '#666' }}>Please register first to view transaction history.</p>
      </div>
    );
  }

  return (
    <div className="card transaction-history-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <span>📜</span>
          <span>Transaction History</span>
        </h2>
        <button
          onClick={loadHistory}
          className="btn-refresh-small"
          disabled={loading}
          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
        >
          {loading ? '⏳' : '↻'}
        </button>
      </div>

      {loading && history.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
          <div>Loading transaction history...</div>
        </div>
      ) : history.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📋</div>
          <div>No transactions yet</div>
          <div style={{ fontSize: '0.85rem', marginTop: '8px' }}>
            Your transaction history will appear here
          </div>
        </div>
      ) : (
        <div className="transaction-list">
          {history.map((tx, index) => (
            <div 
              key={index} 
              className="transaction-item"
              style={{
                borderLeft: `4px solid ${getTransactionColor(tx.transaction_type)}`
              }}
            >
              <div className="transaction-header">
                <div className="transaction-type">
                  <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>
                    {getTransactionIcon(tx.transaction_type)}
                  </span>
                  <span style={{ 
                    textTransform: 'capitalize',
                    fontWeight: '600',
                    color: getTransactionColor(tx.transaction_type)
                  }}>
                    {tx.transaction_type.replace(/_/g, ' ')}
                  </span>
                </div>
                {tx.amount && (
                  <div className="transaction-amount" style={{ fontWeight: '600' }}>
                    {formatAmount(tx.amount)} ckBTC
                  </div>
                )}
              </div>
              
              <div className="transaction-details">
                <div className="transaction-date">
                  {formatDate(tx.timestamp)}
                </div>
                {tx.details && (
                  <div className="transaction-description">
                    {tx.details}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#f3f4f6', borderRadius: '8px', fontSize: '0.85rem', color: '#666', textAlign: 'center' }}>
          Showing {history.length} transaction{history.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

