# Development Workflow

This document outlines the development workflow for the Dead Man Switch Canister project.

## Workflow Principles

1. **Use Git Extensively**: Branches, versions, resetting, commit messages, edit history, backup
2. **Programmatic Over Hardcode**: Prefer configuration and computed values over hardcoded constants
3. **Reflect Before Implementing**: Identify 5-7 potential problem sources, distill to 1-2 core issues, add logs to validate assumptions before implementing fixes
4. **Iterate and Tidy**: After each iteration, review and tidy new code
5. **No Duplicate Ports**: Ensure no port conflicts
6. **Production Assumptions**: Do not simulate or use mocks, assume production environment
7. **Modular and Interoperable**: Design for modularity and interoperability

## Development Process

### 1. Problem Analysis

Before implementing any feature or fix:

1. **Identify Problem Sources** (5-7 potential issues):
   - User input validation
   - State management
   - External canister calls
   - Timer/async operations
   - Error handling
   - Edge cases
   - Security considerations

2. **Distill Core Issues** (1-2 main problems):
   - Focus on root causes
   - Prioritize by impact and likelihood

3. **Add Logging**:
   - Add comprehensive logging to validate assumptions
   - Log before and after critical operations
   - Include context (user principal, timestamps, values)

4. **Implement Fix**:
   - Make targeted changes
   - Test thoroughly
   - Verify logs match expectations

### 2. Git Workflow

#### Branch Strategy

```bash
# Create feature branch
git checkout -b feature/feature-name

# Create bugfix branch
git checkout -b bugfix/issue-description

# Create hotfix branch
git checkout -b hotfix/critical-fix
```

#### Commit Messages

Follow conventional commits:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

Examples:
```
feat(heartbeat): add heartbeat mechanism with timeout tracking

fix(transfer): handle ICRC-1 transfer errors correctly

docs(api): update API documentation with examples
```

#### Version Management

```bash
# Tag releases
git tag -a v0.1.0 -m "Initial release"
git push origin v0.1.0

# View version history
git log --oneline --decorate
```

### 3. Code Development

#### Before Writing Code

1. Check existing codebase for similar patterns
2. Review ICP/CDK documentation for best practices
3. Consider edge cases and error scenarios
4. Plan logging strategy

#### During Development

1. Write modular, reusable functions
2. Add comprehensive logging
3. Handle errors explicitly
4. Use type-safe interfaces (Candid)
5. Follow Rust best practices

#### After Implementation

1. Review code for tidiness
2. Remove debug code and comments
3. Ensure consistent formatting
4. Verify all error paths are handled
5. Check for potential security issues

### 4. Testing Workflow

#### Local Testing

```bash
# Start local replica
dfx start --background

# Deploy canister
dfx deploy

# Test functions
dfx canister call deadman_switch greet '("Test")'

# Check logs
dfx canister logs deadman_switch
```

#### Testnet Testing

```bash
# Switch to testnet
dfx network use testnet

# Deploy
dfx deploy --network testnet

# Test with real testnet ckBTC
```

#### Validation Checklist

- [ ] User registration works
- [ ] Heartbeat resets timeout
- [ ] Timeout detection triggers correctly
- [ ] Transfer executes on timeout
- [ ] Error handling works
- [ ] Logs provide sufficient information
- [ ] No memory leaks or state issues

### 5. Iteration Process

#### After Each Feature/Fix

1. **Review Code**:
   - Check for code smells
   - Ensure consistency
   - Verify error handling

2. **Tidy Code**:
   - Remove unused imports
   - Format code consistently
   - Update documentation
   - Remove debug logs (keep important ones)

3. **Validate Assumptions**:
   - Review logs
   - Verify behavior matches expectations
   - Check edge cases

4. **Commit Changes**:
   - Write clear commit message
   - Include relevant context
   - Reference issues if applicable

### 6. Logging Strategy

#### Log Levels

- **Info**: Normal operations (registration, heartbeat, transfers)
- **Warning**: Recoverable errors or unusual conditions
- **Error**: Failures that need attention

#### Log Format

```rust
ic_cdk::println!("[INFO] Operation: user={}, details={}", user, details);
ic_cdk::println!("[WARN] Condition: {}", condition);
ic_cdk::println!("[ERROR] Failure: error={:?}", error);
```

#### What to Log

- User registration and updates
- Heartbeat events with timestamps
- Timeout detection and processing
- Transfer attempts and results
- Error conditions with context
- State changes

### 7. Configuration Management

#### Avoid Hardcoding

Instead of:
```rust
const TIMEOUT: u64 = 3600;
```

Use:
```rust
// Configurable per user during registration
```

#### Environment-Specific Values

- ckBTC ledger canister ID: Set via constant (can be updated)
- Timer interval: Configurable
- Network: Set via dfx.json

### 8. Security Considerations

1. **Input Validation**: Validate all user inputs
2. **Principal Verification**: Verify caller principal
3. **State Protection**: Use RefCell for safe state access
4. **Error Handling**: Don't expose sensitive information
5. **Access Control**: Implement proper authorization

### 9. Documentation Updates

After each significant change:

1. Update README.md if API changes
2. Update workflow.md if process changes
3. Add code comments for complex logic
4. Update Candid interface if needed

### 10. Deployment Checklist

Before deploying to testnet/mainnet:

- [ ] Code reviewed and tested
- [ ] Logging verified
- [ ] Error handling tested
- [ ] Documentation updated
- [ ] Git commits clean and organized
- [ ] Version tagged
- [ ] Configuration verified (canister IDs, etc.)

## Common Tasks

### Adding a New Feature

1. Create feature branch
2. Implement with logging
3. Test locally
4. Review and tidy code
5. Commit with clear message
6. Test on testnet
7. Merge to main

### Fixing a Bug

1. Identify problem sources (5-7)
2. Distill to core issues (1-2)
3. Add logs to validate assumptions
4. Implement fix
5. Test thoroughly
6. Review logs
7. Tidy code
8. Commit fix

### Refactoring

1. Ensure tests pass before refactoring
2. Make incremental changes
3. Verify behavior unchanged
4. Update documentation
5. Commit refactoring

## Tools and Commands

### Git Commands

```bash
# View history
git log --oneline --graph --all

# Reset to previous commit (if needed)
git reset --soft HEAD~1

# Create backup branch
git branch backup/feature-name

# View diff
git diff
```

### DFX Commands

```bash
# Build
dfx build

# Deploy
dfx deploy

# Call canister
dfx canister call <canister> <method> '<args>'

# View logs
dfx canister logs <canister>

# Stop replica
dfx stop
```

### Rust Commands

```bash
# Check code
cargo check

# Format code
cargo fmt

# Lint code
cargo clippy

# Build for wasm
cargo build --target wasm32-unknown-unknown --release
```

## Notes

- Always assume production environment (no mocks)
- Keep code modular and interoperable
- Use git extensively for version control
- Reflect before implementing fixes
- Tidy code after each iteration

