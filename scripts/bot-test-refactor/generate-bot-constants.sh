#!/bin/bash

# This script generates the botConstants.ts file for Cypress tests
# It scans the bot model files and creates import statements and exports

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Generating botConstants.ts file...${NC}"

# Output file
OUTPUT_FILE="cypress/support/botConstants.ts"

# Start with the header
cat > "$OUTPUT_FILE" << EOL
/**
 * Bot Constants for Cypress Tests
 *
 * This file imports and exports constants from all bot model files
 * to make them available for use in Cypress tests.
 *
 * Using these constants ensures consistency between unit tests and E2E tests.
 */

// Import constants from bot model files
EOL

# Find all bot model files
for modelFile in $(find src/starbunk/bots/reply-bots -name "*Model.ts"); do
  botName=$(basename "$(dirname "$modelFile")")
  botNameUpper=$(echo "$botName" | tr '[:lower:]' '[:upper:]')

  echo -e "${YELLOW}Processing $botName model file...${NC}"

  # Extract exported constants from the model file
  constants=$(grep -E "^export const" "$modelFile" | grep -v "TEST" | sed 's/export const //g' | sed 's/ =.*//g')

  # Create import statement
  importStatement="import { "

  # Add BOT_NAME if it exists, otherwise add a specific bot name constant
  if grep -q "export const BOT_NAME" "$modelFile"; then
    importStatement+="BOT_NAME as ${botNameUpper}_BOT_NAME, "
  elif grep -q "export const ${botNameUpper}_BOT_NAME" "$modelFile"; then
    importStatement+="${botNameUpper}_BOT_NAME, "
  elif grep -q "export const ${botName}BotName" "$modelFile"; then
    importStatement+="${botName}BotName as ${botNameUpper}_BOT_NAME, "
  elif grep -q "export const ${botNameUpper}_NAME" "$modelFile"; then
    importStatement+="${botNameUpper}_NAME as ${botNameUpper}_BOT_NAME, "
  elif grep -q "export const ${botName^^}_BOT_NAME" "$modelFile"; then
    importStatement+="${botName^^}_BOT_NAME as ${botNameUpper}_BOT_NAME, "
  elif grep -q "export const EZIO_BOT_NAME" "$modelFile"; then
    importStatement+="EZIO_BOT_NAME as ${botNameUpper}_BOT_NAME, "
  else
    # If no BOT_NAME constant is found, add a comment
    echo "// Warning: No BOT_NAME constant found in $modelFile" >> "$OUTPUT_FILE"
  fi

  # Add TEST
  importStatement+="TEST as ${botNameUpper}_BOT_TEST"

  # Add other constants, but handle duplicates
  seenConstants=()
  for constant in $constants; do
    if [ "$constant" != "BOT_NAME" ] && [ "$constant" != "TEST" ]; then
      # Check if we've already seen this constant
      if [[ ! " ${seenConstants[@]} " =~ " ${constant} " ]]; then
        importStatement+=", $constant"
        seenConstants+=("$constant")
      fi
    fi
  done

  # Remove .ts extension from the import path
  modelFileNoExt=${modelFile%.ts}
  importStatement+=" } from '../../$modelFileNoExt';"

  # Add import statement to output file
  echo "$importStatement" >> "$OUTPUT_FILE"
done

# Add the export section
cat >> "$OUTPUT_FILE" << EOL

