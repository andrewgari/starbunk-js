#!/bin/bash

# PR Docker Images Management Script
# Helps manage PR images with the new predictable naming convention

set -e

echo "🔧 PR Docker Images Management"
echo "=============================="

# Function to check if a PR image exists
check_pr_image() {
    local container=$1
    local pr_number=$2
    local image="ghcr.io/andrewgari/${container}:pr-${pr_number}-snapshot"
    
    echo -n "Checking ${container} PR ${pr_number}... "
    if docker manifest inspect "$image" > /dev/null 2>&1; then
        echo "✅ EXISTS"
        return 0
    else
        echo "❌ NOT FOUND"
        return 1
    fi
}

# Function to pull a PR image
pull_pr_image() {
    local container=$1
    local pr_number=$2
    local image="ghcr.io/andrewgari/${container}:pr-${pr_number}-snapshot"
    
    echo "📥 Pulling ${image}..."
    if docker pull "$image"; then
        echo "✅ Successfully pulled ${image}"
    else
        echo "❌ Failed to pull ${image}"
        return 1
    fi
}

# Function to list all PR images for a container
list_pr_images() {
    local container=$1
    echo "🔍 Listing PR images for ${container}..."
    
    # This would require GitHub CLI or API access
    # For now, we'll show the expected naming pattern
    echo "Expected naming pattern: ghcr.io/andrewgari/${container}:pr-{number}-snapshot"
    echo "Use GitHub web interface to see actual images:"
    echo "https://github.com/andrewgari/starbunk-js/pkgs/container/starbunk%2F${container}"
}

# Function to test a PR image with docker-compose
test_pr_image() {
    local container=$1
    local pr_number=$2
    
    echo "🧪 Testing PR ${pr_number} image for ${container}..."
    
    # Create a temporary docker-compose override
    cat > docker-compose.pr-test.yml << EOF
version: '3.8'
services:
  ${container}:
    image: ghcr.io/andrewgari/${container}:pr-${pr_number}-snapshot
EOF

    echo "Created docker-compose.pr-test.yml for testing"
    echo "To test, run: docker-compose -f docker-compose.yml -f docker-compose.pr-test.yml up ${container}"
}

# Main menu
echo ""
echo "📋 Available Actions:"
echo "1. Check if PR image exists"
echo "2. Pull PR image"
echo "3. List PR images for container"
echo "4. Create test docker-compose override"
echo "5. Check all containers for a PR"
echo "6. Pull all containers for a PR"
echo "7. Exit"
echo ""

read -p "Choose an action (1-7): " choice

case $choice in
    1)
        echo "📦 Available containers: bunkbot, djcova, starbunk-dnd, covabot"
        read -p "Enter container name: " container
        read -p "Enter PR number: " pr_number
        check_pr_image "$container" "$pr_number"
        ;;
    2)
        echo "📦 Available containers: bunkbot, djcova, starbunk-dnd, covabot"
        read -p "Enter container name: " container
        read -p "Enter PR number: " pr_number
        pull_pr_image "$container" "$pr_number"
        ;;
    3)
        echo "📦 Available containers: bunkbot, djcova, starbunk-dnd, covabot"
        read -p "Enter container name: " container
        list_pr_images "$container"
        ;;
    4)
        echo "📦 Available containers: bunkbot, djcova, starbunk-dnd, covabot"
        read -p "Enter container name: " container
        read -p "Enter PR number: " pr_number
        test_pr_image "$container" "$pr_number"
        ;;
    5)
        read -p "Enter PR number: " pr_number
        echo "🔍 Checking all containers for PR ${pr_number}..."
        containers=("bunkbot" "djcova" "starbunk-dnd" "covabot")
        for container in "${containers[@]}"; do
            check_pr_image "$container" "$pr_number"
        done
        ;;
    6)
        read -p "Enter PR number: " pr_number
        echo "📥 Pulling all containers for PR ${pr_number}..."
        containers=("bunkbot" "djcova" "starbunk-dnd" "covabot")
        for container in "${containers[@]}"; do
            pull_pr_image "$container" "$pr_number" || echo "⚠️ Continuing with next container..."
        done
        ;;
    7)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "🔗 Useful Links:"
echo "   GitHub Packages: https://github.com/andrewgari?tab=packages"
echo "   Actions: https://github.com/andrewgari/starbunk-js/actions"
echo ""
echo "💡 PR Image Naming Convention:"
echo "   Format: ghcr.io/andrewgari/{container}:pr-{number}-snapshot"
echo "   Example: ghcr.io/andrewgari/bunkbot:pr-123-snapshot"
