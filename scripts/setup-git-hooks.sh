#!/bin/bash

# Ensure the hooks directory exists
mkdir -p .git/hooks

# Copy the pre-push hook
cp scripts/pre-push .git/hooks/pre-push

# Make git hooks executable
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push

echo "Git hooks installed successfully!"
echo "Pre-commit hook will run Prettier formatting"
echo "Pre-push hook will:"
echo "  - Skip checks if only GitHub Actions workflows were modified"
echo "  - Run all checks if core application files were modified"
