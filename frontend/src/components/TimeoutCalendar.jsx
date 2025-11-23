import React, { useState } from 'react';

/**
 * TimeoutCalendar Component - Calendar UI for selecting timeout duration
 * @param {number} timeoutDuration - Current timeout duration in seconds
 * @param {function} onChange - Callback when timeout duration changes
 */
export default function TimeoutCalendar({ timeoutDuration, onChange }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState(() => {
    // Calculate default date/time from current timeout duration
    const now = new Date();
    const futureDate = new Date(now.getTime() + timeoutDuration * 1000);
    return futureDate.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
  });

  // Quick preset buttons
  const presets = [
    { label: '1 Hour', seconds: 3600 },
    { label: '1 Day', seconds: 86400 },
    { label: '1 Week', seconds: 604800 },
    { label: '1 Month', seconds: 2592000 },
  ];

  const handlePresetClick = (seconds) => {
    onChange(seconds);
    // Update calendar to reflect the preset
    const now = new Date();
    const futureDate = new Date(now.getTime() + seconds * 1000);
    setSelectedDateTime(futureDate.toISOString().slice(0, 16));
  };

  const handleDateTimeChange = (e) => {
    const selectedDate = new Date(e.target.value);
    const now = new Date();
    const diffSeconds = Math.floor((selectedDate.getTime() - now.getTime()) / 1000);
    
    if (diffSeconds >= 60) {
      setSelectedDateTime(e.target.value);
      onChange(diffSeconds);
    } else {
      // Minimum 60 seconds
      const minDate = new Date(now.getTime() + 60 * 1000);
      setSelectedDateTime(minDate.toISOString().slice(0, 16));
      onChange(60);
    }
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

  const getMinDateTime = () => {
    const now = new Date();
    const minDate = new Date(now.getTime() + 60 * 1000); // Minimum 60 seconds from now
    return minDate.toISOString().slice(0, 16);
  };

  const getSelectedDateDisplay = () => {
    if (!selectedDateTime) return 'Select date & time';
    const date = new Date(selectedDateTime);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Quick Presets */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handlePresetClick(preset.seconds)}
            className="btn-refresh-small"
            style={{
              padding: '6px 12px',
              background: timeoutDuration === preset.seconds ? '#f3f4f6' : 'white',
              border: timeoutDuration === preset.seconds ? '2px solid #1a1a1a' : '1px solid #ddd',
              fontWeight: timeoutDuration === preset.seconds ? '500' : '400'
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Calendar/DateTime Picker */}
      <div style={{ marginBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setShowCalendar(!showCalendar)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            background: 'white',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>📅 {getSelectedDateDisplay()}</span>
          <span>{showCalendar ? '▲' : '▼'}</span>
        </button>
        
        {showCalendar && (
          <div style={{
            marginTop: '8px',
            padding: '16px',
            border: '1px solid #e5e5e5',
            borderRadius: '6px',
            background: '#fafafa'
          }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '500' }}>
              Select Date & Time:
            </label>
            <input
              type="datetime-local"
              value={selectedDateTime}
              onChange={handleDateTimeChange}
              min={getMinDateTime()}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9rem',
                fontFamily: 'monospace'
              }}
            />
            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#666' }}>
              Timeout will occur on: <strong>{getSelectedDateDisplay()}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Duration Display */}
      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
        Duration: <strong>{formatDuration(timeoutDuration)}</strong>
      </div>
    </div>
  );
}

