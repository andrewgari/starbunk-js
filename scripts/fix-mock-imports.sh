#!/bin/bash

# This script fixes the imports for mock functions in reply-bot test files
# Specifically, it changes imports from @/tests/helpers/replyBotTestHelper to @/tests/mocks/discordMocks
# This is needed because the createMockGuildMember function in discordMocks accepts two parameters,
# while the one in replyBotTestHelper only accepts one parameter

echo "Fixing mock imports in reply-bot test files..."

# Loop through all bot directories
for botdir in */; do
  botname="${botdir%/}"
  testfile="${botdir}${botname}.test.ts"

  # Skip if test file doesn't exist
  if [ ! -f "$testfile" ]; then
    echo "Skipping $botname (no test file found)"
    continue
  fi

  echo "Checking $testfile..."

  # Check if the file imports from @/tests/helpers/replyBotTestHelper
  if grep -q "@/tests/helpers/replyBotTestHelper" "$testfile"; then
    echo "Fixing imports in $testfile..."

    # Replace the import
    sed -i "s|@/tests/helpers/replyBotTestHelper|@/tests/mocks/discordMocks|g" "$testfile"

    echo "Fixed imports in $testfile"
  else
    echo "No fixes needed for $testfile"
  fi
done

echo "All mock imports have been fixed."
