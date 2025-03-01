#!/bin/bash

# Loop through all test files in the reply-bots directory
for file in src/tests/starbunk/reply-bots/*.test.ts; do
  echo "Processing: $file"

  # Skip if no matches
  if [[ "$file" == "src/tests/starbunk/reply-bots/*.test.ts" ]]; then
    echo "No matching files found"
    exit 0
  fi

  # Extract the filename without path and extension
  filename=$(basename "$file" .test.ts)

  # Create the target directory if it doesn't exist
  target_dir="src/starbunk/bots/reply-bots/${filename}"
  mkdir -p "$target_dir"

  # Create the new filename
  new_file="$target_dir/${filename}.test.ts"

  # Move the file
  cp "$file" "$new_file"
  echo "Copied: $file → $new_file"
done

echo "All test files have been copied to their new locations."
