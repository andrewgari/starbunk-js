#!/bin/bash

# This script helps refactor a bot to the new structure
# Usage: ./scripts/refactor-bot.sh <botName>

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if a bot name was provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: No bot name provided${NC}"
  echo -e "Usage: ./scripts/refactor-bot.sh <botName>"
  exit 1
fi

BOT_NAME=$1
BOT_DIR="src/starbunk/bots/reply-bots/$BOT_NAME"

# Check if the bot directory exists
if [ ! -d "$BOT_DIR" ]; then
  echo -e "${RED}Error: Bot directory $BOT_DIR does not exist${NC}"
  exit 1
fi

# Create the new directory structure
echo -e "${GREEN}Creating directory structure for $BOT_NAME...${NC}"
mkdir -p "$BOT_DIR/conditions"
mkdir -p "$BOT_DIR/responses"
mkdir -p "$BOT_DIR/identity"
mkdir -p "$BOT_DIR/utils"

# Create template files
echo -e "${GREEN}Creating template files...${NC}"

# Create a template condition file
cat > "$BOT_DIR/conditions/template-condition.ts" << EOL
import { Message } from "discord.js";
import { TriggerCondition } from "../../../../botTypes";

/**
 * Condition that checks if a message meets specific criteria
 */
export class TemplateCondition implements TriggerCondition {
	async shouldTrigger(message: Message): Promise<boolean> {
		// Implement your condition logic here
		return false;
	}
}
EOL

# Create a template response generator file
cat > "$BOT_DIR/responses/template-response-generator.ts" << EOL
import { Message } from "discord.js";
import { ResponseGenerator } from "../../../../botTypes";

/**
 * Response generator that provides a response
 */
export class TemplateResponseGenerator implements ResponseGenerator {
	async generateResponse(message: Message): Promise<string> {
		// Implement your response generation logic here
		return "Template response";
	}
}
EOL

echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Create condition classes in $BOT_DIR/conditions/"
echo -e "2. Create response generators in $BOT_DIR/responses/"
echo -e "3. Update the main bot file to use the new components"
echo -e "4. Update tests to use the new components"

echo -e "${GREEN}Done!${NC}"
