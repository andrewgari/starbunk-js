#!/bin/bash

# Manual GitHub CLI Commands to Delete All Packages Except starbunk-js
# Based on your screenshot showing 14 packages
# 
# IMPORTANT: Run these commands one by one on your local machine
# where you have GitHub CLI installed and authenticated

echo "🗑️  Manual Deletion Commands for GHCR Packages"
echo "=============================================="
echo ""
echo "⚠️  WARNING: These commands will PERMANENTLY delete packages!"
echo "⚠️  Make sure you want to delete these before running!"
echo ""
echo "✅ PRESERVED: starbunk-js (DO NOT DELETE)"
echo ""
echo "❌ TO DELETE (copy and paste these commands):"
echo ""

# List of packages to delete based on your screenshot
packages_to_delete=(
    "app"
    "starbunk-dnd"
    "starbunk-covabot"
    "starbunk/bunkbot"
    "starbunk/djcova"
    "starbunk/starbunk-dnd"
    "starbunk/covabot"
    "starbunk-starbunk-dnd"
    "starbunk-djcova"
    "starbunk-bunkbot"
    "covabot"
    "bunkbot"
    "djcova"
)

echo "# First, list all your packages to verify:"
echo "gh api /users/andrewgari/packages?package_type=container"
echo ""

echo "# Then delete each package (run these one by one):"
for package in "${packages_to_delete[@]}"; do
    # URL encode package name for API calls
    encoded_package=$(echo "$package" | sed 's|/|%2F|g')
    
    echo ""
    echo "# Delete package: $package"
    echo "echo 'Deleting package: $package'"
    
    # Get all versions first
    echo "versions=\$(gh api \"/users/andrewgari/packages/container/${encoded_package}/versions\" --paginate)"
    
    # Delete each version
    echo "echo \"\$versions\" | jq -r '.[].id' | while read version_id; do"
    echo "  echo \"  Deleting version: \$version_id\""
    echo "  gh api -X DELETE \"/users/andrewgari/packages/container/${encoded_package}/versions/\$version_id\""
    echo "done"
done

echo ""
echo ""
echo "🔧 Alternative: One-liner to delete all packages except starbunk-js"
echo "=================================================================="
echo ""
echo "# Get all packages and delete everything except starbunk-js:"
echo 'gh api /users/andrewgari/packages?package_type=container | jq -r ".[].name" | grep -v "^starbunk-js$" | while read package; do'
echo '  echo "Deleting package: $package"'
echo '  encoded_package=$(echo "$package" | sed "s|/|%2F|g")'
echo '  gh api "/users/andrewgari/packages/container/${encoded_package}/versions" --paginate | jq -r ".[].id" | while read version_id; do'
echo '    echo "  Deleting version: $version_id"'
echo '    gh api -X DELETE "/users/andrewgari/packages/container/${encoded_package}/versions/$version_id"'
echo '  done'
echo 'done'

echo ""
echo ""
echo "🚨 SAFETY CHECKS:"
echo "================"
echo ""
echo "1. First run this to see what packages you have:"
echo "   gh api /users/andrewgari/packages?package_type=container | jq -r '.[].name'"
echo ""
echo "2. Verify starbunk-js is in the list and will be preserved"
echo ""
echo "3. Run the deletion commands above"
echo ""
echo "4. Verify only starbunk-js remains:"
echo "   gh api /users/andrewgari/packages?package_type=container | jq -r '.[].name'"
echo ""
echo "✅ Expected final result: Only 'starbunk-js' should remain"
