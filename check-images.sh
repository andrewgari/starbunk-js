#!/bin/bash

# Check if Starbunk Docker images exist in GHCR

echo "🔍 Checking Starbunk Docker Images in GHCR..."
echo "============================================="

images=(
    "ghcr.io/andrewgari/starbunk/bunkbot:latest"
    "ghcr.io/andrewgari/starbunk/djcova:latest"
    "ghcr.io/andrewgari/starbunk/starbunk-dnd:latest"
    "ghcr.io/andrewgari/starbunk/covabot:latest"
)

all_exist=true

for image in "${images[@]}"; do
    echo -n "Checking $image... "
    if docker manifest inspect "$image" > /dev/null 2>&1; then
        echo "✅ EXISTS"
    else
        echo "❌ NOT FOUND"
        all_exist=false
    fi
done

echo ""
if [ "$all_exist" = true ]; then
    echo "🎉 All images exist! You can run:"
    echo "   ./start-production.sh"
    echo ""
    echo "Or manually:"
    echo "   docker-compose pull"
    echo "   docker-compose up -d"
else
    echo "⚠️  Some images are missing. You need to publish them first:"
    echo "   ./publish-images.sh"
    echo ""
    echo "Or trigger manually via GitHub Actions:"
    echo "   https://github.com/andrewgari/starbunk-js/actions"
fi

echo ""
echo "📦 View all packages: https://github.com/andrewgari?tab=packages"
