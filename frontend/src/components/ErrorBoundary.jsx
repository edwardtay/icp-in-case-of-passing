import React from 'react';

/**
 * Error Boundary Component - Catches React errors and displays fallback UI
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '2px solid #ef4444',
          borderRadius: '8px',
          background: '#fef2f2'
        }}>
          <h3 style={{ color: '#dc2626', marginTop: 0 }}>⚠️ Something went wrong</h3>
          <p style={{ color: '#991b1b' }}>
            An error occurred in this section. Please refresh the page or try again.
          </p>
          {this.props.fallback || (
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Refresh Page
            </button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}




