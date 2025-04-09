#!/bin/bash

# Find all index.ts files in the strategy-bots directory
find ./src/starbunk/bots/strategy-bots -name "index.ts" -type f | while read -r file; do
  # Skip the main index.ts file
  if [[ "$file" == "./src/starbunk/bots/strategy-bots/index.ts" ]]; then
    continue
  fi
  
  # Skip already updated files
  if grep -q "BotFactory" "$file"; then
    echo "Skipping already updated file: $file"
    continue
  fi
  
  echo "Updating file: $file"
  
  # Replace createStrategyBot with BotFactory.createBot
  sed -i 's/import { createStrategyBot } from '\''..\/..\/core\/bot-builder'\'';/import { BotFactory } from '\''..\/..\/core\/bot-factory'\'';/g' "$file"
  sed -i 's/export default createStrategyBot({/export default BotFactory.createBot({/g' "$file"
done

echo "All bot implementations have been updated."