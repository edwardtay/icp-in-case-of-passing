# ICP Development Utilities

This document describes the middleware tooling and utilities added to support ICP app development.

## Overview

The `icp-utils.js` module provides comprehensive utilities for working with ICP principals, explorers, network detection, and error handling.

## Features

### 1. Principal Validation

#### `validatePrincipal(principalText)`
Basic principal validation that checks:
- Format validity
- Non-empty input
- Non-anonymous principals

#### `validatePrincipalEnhanced(principalText, options)`
Enhanced validation with additional features:
- Activity checking (optional)
- Explorer URL generation
- Formatted display strings
- Warning messages

**Usage:**
```javascript
const validation = await validatePrincipalEnhanced('2gvlb-ekff7-b4m4a-g64bc-owccg-syhdp-375ir-5ry2x-hzryb-qbj5a-qae', {
  checkActivity: true,
  allowAnonymous: false
});

if (validation.valid) {
  console.log('Principal:', validation.principalText);
  console.log('Explorers:', validation.explorerUrls);
}
```

### 2. Explorer Integration

#### `getExplorerUrls(principalText)`
Returns an array of explorer URLs for a principal:
- ICP Dashboard (Official)
- IC.rocks
- ICScan
- IC Dashboard

**Usage:**
```javascript
const explorers = getExplorerUrls(principal);
explorers.forEach(explorer => {
  console.log(`${explorer.icon} ${explorer.name}: ${explorer.url}`);
});
```

### 3. Network Detection

#### `detectNetwork()`
Automatically detects the current ICP network:
- `local` - Local development (DFX)
- `testnet` - ICP Testnet
- `mainnet` - ICP Mainnet

#### `getNetworkConfig()`
Returns network-specific configuration including:
- Network name
- Host URL
- Identity provider URL
- Explorer URL
- Icon

**Usage:**
```javascript
const network = detectNetwork(); // 'mainnet'
const config = getNetworkConfig();
console.log(`Connected to ${config.icon} ${config.name}`);
```

### 4. Principal Utilities

#### `formatPrincipal(principalText, maxLength)`
Formats principal for display with truncation if needed.

#### `isCanisterPrincipal(principalText)`
Checks if a principal is a canister principal.

#### `getPrincipalType(principalText)`
Returns principal type: `'user' | 'canister' | 'anonymous' | 'unknown'`

### 5. Error Handling

#### `formatError(error)`
Formats error messages for better user experience:
- Converts technical errors to user-friendly messages
- Handles common ICP error patterns
- Provides actionable feedback

**Usage:**
```javascript
try {
  await someICPCall();
} catch (error) {
  const userMessage = formatError(error);
  showMessage(userMessage, 'error');
}
```

### 6. Logging

#### `logICPEvent(event, data)`
Logs ICP-related events for debugging (only in development mode).

**Usage:**
```javascript
logICPEvent('principal_validated', { 
  principal: principalText,
  network: detectNetwork()
});
```

## Why Principals May Not Appear in Explorers

If a principal like `2gvlb-ekff7-b4m4a-g64bc-owccg-syhdp-375ir-5ry2x-hzryb-qbj5a-qae` doesn't appear in explorers, it's likely because:

1. **No On-Chain Activity**: Principals only appear in explorers after they've had at least one transaction or interaction on-chain.

2. **New Principal**: Freshly created principals (especially from Internet Identity) may not be indexed yet.

3. **Explorer Indexing Delay**: Some explorers may have delays in indexing new principals.

4. **Network Mismatch**: Make sure you're checking the correct network (mainnet vs testnet).

## Solutions

1. **Make a Transaction**: Send some ICP or interact with a canister to create on-chain activity.

2. **Try Multiple Explorers**: Different explorers may have different indexing:
   - ICP Dashboard: https://dashboard.internetcomputer.org
   - IC.rocks: https://ic.rocks
   - ICScan: https://icscan.io

3. **Wait for Indexing**: New principals may take a few minutes to appear.

4. **Check Network**: Ensure you're on the correct network (mainnet/testnet).

## Integration Examples

### In React Components

```javascript
import { validatePrincipalEnhanced, getExplorerUrls, formatError } from './icp-utils';

// Validate beneficiary
const validation = await validatePrincipalEnhanced(beneficiaryText);
if (!validation.valid) {
  setError(validation.error);
  return;
}

// Get explorer links
const explorers = getExplorerUrls(principal);
```

### Error Handling

```javascript
import { formatError } from './icp-utils';

try {
  await canisterCall();
} catch (error) {
  const message = formatError(error);
  // Show user-friendly error
}
```

## Benefits

1. **Better UX**: User-friendly error messages and validation
2. **Multiple Explorers**: Easy access to multiple explorer options
3. **Network Awareness**: Automatic network detection and configuration
4. **Development Tools**: Enhanced logging and debugging
5. **Type Safety**: Principal type detection and validation
6. **Error Recovery**: Graceful error handling with fallbacks

## Future Enhancements

Potential additions:
- Principal activity history API integration
- Canister interaction helpers
- Transaction monitoring
- Balance checking utilities
- Multi-network support helpers

