#!/bin/bash

# This script updates tests for a refactored bot
# Usage: ./scripts/update-bot-tests.sh <botName>

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if a bot name was provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: No bot name provided${NC}"
  echo -e "Usage: ./scripts/update-bot-tests.sh <botName>"
  exit 1
fi

BOT_NAME=$1
BOT_DIR="src/starbunk/bots/reply-bots/$BOT_NAME"
TEST_FILE="$BOT_DIR/${BOT_NAME}.test.ts"

# Check if the bot directory exists
if [ ! -d "$BOT_DIR" ]; then
  echo -e "${RED}Error: Bot directory $BOT_DIR does not exist${NC}"
  exit 1
fi

# Check if the test file exists
if [ ! -f "$TEST_FILE" ]; then
  echo -e "${RED}Error: Test file $TEST_FILE does not exist${NC}"
  exit 1
fi

# Create a backup of the test file
cp "$TEST_FILE" "${TEST_FILE}.bak"
echo -e "${GREEN}Created backup of test file at ${TEST_FILE}.bak${NC}"

# Add mock imports for the extracted components
echo -e "${YELLOW}Updating test file...${NC}"

# Get the list of condition files
CONDITION_FILES=$(find "$BOT_DIR/conditions" -name "*.ts" 2>/dev/null)
RESPONSE_FILES=$(find "$BOT_DIR/responses" -name "*.ts" 2>/dev/null)
IDENTITY_FILES=$(find "$BOT_DIR/identity" -name "*.ts" 2>/dev/null)

# Create a temporary file for the updated test
TMP_FILE=$(mktemp)

# Add the mock imports
cat > "$TMP_FILE" << EOL
// Mocks need to be at the very top, before any imports
import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

EOL

# Add mocks for condition files
for FILE in $CONDITION_FILES; do
  FILENAME=$(basename "$FILE" .ts)
  CLASS_NAME=$(grep -o "export class [A-Za-z0-9_]\+" "$FILE" | sed 's/export class //')

  if [ -n "$CLASS_NAME" ]; then
    echo "// Mock the $CLASS_NAME" >> "$TMP_FILE"
    echo "jest.mock('./$FILENAME', () => ({" >> "$TMP_FILE"
    echo "  $CLASS_NAME: jest.fn().mockImplementation(() => ({" >> "$TMP_FILE"
    echo "    shouldTrigger: jest.fn().mockResolvedValue(true)" >> "$TMP_FILE"
    echo "  }))" >> "$TMP_FILE"
    echo "}));" >> "$TMP_FILE"
    echo "" >> "$TMP_FILE"
  fi
done

# Add mocks for response files
for FILE in $RESPONSE_FILES; do
  FILENAME=$(basename "$FILE" .ts)
  CLASS_NAME=$(grep -o "export class [A-Za-z0-9_]\+" "$FILE" | sed 's/export class //')

  if [ -n "$CLASS_NAME" ]; then
    echo "// Mock the $CLASS_NAME" >> "$TMP_FILE"
    echo "jest.mock('./$FILENAME', () => ({" >> "$TMP_FILE"
    echo "  $CLASS_NAME: jest.fn().mockImplementation(() => ({" >> "$TMP_FILE"
    echo "    generateResponse: jest.fn().mockResolvedValue('Test response')" >> "$TMP_FILE"
    echo "  }))" >> "$TMP_FILE"
    echo "}));" >> "$TMP_FILE"
    echo "" >> "$TMP_FILE"
  fi
done

# Add mocks for identity files
for FILE in $IDENTITY_FILES; do
  FILENAME=$(basename "$FILE" .ts)
  FUNCTION_NAME=$(grep -o "export async function [A-Za-z0-9_]\+" "$FILE" | sed 's/export async function //')

  if [ -n "$FUNCTION_NAME" ]; then
    echo "// Mock the $FUNCTION_NAME" >> "$TMP_FILE"
    echo "jest.mock('./$FILENAME', () => ({" >> "$TMP_FILE"
    echo "  $FUNCTION_NAME: jest.fn().mockResolvedValue({" >> "$TMP_FILE"
    echo "    name: 'TestBot'," >> "$TMP_FILE"
    echo "    avatarUrl: 'https://example.com/avatar.png'" >> "$TMP_FILE"
    echo "  })" >> "$TMP_FILE"
    echo "}));" >> "$TMP_FILE"
    echo "" >> "$TMP_FILE"
  fi