// Export all constants for use in tests
export const BOT_CONSTANTS = {
EOL

# Add each bot's constants to the export
for modelFile in $(find src/starbunk/bots/reply-bots -name "*Model.ts"); do
  botName=$(basename "$(dirname "$modelFile")")
  botNameUpper=$(echo "$botName" | tr '[:lower:]' '[:upper:]')

  # Extract response constant name - look for specific patterns
  responseConstant=""
  if grep -q "export const ${botNameUpper}_BOT_RESPONSE" "$modelFile"; then
    responseConstant="${botNameUpper}_BOT_RESPONSE"
  elif grep -q "export const ${botName^^}_BOT_RESPONSE" "$modelFile"; then
    responseConstant="${botName^^}_BOT_RESPONSE"
  elif grep -q "export const NICE_BOT_RESPONSE" "$modelFile"; then
    responseConstant="NICE_BOT_RESPONSE"
  elif grep -q "export const PICKLE_BOT_RESPONSE" "$modelFile"; then
    responseConstant="PICKLE_BOT_RESPONSE"
  elif grep -q "export const HOLD_BOT_RESPONSE" "$modelFile"; then
    responseConstant="HOLD_BOT_RESPONSE"
  elif grep -q "export const EZIO_BOT_RESPONSE" "$modelFile"; then
    responseConstant="EZIO_BOT_RESPONSE"
  elif grep -q "export const MUSIC_CORRECT_BOT_RESPONSE" "$modelFile"; then
    responseConstant="MUSIC_CORRECT_BOT_RESPONSE"
  elif grep -q "export const CHAOS_RESPONSE" "$modelFile"; then
    responseConstant="CHAOS_RESPONSE"
  elif grep -q "export const GUNDAM_RESPONSE" "$modelFile"; then
    responseConstant="GUNDAM_RESPONSE"
  elif grep -q "export const BABY_RESPONSE" "$modelFile"; then
    responseConstant="BABY_RESPONSE"
  elif grep -q "export const NEGATIVE_ATTITUDE_RESPONSE" "$modelFile"; then
    responseConstant="NEGATIVE_ATTITUDE_RESPONSE"
  elif grep -q "export const DEFAULT_RESPONSE" "$modelFile"; then
    responseConstant="DEFAULT_RESPONSE"
  elif grep -q "export const BOT_GREETING" "$modelFile"; then
    responseConstant="BOT_GREETING"
  elif grep -q "export const VENN_CORRECTION" "$modelFile"; then
    responseConstant="VENN_CORRECTION"
  elif grep -q "export const SPIDERMAN_CORRECTION" "$modelFile"; then
    responseConstant="SPIDERMAN_CORRECTION"
  elif grep -q "export const CHECK_RESPONSE" "$modelFile"; then
    responseConstant="CHECK_RESPONSE"
  elif grep -q "export const RESPONSES" "$modelFile"; then
    responseConstant="RESPONSES"
  elif grep -q "export const CRINGE_RESPONSES" "$modelFile"; then
    responseConstant="CRINGE_RESPONSES"
  elif grep -q "export const BANANA_RESPONSES" "$modelFile"; then
    responseConstant="BANANA_RESPONSES"
  fi

  # Add bot constants to export
  cat >> "$OUTPUT_FILE" << EOL
  ${botNameUpper}_BOT: {
EOL

  # Add NAME if it exists
  if grep -q "export const BOT_NAME" "$modelFile" || grep -q "export const ${botNameUpper}_BOT_NAME" "$modelFile" || grep -q "export const ${botName}BotName" "$modelFile" || grep -q "export const ${botNameUpper}_NAME" "$modelFile" || grep -q "export const ${botName^^}_BOT_NAME" "$modelFile" || grep -q "export const EZIO_BOT_NAME" "$modelFile"; then
    echo "    NAME: ${botNameUpper}_BOT_NAME," >> "$OUTPUT_FILE"
  else
    # If no BOT_NAME constant is found, use a default
    echo "    NAME: '${botName^}Bot'," >> "$OUTPUT_FILE"
  fi

  # Add response if it exists
  if [ -n "$responseConstant" ]; then
    echo "    RESPONSE: $responseConstant," >> "$OUTPUT_FILE"
  fi

  # Add TEST
  echo "    TEST: ${botNameUpper}_BOT_TEST" >> "$OUTPUT_FILE"
  echo "  }," >> "$OUTPUT_FILE"
done

# Close the export
cat >> "$OUTPUT_FILE" << EOL
};

export default BOT_CONSTANTS;
EOL

echo -e "${GREEN}Generated $OUTPUT_FILE${NC}"
