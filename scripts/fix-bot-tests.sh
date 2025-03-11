#!/bin/bash

# This script updates all bot test files to use the centralized mock system

# Update all test files
for test_file in $(find src/starbunk/bots/__tests__ -name "*.test.ts" | sort); do
  # Skip files we've already updated
  if [[ "$test_file" == *"blueBotConfigExample.test.ts"* ]]; then
    echo "Skipping already updated file: $test_file"
    continue
  fi

  echo "Updating $test_file..."

  # Extract bot name from filename
  filename=${test_file##*/}
  test_name=${filename%%.test.ts}
  echo "Processing test file: $test_name"

  # Add the mock for botConfig module if missing
  if ! grep -q "jest.mock('../botConfig'" "$test_file"; then
    # Find the right place to insert the mock
    if grep -q "// Import test dependencies" "$test_file"; then
      sed -i '/\/\/ Import test dependencies/i \
// Mock the botConfig module\
jest.mock("../botConfig", () => {\
  return require("./mockBotConfig");\
});\
' "$test_file"
    else
      # Insert before the first import statement
      sed -i '1,/^import/s/^import/\/\/ Mock the botConfig module\
jest.mock("../botConfig", () => {\
  return require(".\/mockBotConfig");\
});\
\
import/' "$test_file"
    fi
  fi

  # Update import statements for getBotPattern and other bot functions
  sed -i 's/import { getBotPattern } from.*$/import { getBotPattern } from "..\/botConfig";/' "$test_file"
  sed -i 's/import { getBotName } from.*$/import { getBotName } from "..\/botConfig";/' "$test_file"
  sed -i 's/import { getBotAvatar } from.*$/import { getBotAvatar } from "..\/botConfig";/' "$test_file"
  sed -i 's/import { getBotResponse } from.*$/import { getBotResponse } from "..\/botConfig";/' "$test_file"
done

echo "Done updating bot test files!"
