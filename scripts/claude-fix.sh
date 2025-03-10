#!/bin/bash

# Remove any describe.only to prevent focused tests
# This script is safer than the original fix-bot-tests.sh because it uses grep + simple substitutions
for test_file in $(find src/starbunk/bots/__tests__ -name "*.test.ts" | sort); do
  echo "Checking $test_file..."
  
  # Remove describe.only
  if grep -q "describe.only" "$test_file"; then
    echo "  Removing describe.only from $test_file"
    sed -i 's/describe\.only/describe/g' "$test_file"
  fi
  
  # Remove container mock
  if grep -q "jest.mock.*services/container" "$test_file"; then
    echo "  Removing container mock from $test_file"
    sed -i '/jest\.mock.*services\/container/d' "$test_file"
  fi
done

echo "Done fixing test files!"

