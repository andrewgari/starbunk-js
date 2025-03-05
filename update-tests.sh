#\!/bin/bash

# Find all test files in the bots/__tests__ directory
TEST_FILES=$(find src/starbunk/bots/__tests__ -name "*.test.ts" -type f)

# For each test file, update the mocking approach
for file in $TEST_FILES; do
  # Skip testUtils.ts
  if [[ "$file" == *"testUtils.ts" ]]; then
    continue
  fi
  
  # Replace jest.mocked line with a comment
  sed -i 's/jest\.mocked(webhookService)\.writeMessage = mockWebhookService\.writeMessage;/\/\/ The setupBotMocks() function in testUtils now handles this/' "$file"
  
  # Remove unused mockWebhookService imports
  sed -i 's/, mockWebhookService//g' "$file"
done

echo "Updated all test files"
