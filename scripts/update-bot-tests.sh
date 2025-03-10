#!/bin/bash

# Update tests for bots that use config imports
for bot in "Gundam" "Macaroni" "Venn"; do
  # Convert to lowercase for file paths
  bot_lower=$(echo "$bot" | tr '[:upper:]' '[:lower:]')
  test_file="src/starbunk/bots/__tests__/${bot_lower}Bot.test.ts"
  
  echo "Updating $test_file..."
  
  # Edit the file to add the config mock
  if [ -f "$test_file" ]; then
    # Add mock for the specific config
    if ! grep -q "jest.mock('../config/${bot}BotConfig'" "$test_file"; then
      sed -i '/jest.mock.*botConfig/a \
// Mock the '"$bot"'BotConfig to use our mock implementation\
jest.mock("../config/'"$bot"'BotConfig", () => {\
  const mocks = require("./mockBotConfig");\
  return mocks;\
});' "$test_file"
    fi
  else
    echo "Warning: Test file $test_file not found"
  fi
done

echo "Done updating bot tests!"