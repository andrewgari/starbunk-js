#!/bin/bash

# Directory containing response files
RESPONSES_DIR="src/starbunk/bots/responses"

# Loop through all response files
for file in "$RESPONSES_DIR"/*.responses.ts; do
  echo "Processing: $file"

  # Skip if no matches
  if [[ "$file" == "$RESPONSES_DIR/*.responses.ts" ]]; then
    echo "No matching files found"
    exit 0
  fi

  # Extract the bot name (everything before Bot.responses.ts)
  filename=$(basename "$file")
  botname="${filename%.responses.ts}"

  # Create the target directory if it doesn't exist
  target_dir="src/starbunk/bots/reply-bots/${botname}"
  mkdir -p "$target_dir"

  # Create the new filename
  new_file="$target_dir/${botname}.responses.ts"

  # Copy the file
  cp "$file" "$new_file"
  echo "Copied: $file → $new_file"

  # Update imports in the bot file
  bot_file="$target_dir/${botname}.ts"
  if [ -f "$bot_file" ]; then
    echo "Updating imports in $bot_file"
    # Replace the import statement
    sed -i "s|import { .* } from '../../responses/${botname}.responses';|import { AVATAR_URL, BOT_NAME, NEGATIVE_ATTITUDE_RESPONSE } from './${botname}.responses';|" "$bot_file"
  fi
done

echo "All response files have been copied to their respective bot directories."
