#!/bin/bash

# Ensure the project is built first
echo "Building project..."
npm run build

# Run the bot validation script
echo "Starting bot validation tool..."
node scripts/validateBotTriggers.js
