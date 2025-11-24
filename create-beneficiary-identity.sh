#!/bin/bash
# Create a second dfx identity for demo beneficiary account
# Usage: ./create-beneficiary-identity.sh

set -e

IDENTITY_NAME="beneficiary-demo"

echo "🔐 Creating beneficiary identity for demo..."
echo ""

# Check if identity already exists
if dfx identity whoami 2>/dev/null | grep -q "$IDENTITY_NAME"; then
    echo "   ℹ️  Identity '$IDENTITY_NAME' already exists"
    echo ""
    dfx identity use "$IDENTITY_NAME"
    PRINCIPAL=$(dfx identity get-principal)
    echo "   Beneficiary Principal: $PRINCIPAL"
    echo ""
    echo "   To use this identity:"
    echo "   dfx identity use $IDENTITY_NAME"
    echo ""
    exit 0
fi

# Create new identity
echo "   Creating new identity: $IDENTITY_NAME"
dfx identity new "$IDENTITY_NAME" --storage-mode plaintext 2>&1 | grep -v "panic\|thread\|backtrace" || true

# Switch to new identity
dfx identity use "$IDENTITY_NAME"
PRINCIPAL=$(dfx identity get-principal)

echo ""
echo "✅ Beneficiary identity created!"
echo ""
echo "   Identity Name: $IDENTITY_NAME"
echo "   Beneficiary Principal: $PRINCIPAL"
echo ""
echo "📋 Next steps:"
echo "   1. Copy the principal above"
echo "   2. Switch back to your main identity: dfx identity use default"
echo "   3. Register in the frontend using this principal as beneficiary"
echo "   4. Add mock balance to your main account: ./add-mock-balance.sh 0.5"
echo ""
echo "💡 To switch identities:"
echo "   dfx identity use default          # Your main account"
echo "   dfx identity use $IDENTITY_NAME  # Beneficiary account"
echo ""



