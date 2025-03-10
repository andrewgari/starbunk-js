#!/bin/bash

# Script to fix unused imports in all test files

# Function to fix a given test file
fix_test_file() {
  local file="$1"
  echo "Fixing imports in $file"
  
  # Remove unused imports but keep necessary ones
  sed -i 's/import { TextChannel } from .discord.js.;//g' "$file"
  sed -i 's/import random from ...\/..\/..\/.utils\/random.;//g' "$file"
  sed -i 's/, mockLogger//g' "$file"
  sed -i 's/, getBotName//g' "$file"
  sed -i 's/, getBotAvatar//g' "$file"
  sed -i 's/, getBotResponse//g' "$file"
  sed -i 's/import container from ..\/..\/..\/.services\/ServiceContainer.;//g' "$file"
  
  # Fix any double commas that might have been introduced
  sed -i 's/, ,/,/g' "$file"
  sed -i 's/{ , /{ /g' "$file"
  sed -i 's/ , }/ }/g' "$file"
}

# Fix all test files
for test_file in src/starbunk/bots/__tests__/*.test.ts; do
  fix_test_file "$test_file"
done

echo "All test files fixed"