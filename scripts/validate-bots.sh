#!/bin/bash

# Set error handling
set -e

# Ensure the project is built first
echo "Building project..."
if ! npm run build; then
    echo "Error: Build failed. Please fix the build errors and try again."
    exit 1
fi

# Run the bot validation script
echo "Starting bot validation tool..."
if ! node scripts/validateBotTriggers.js; then
    echo "Error: Bot validation script failed."
    exit 1
fi

echo "Bot validation completed successfully."
