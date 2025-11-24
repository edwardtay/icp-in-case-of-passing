import React, { useState } from 'react';
import { validatePrincipalEnhanced } from '../icp-utils';

/**
 * RegistrationForm Component - Handles user registration with timeout and beneficiary
 */
export default function RegistrationForm({ 
  onRegister, 
  loading, 
  accountInfo,
  showMessage
}) {
  const [formData, setFormData] = useState({
    timeoutDuration: 3600, // Default 1 hour
    beneficiary: ''
  });
  const [beneficiaryError, setBeneficiaryError] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);


  const timeoutOptions = [
    { value: 60, label: '1 minute (testing)' },
    { value: 300, label: '5 minutes' },
    { value: 600, label: '10 minutes' },
    { value: 1800, label: '30 minutes' },
    { value: 3600, label: '1 hour' },
    { value: 7200, label: '2 hours' },
    { value: 86400, label: '1 day' },
    { value: 604800, label: '1 week' },
    { value: 2592000, label: '1 month' }
  ];

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${seconds / 60} minutes`;
    if (seconds < 86400) return `${seconds / 3600} hours`;
    if (seconds < 604800) return `${seconds / 86400} days`;
    return `${seconds / 604800} weeks`;
  };

  const handleBeneficiaryChange = async (value) => {
    setFormData({ ...formData, beneficiary: value });
    setBeneficiaryError('');
    
    // Validate as user types (debounced)
    if (value.trim().length > 0) {
      const validation = await validatePrincipalEnhanced(value, { checkActivity: false });
      if (!validation.valid) {
        setBeneficiaryError(validation.error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.beneficiary.trim()) {
      setBeneficiaryError('Beneficiary principal is required');
      showMessage('Please enter a beneficiary principal', 'error');
      return;
    }

    // Validate beneficiary
    const validation = await validatePrincipalEnhanced(formData.beneficiary, { checkActivity: false });
    if (!validation.valid) {
      setBeneficiaryError(validation.error);
      showMessage(`Invalid beneficiary: ${validation.error}`, 'error');
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const confirmRegister = () => {
    setShowConfirmDialog(false);
    onRegister(formData);
  };

  // If already registered, don't show registration form
  // The parent App component will show the dashboard instead
  if (accountInfo) {
    return null;
  }

  return (
    <>
      <div className="card">
        <h2>📝 Register Account</h2>
        <p style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#666' }}>
          Set up your dead man switch by configuring a timeout duration and beneficiary address.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="timeoutDuration">
              Timeout Duration <span className="required">*</span>
            </label>
            <select
              id="timeoutDuration"
              value={formData.timeoutDuration}
              onChange={(e) => setFormData({ ...formData, timeoutDuration: parseInt(e.target.value) })}
              className="form-control"
              required
            >
              {timeoutOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small className="form-help">
              You must send a heartbeat before this duration expires, or funds will transfer to beneficiary.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="beneficiary">
              Beneficiary Principal <span className="required">*</span>
            </label>
            <input
              id="beneficiary"
              type="text"
              value={formData.beneficiary}
              onChange={(e) => handleBeneficiaryChange(e.target.value)}
              placeholder="Enter beneficiary principal ID"
              className={`form-control ${beneficiaryError ? 'error' : ''}`}
              required
            />
            {beneficiaryError && (
              <div className="error-message">{beneficiaryError}</div>
            )}
            <small className="form-help">
              The principal that will receive your funds if you miss a heartbeat deadline.
              <span style={{ display: 'block', marginTop: '4px', color: '#dc2626', fontSize: '0.85rem', fontWeight: '500' }}>
                ⚠️ Important: Use a different account as beneficiary (not your own). This should be a trusted family member or executor.
              </span>
            </small>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || !!beneficiaryError}
          >
            {loading ? 'Registering...' : 'Register Account'}
          </button>
        </form>
      </div>

      {showConfirmDialog && (
        <div className="modal-overlay" onClick={() => setShowConfirmDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Confirm Registration</h3>
            <p>You are about to register with the following settings:</p>
            <div className="confirm-details">
              <div className="confirm-row">
                <strong>Timeout Duration:</strong> {formatDuration(formData.timeoutDuration)}
              </div>
              <div className="confirm-row">
                <strong>Beneficiary:</strong>
                <code style={{ fontSize: '0.85rem', wordBreak: 'break-all', display: 'block', marginTop: '4px' }}>
                  {formData.beneficiary.trim()}
                </code>
              </div>
            </div>
            <div className="warning-box" style={{ marginTop: '16px', padding: '12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24' }}>
              <strong style={{ color: '#92400e' }}>⚠️ Important:</strong>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: '#78350f' }}>
                If you don't send a heartbeat within {formatDuration(formData.timeoutDuration)}, 
                your funds will automatically transfer to the beneficiary. Make sure you can send heartbeats regularly.
              </p>
            </div>
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button 
                onClick={() => setShowConfirmDialog(false)} 
                className="btn"
                style={{ background: 'white', color: '#1a1a1a', marginRight: '10px' }}
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
    </>
  );
}

