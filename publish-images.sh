#!/bin/bash

# Starbunk Docker Image Publisher
# This script helps you publish Docker images to GitHub Container Registry

set -e

echo "🚀 Starbunk Docker Image Publisher"
echo "=================================="

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "   Install it from: https://cli.github.com/"
    echo "   Or use the GitHub web interface instead."
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository."
    exit 1
fi

# Check authentication
if ! gh auth status > /dev/null 2>&1; then
    echo "❌ Not authenticated with GitHub CLI."
    echo "   Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is ready"

# Show current options
echo ""
echo "📋 Publishing Options:"
echo "1. Publish ALL containers with 'latest' tag (production)"
echo "2. Publish specific containers"
echo "3. Publish with custom tag"
echo "4. Check existing images in registry"
echo "5. Exit"
echo ""

read -p "Choose an option (1-5): " choice

case $choice in
    1)
        echo "🏭 Publishing ALL containers with 'latest' tag..."
        gh workflow run "Manual Docker Build and Push" \
            --field containers=all \
            --field tag_prefix=release \
            --field push_to_registry=true
        
        echo "✅ Workflow triggered! Images will be published as:"
        echo "   - ghcr.io/andrewgari/starbunk-bunkbot:latest"
        echo "   - ghcr.io/andrewgari/starbunk-djcova:latest"
        echo "   - ghcr.io/andrewgari/starbunk-starbunk-dnd:latest"
        echo "   - ghcr.io/andrewgari/starbunk-covabot:latest"
        ;;
    2)
        echo "📦 Available containers: bunkbot, djcova, starbunk-dnd, covabot"
        read -p "Enter containers (comma-separated): " containers
        
        echo "🏷️  Tag options: dev, test, release (latest), custom"
        read -p "Enter tag prefix: " tag_prefix
        
        if [ "$tag_prefix" = "custom" ]; then
            read -p "Enter custom tag: " custom_tag
            gh workflow run "Manual Docker Build and Push" \
                --field containers="$containers" \
                --field tag_prefix=custom \
                --field custom_tag="$custom_tag" \
                --field push_to_registry=true
        else
            gh workflow run "Manual Docker Build and Push" \
                --field containers="$containers" \
                --field tag_prefix="$tag_prefix" \
                --field push_to_registry=true
        fi
        
        echo "✅ Workflow triggered for containers: $containers"
        ;;
    3)
        echo "📦 Available containers: bunkbot, djcova, starbunk-dnd, covabot, all"
        read -p "Enter containers: " containers
        read -p "Enter custom tag: " custom_tag
        
        gh workflow run "Manual Docker Build and Push" \
            --field containers="$containers" \
            --field tag_prefix=custom \
            --field custom_tag="$custom_tag" \
            --field push_to_registry=true
        
        echo "✅ Workflow triggered with custom tag: $custom_tag"
        ;;
    4)
        echo "🔍 Checking existing images..."
        echo ""
        echo "To check images manually:"
        echo "1. Go to: https://github.com/andrewgari?tab=packages"
        echo "2. Or use: docker pull ghcr.io/andrewgari/starbunk-bunkbot:latest"
        echo ""
        
        # Try to check if images exist
        images=(
            "ghcr.io/andrewgari/starbunk-bunkbot:latest"
            "ghcr.io/andrewgari/starbunk-djcova:latest"
            "ghcr.io/andrewgari/starbunk-starbunk-dnd:latest"
            "ghcr.io/andrewgari/starbunk-covabot:latest"
        )
        
        for image in "${images[@]}"; do
            echo -n "Checking $image... "
            if docker manifest inspect "$image" > /dev/null 2>&1; then
                echo "✅ EXISTS"
            else
                echo "❌ NOT FOUND"
            fi
        done
        ;;
    5)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "🔗 Monitor progress at:"
echo "   https://github.com/andrewgari/starbunk-js/actions"
echo ""
echo "⏱️  Build typically takes 5-10 minutes"
echo "📦 Images will be available at: https://github.com/andrewgari?tab=packages"
