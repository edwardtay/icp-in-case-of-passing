// Polyfills for browser environment
// Fixes "global is not defined" error with @dfinity/agent

if (typeof global === 'undefined') {
  window.global = window;
}

if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}

