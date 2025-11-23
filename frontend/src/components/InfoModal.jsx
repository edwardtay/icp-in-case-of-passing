import React from 'react';

/**
 * InfoModal Component - Displays concise information about the app
 * @param {boolean} show - Whether to show the modal
 * @param {function} onClose - Function to call when closing the modal
 */
export default function InfoModal({ show, onClose }) {
  if (!show) return null;

  return (
    <div 
      className="info-modal-overlay"
      onClick={onClose}
    >
      <div 
        className="info-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="info-modal-header">
          <h3>What is ICP: In Case of Passing?</h3>
          <button
            onClick={onClose}
            className="info-modal-close"
            title="Close"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="info-modal-content">
          <p style={{ marginBottom: '10px', fontSize: '0.9rem' }}>
            Automatically transfers ckBTC to a beneficiary if you stop sending heartbeats within your timeout period.
          </p>
          
          <p style={{ marginTop: '10px', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '500' }}>
            Steps:
          </p>
          <ul style={{ margin: '0 0 10px 16px', padding: 0, lineHeight: '1.4', fontSize: '0.85rem' }}>
            <li>Register → Set timeout & beneficiary</li>
            <li>Deposit → Send ckBTC to canister</li>
            <li>Heartbeat → Send check-ins (Ctrl+H) before timeout</li>
            <li>Auto-transfer → Funds transfer if missed</li>
          </ul>

          <p style={{ marginTop: '10px', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '500' }}>
            Quick facts:
          </p>
          <ul style={{ margin: '0 0 10px 16px', padding: 0, lineHeight: '1.4', fontSize: '0.8rem' }}>
            <li>Heartbeats reset timer (Ctrl+H)</li>
            <li>Withdraw anytime before timeout</li>
            <li>Secure & decentralized on ICP</li>
          </ul>

          <p style={{ marginTop: '12px', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '500' }}>
            Use Cases:
          </p>
          <ul style={{ margin: '0 0 10px 16px', padding: 0, lineHeight: '1.4', fontSize: '0.8rem' }}>
            <li>💼 <strong>Estate Planning:</strong> Ensure loved ones receive your Bitcoin if something happens</li>
            <li>🏥 <strong>Medical Emergency:</strong> Auto-transfer funds if you're incapacitated</li>
            <li>✈️ <strong>Travel Safety:</strong> Protect funds while traveling or in risky situations</li>
            <li>🔐 <strong>Digital Inheritance:</strong> Pass on crypto assets without sharing private keys</li>
            <li>⏰ <strong>Time-Locked Transfers:</strong> Set up conditional transfers based on activity</li>
          </ul>

          <p style={{ marginTop: '12px', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '500' }}>
            Why People Should Care:
          </p>
          <ul style={{ margin: '0 0 10px 16px', padding: 0, lineHeight: '1.4', fontSize: '0.8rem' }}>
            <li>🛡️ <strong>No Single Point of Failure:</strong> Decentralized on ICP blockchain, no bank or custodian</li>
            <li>⚡ <strong>Fast & Low Cost:</strong> ckBTC transfers are instant and cost pennies vs. Bitcoin's slow, expensive network</li>
            <li>🔒 <strong>Self-Custody:</strong> You control your funds, not a third party</li>
            <li>🌍 <strong>Global Access:</strong> Works anywhere with internet, no borders or restrictions</li>
            <li>💎 <strong>Bitcoin Value:</strong> 1:1 backed by real Bitcoin, maintaining its value</li>
            <li>🤖 <strong>Automated:</strong> No need to manually execute wills or trust documents</li>
          </ul>

          <div style={{ background: '#fff7ed', padding: '8px', borderRadius: '4px', border: '1px solid #fed7aa', marginTop: '10px' }}>
            <strong style={{ color: '#9a3412', fontSize: '0.8rem' }}>⚠️ Set reminders • Verify beneficiary • Test regularly</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