done

# Add the rest of the test file
echo "// Import the model constants" >> "$TMP_FILE"
echo "import { BOT_NAME, TEST } from './${BOT_NAME}Model';" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"
echo "// Real imports after all mocks" >> "$TMP_FILE"
echo "import { createMockGuildMember, createMockMessage } from '@/tests/mocks/discordMocks';" >> "$TMP_FILE"
echo "import webhookService from '@/webhooks/webhookService';" >> "$TMP_FILE"
echo "import { Message, TextChannel, User } from 'discord.js';" >> "$TMP_FILE"
echo "import ReplyBot from '../../replyBot';" >> "$TMP_FILE"
echo "import create${BOT_NAME^} from './${BOT_NAME}';" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"
echo "describe('${BOT_NAME^}', () => {" >> "$TMP_FILE"
echo "  // Test fixtures" >> "$TMP_FILE"
echo "  let ${BOT_NAME}: ReplyBot;" >> "$TMP_FILE"
echo "  let mockMessage: Partial<Message<boolean>>;" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"
echo "  beforeEach(() => {" >> "$TMP_FILE"
echo "    // Arrange - Common setup for all tests" >> "$TMP_FILE"
echo "    jest.clearAllMocks();" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"
echo "    // Create message mock" >> "$TMP_FILE"
echo "    mockMessage = createMockMessage(TEST.USER_NAME);" >> "$TMP_FILE"
echo "    if (mockMessage.author) {" >> "$TMP_FILE"
echo "      Object.defineProperty(mockMessage.author, 'displayName', {" >> "$TMP_FILE"
echo "        value: TEST.USER_NAME," >> "$TMP_FILE"
echo "        configurable: true" >> "$TMP_FILE"
echo "      });" >> "$TMP_FILE"
echo "    }" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"
echo "    // Create bot instance" >> "$TMP_FILE"
echo "    ${BOT_NAME} = create${BOT_NAME^}();" >> "$TMP_FILE"
echo "  });" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"
echo "  describe('identity', () => {" >> "$TMP_FILE"
echo "    it('should have correct name and avatar URL', () => {" >> "$TMP_FILE"
echo "      // Act" >> "$TMP_FILE"
echo "      const identity = ${BOT_NAME}.getIdentity();" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"
echo "      // Assert" >> "$TMP_FILE"
echo "      expect(identity.name).toBe(BOT_NAME);" >> "$TMP_FILE"
echo "      expect(identity.avatarUrl).toBeDefined();" >> "$TMP_FILE"
echo "    });" >> "$TMP_FILE"
echo "  });" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"
echo "  describe('message handling', () => {" >> "$TMP_FILE"
echo "    it('should ignore messages from bots', async () => {" >> "$TMP_FILE"
echo "      // Arrange" >> "$TMP_FILE"
echo "      mockMessage.author = {" >> "$TMP_FILE"
echo "        ...createMockGuildMember(TEST.BOT_USER_ID, TEST.BOT_USER_NAME).user," >> "$TMP_FILE"
echo "        bot: true" >> "$TMP_FILE"
echo "      } as User;" >> "$TMP_FILE"
echo "      mockMessage.content = TEST.MESSAGE.UNRELATED;" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"
echo "      // Act" >> "$TMP_FILE"
echo "      await ${BOT_NAME}.handleMessage(mockMessage as Message<boolean>);" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"
echo "      // Assert" >> "$TMP_FILE"
echo "      expect(webhookService.writeMessage).not.toHaveBeenCalled();" >> "$TMP_FILE"
echo "    });" >> "$TMP_FILE"
echo "" >> "$TMP_FILE"
echo "    // Add more tests here" >> "$TMP_FILE"
echo "  });" >> "$TMP_FILE"
echo "});" >> "$TMP_FILE"

# Replace the test file with the updated version
mv "$TMP_FILE" "$TEST_FILE"

echo -e "${GREEN}Updated test file at $TEST_FILE${NC}"
echo -e "${YELLOW}Please review the updated test file and add more specific tests as needed.${NC}"
