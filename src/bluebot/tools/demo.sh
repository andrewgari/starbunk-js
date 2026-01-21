#!/bin/bash
# Demo script for BlueBot Interactive Tester

echo "=== BlueBot Interactive Tester Demo ==="
echo ""
echo "Sending test messages to BlueBot..."
echo ""

# Create a test input file
cat > /tmp/bluebot-test-input.txt << 'EOF'
I love blue
bluebot, compliment me
/setname Alice
bluebot, say something nice to me
yes
/exit
EOF

# Run the tester with the test input
cd "$(dirname "$0")/.." && cat /tmp/bluebot-test-input.txt | npm run tester:cli

# Clean up
rm -f /tmp/bluebot-test-input.txt

