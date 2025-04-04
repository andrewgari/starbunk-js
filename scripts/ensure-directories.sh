#!/bin/bash

# Required directories
DIRS=(
    "./data"
    "./data/llm_context"
    "./scripts"
    "./src/starbunk/bots/strategy-bots"
)

# Create directories if they don't exist
for dir in "${DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "Creating directory: $dir"
        mkdir -p "$dir"
    fi
done

# Set permissions
chmod -R 755 .
chmod 777 ./data
chmod 777 ./data/llm_context

echo "Directory structure verified and permissions set"
