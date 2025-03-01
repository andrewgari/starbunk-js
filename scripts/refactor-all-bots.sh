#!/bin/bash

# This script refactors all remaining bots to the new structure
# Usage: ./scripts/refactor-all-bots.sh

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# List of bots to refactor
BOTS=(
	"attitudeBot"
	"babyBot"
	"bananaBot"
	"botBot"
	"chaosBot"
	"checkBot"
	"ezioBot"
	"gundamBot"
	"macaroniBot"
	"musicCorrectBot"
	"pickleBot"
	"sheeshBot"
	"sigGreatBot"
	"vennBot"
)

# Refactor each bot
for BOT in "${BOTS[@]}"; do
	echo -e "${YELLOW}Refactoring $BOT...${NC}"
	./scripts/refactor-bot.sh "$BOT"
	echo -e "${GREEN}Done refactoring $BOT${NC}"
	echo ""
done

echo -e "${GREEN}All bots have been refactored!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Implement the condition classes for each bot"
echo -e "2. Implement the response generators for each bot"
echo -e "3. Update the main bot files to use the new components"
echo -e "4. Update tests to use the new components"
