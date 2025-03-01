#!/bin/bash

# Run from the root directory of your project
BASE_DIR="../src"
TEST_DIR="$BASE_DIR/tests/starbunk/reply-bots"
BOTS_DIR="$BASE_DIR/starbunk/bots/reply-bots"

# Find all test files
for test_file in "$TEST_DIR"/*.test.ts; do
  # Extract just the filename
  filename=$(basename "$test_file")
  # Extract bot name (remove .test.ts)
  botname="${filename%.test.ts}"

  # Check if the corresponding bot directory exists
  if [ -d "$BOTS_DIR/$botname" ]; then
    # Move the test file to the bot's directory
    mv "$test_file" "$BOTS_DIR/$botname/"
    echo "Moved: $test_file → $BOTS_DIR/$botname/"
  else
    echo "Warning: Bot directory not found for $botname"
  fi
done
