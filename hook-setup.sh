#!/bin/sh

# Setup script to install git hooks

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Copy all hooks from .githooks to .git/hooks
cp .githooks/* .git/hooks/

# Make all hooks executable
chmod +x .git/hooks/*

echo "Git hooks installed successfully!"
