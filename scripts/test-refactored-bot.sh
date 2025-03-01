#!/bin/bash

# This script tests a refactored bot
# Usage: ./scripts/test-refactored-bot.sh <botName>

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if a bot name was provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: No bot name provided${NC}"
  echo -e "Usage: ./scripts/test-refactored-bot.sh <botName>"
  exit 1
fi

BOT_NAME=$1
BOT_DIR="src/starbunk/bots/reply-bots/$BOT_NAME"

# Check if the bot directory exists
if [ ! -d "$BOT_DIR" ]; then
  echo -e "${RED}Error: Bot directory $BOT_DIR does not exist${NC}"
  exit 1
fi

# Run the tests for the bot
echo -e "${YELLOW}Running tests for $BOT_NAME...${NC}"
npm test -- -t "$BOT_NAME"

# Check if the tests passed
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Tests passed for $BOT_NAME!${NC}"
else
  echo -e "${RED}Tests failed for $BOT_NAME!${NC}"
  echo -e "${YELLOW}Please check the test output for errors.${NC}"
fi
