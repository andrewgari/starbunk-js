#!/bin/bash

# Script to update test files to use setupTestContainer

# Directory containing bot test files
TEST_DIR="src/starbunk/bots/__tests__"

# List of test files
TEST_FILES=(
  "attitudeBot.test.ts"
  "babyBot.test.ts"
  "bananaBot.test.ts"
  "blueBot.test.ts"
  "botBot.test.ts"
  "chaosBot.test.ts"
  "checkBot.test.ts"
  "ezioBot.test.ts"
  "gundamBot.test.ts"
  "guyBot.test.ts"
  "holdBot.test.ts"
  "macaroniBot.test.ts"
  "musicCorrectBot.test.ts"
  "niceBot.test.ts"
  "pickleBot.test.ts"
  "sheeshBot.test.ts"
  "sigGreatBot.test.ts"
  "spiderBot.test.ts"
  "vennBot.test.ts"
)

# For each test file
for file in "${TEST_FILES[@]}"; do
  echo "Updating $file"
  
  # Replace 'import { mockMessage }' with 'import { mockMessage, setupTestContainer }'
  sed -i "s/import { mockMessage } from '.\/testUtils';/import { mockMessage, setupTestContainer } from '.\/testUtils';/" "$TEST_DIR/$file"
  
  # Add container import if it doesn't exist
  if ! grep -q "import container from '../../../services/ServiceContainer';" "$TEST_DIR/$file"; then
    sed -i "/import { mockMessage/a import container from '../../../services/ServiceContainer';" "$TEST_DIR/$file"
  fi
  
  # Replace beforeEach block with corrected version
  # First, we'll create a new file with the correct content
  cat > "$TEST_DIR/$file.new" << EOF
  beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Create bot after setting up container
EOF
  
  # Now extract the bot creation line from the original file
  bot_creation_line=$(grep -o ".*new .*Bot().*" "$TEST_DIR/$file")
  
  # Add it to our new file
  echo "		$bot_creation_line" >> "$TEST_DIR/$file.new"
  echo "	});" >> "$TEST_DIR/$file.new"
  
  # Replace the original beforeEach block with our new one
  sed -i "/beforeEach/,/});/c\\$(cat "$TEST_DIR/$file.new")" "$TEST_DIR/$file"
  
  # Clean up
  rm "$TEST_DIR/$file.new"
  
  echo "Updated $file"
done

echo "All test files updated"