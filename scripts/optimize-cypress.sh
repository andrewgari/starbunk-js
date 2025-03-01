#!/bin/bash

# Script to optimize Cypress for better performance

echo "Optimizing Cypress for better performance..."

# Ensure Cypress is installed
echo "Ensuring Cypress is installed..."
npx cypress install

# Clear Cypress cache
echo "Clearing Cypress cache..."
npx cypress cache clear

# Create optimized Cypress configuration
echo "Creating optimized Cypress configuration..."
cat > cypress.env.json << EOF
{
  "numTestsKeptInMemory": 5,
  "experimentalMemoryManagement": true,
  "experimentalInteractiveRunEvents": true,
  "defaultCommandTimeout": 5000,
  "requestTimeout": 5000,
  "responseTimeout": 10000,
  "pageLoadTimeout": 10000
}
EOF

echo "Cypress optimization complete!"
echo "Run your tests with 'npm run test:e2e:parallel' for maximum performance."
