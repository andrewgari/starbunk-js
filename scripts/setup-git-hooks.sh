#!/bin/bash

# Make git hooks executable
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push

echo "Git hooks are now executable!"
echo "Pre-commit hook will run Prettier formatting"
echo "Pre-push hook will run all checks"
