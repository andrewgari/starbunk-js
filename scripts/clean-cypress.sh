#!/bin/bash

# Script to clean up Cypress screenshots and videos

echo "Cleaning up Cypress screenshots and videos..."

# Remove screenshots
if [ -d "cypress/screenshots" ]; then
  rm -rf cypress/screenshots
  echo "Removed screenshots directory"
else
  echo "No screenshots directory found"
fi

# Remove videos
if [ -d "cypress/videos" ]; then
  rm -rf cypress/videos
  echo "Removed videos directory"
else
  echo "No videos directory found"
fi

# Remove downloads
if [ -d "cypress/downloads" ]; then
  rm -rf cypress/downloads
  echo "Removed downloads directory"
else
  echo "No downloads directory found"
fi

echo "Cleanup complete!"
