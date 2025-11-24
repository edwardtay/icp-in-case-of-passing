import React, { useState, useEffect } from 'react';

/**
 * HeartbeatButton Component - Sends heartbeat and shows countdown
 */
export default function HeartbeatButton({ 
  onHeartbeat, 
  accountInfo, 
  loading,
  showMessage 
}) {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [nextHeartbeatDue, setNextHeartbeatDue] = useState(null);

  useEffect(() => {
    if (!accountInfo || !accountInfo.last_heartbeat) return;

    const timeoutSeconds = Number(accountInfo.timeout_duration_seconds);
    const lastHeartbeat = Number(accountInfo.last_heartbeat) / 1_000_000; // Convert nanoseconds to milliseconds
    const nextDue = lastHeartbeat + (timeoutSeconds * 1000);
    setNextHeartbeatDue(nextDue);

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, nextDue - now);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [accountInfo]);

  const formatTimeRemaining = (ms) => {
    if (!ms || ms <= 0) return 'Expired';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getStatusColor = () => {
    if (!timeRemaining) return '#666';
    const seconds = Math.floor(timeRemaining / 1000);
    const timeoutSeconds = accountInfo ? Number(accountInfo.timeout_duration_seconds) : 3600;
    const percentage = (seconds / timeoutSeconds) * 100;
    
    if (percentage > 50) return '#10b981'; // Green
    if (percentage > 25) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const handleClick = async () => {
    try {
      await onHeartbeat();
      showMessage('Heartbeat sent successfully!', 'success');
    } catch (error) {
      showMessage(`Heartbeat failed: ${error.message}`, 'error');
    }
  };

  if (!accountInfo) {
    return (
      <div className="card">
        <h2>💓 Heartbeat</h2>
        <p style={{ color: '#666' }}>Please register first to send heartbeats.</p>
      </div>
    );
  }

  const isExpired = timeRemaining !== null && timeRemaining <= 0;
  const timeoutSeconds = Number(accountInfo.timeout_duration_seconds);

  return (
    <div className="card heartbeat-card">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>💓</span>
        <span>Heartbeat</span>
      </h2>

      <div className="heartbeat-status">
        <div className="status-row">
          <span className="status-label">Status:</span>
          <span 
            className="status-value" 
            style={{ 
              color: getStatusColor(),
              fontWeight: '600'
            }}
          >
            {isExpired ? '⚠️ EXPIRED' : '✅ Active'}
          </span>
        </div>

        {timeRemaining !== null && (
          <>
            <div className="status-row">
              <span className="status-label">Time Remaining:</span>
              <span 
                className="status-value" 
                style={{ 
                  color: getStatusColor(),
                  fontFamily: 'monospace',
                  fontSize: '1.1rem'
                }}
              >
                {formatTimeRemaining(timeRemaining)}
              </span>
            </div>

            {nextHeartbeatDue && (
              <div className="status-row">
                <span className="status-label">Next Due:</span>
                <span className="status-value">
                  {new Date(nextHeartbeatDue).toLocaleString()}
                </span>
              </div>
            )}
          </>
        )}

        <div className="status-row">
          <span className="status-label">Timeout Duration:</span>
          <span className="status-value">
            {timeoutSeconds < 60 
              ? `${timeoutSeconds} seconds`
              : timeoutSeconds < 3600
              ? `${timeoutSeconds / 60} minutes`
              : `${timeoutSeconds / 3600} hours`
            }
          </span>
        </div>
      </div>

      <div className="heartbeat-actions">
        <button
          onClick={handleClick}
          className="btn btn-primary heartbeat-btn"
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '1.1rem',
            fontWeight: '600',
            background: isExpired ? '#ef4444' : '#10b981',
            marginTop: '20px'
          }}
        >
          {loading ? (
            '⏳ Sending...'
          ) : isExpired ? (
            '⚠️ Send Heartbeat Now!'
          ) : (
            '💓 Send Heartbeat'
          )}
        </button>

        <div className="heartbeat-shortcut" style={{ marginTop: '12px', fontSize: '0.85rem', color: '#666', textAlign: 'center' }}>
          💡 Tip: Press <kbd style={{ padding: '2px 6px', background: '#f3f4f6', borderRadius: '4px' }}>Ctrl+H</kbd> to send heartbeat quickly
        </div>
      </div>

      {isExpired && (
        <div className="warning-box" style={{ marginTop: '16px', padding: '12px', background: '#fee2e2', borderRadius: '8px', border: '1px solid #ef4444' }}>
          <strong style={{ color: '#991b1b' }}>⚠️ Warning:</strong>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: '#7f1d1d' }}>
            Your heartbeat has expired! Send a heartbeat immediately to prevent automatic fund transfer.
          </p>
        </div>
      )}
    </div>
  );
}

