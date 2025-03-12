#!/bin/bash

# Script to remove @Service decorators from bot files
# This script will:
# 1. Remove the @Service decorator
# 2. Remove the Service import
# 3. Add a comment indicating the bot is registered by StarbunkClient.registerBots()

BOT_DIR="src/starbunk/bots/reply-bots"

# Process each bot file
for bot_file in $(grep -l "@Service" $BOT_DIR/*.ts); do
  echo "Processing $bot_file"

  # Create a temporary file
  temp_file=$(mktemp)

  # Step 1: Remove the @Service decorator block
  awk '
    BEGIN { skip = 0; }
    /^@Service\(/ { skip = 1; next; }
    /^\}\)/ { if (skip) { skip = 0; next; } }
    !skip { print; }
  ' "$bot_file" > "$temp_file"

  # Step 2: Remove Service from imports
  sed -i 's/import { \(.*\), Service, \(.*\) } from/import { \1, \2 } from/g' "$temp_file"
  sed -i 's/import { Service, \(.*\) } from/import { \1 } from/g' "$temp_file"

  # Step 3: Add comment before class declaration
  sed -i '/^export default class/ i\
// This class is registered by StarbunkClient.registerBots() rather than through the service container' "$temp_file"

  # Replace the original file with the modified content
  mv "$temp_file" "$bot_file"
done

echo "All bot files updated successfully!"
