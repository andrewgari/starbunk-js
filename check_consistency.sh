#!/bin/bash

# Documentation and Configuration Consistency Checker

set -euo pipefail

echo "🔍 Checking container consistency across documentation and configuration files..."
echo ""

# Extract container names from different sources
echo "📋 Extracting container names from different sources:"

# From CLAUDE.md
claude_containers=$(grep -A 10 "4-container Discord bot" CLAUDE.md | grep -E "BunkBot|DJCova|Starbunk-DND|CovaBot" | sed 's/.*\*\*\(.*\)\*\*.*/\1/' | tr '[:upper:]' '[:lower:]' | sed 's/starbunk-dnd/starbunk-dnd/' | sort)
echo "  CLAUDE.md: $claude_containers"

# From PR validation workflow
workflow_containers=$(grep -o "bunkbot\|djcova\|starbunk-dnd\|covabot" .github/workflows/pr-validation.yml | sort | uniq | tr '\n' ' ')
echo "  Workflows: $workflow_containers"

# From GHCR cleanup config (excluding legacy snowbunk)
ghcr_containers=$(grep -A 100 "containers:" .github/ghcr-cleanup-config.yml | grep "name:" | awk '{print $3}' | grep -v "snowbunk" | sort | tr '\n' ' ')
echo "  GHCR config: $ghcr_containers"

# From path filters
path_containers=$(grep -E "^[a-z-]+:" .github/path-filters-optimized.yml | grep -E "bunkbot|djcova|starbunk-dnd|covabot" | cut -d: -f1 | sort | tr '\n' ' ')
echo "  Path filters: $path_containers"

echo ""
echo "🔗 Cross-referencing container names..."

# Check for consistency
consistent=true

# Convert to arrays for comparison
claude_array=($claude_containers)
workflow_array=($workflow_containers)
ghcr_array=($ghcr_containers)
path_array=($path_containers)

echo ""
echo "📊 Detailed comparison:"
echo "  CLAUDE.md containers: ${#claude_array[@]}"
echo "  Workflow containers: ${#workflow_array[@]}"
echo "  GHCR containers: ${#ghcr_array[@]}"
echo "  Path filter containers: ${#path_array[@]}"

# Check if all arrays have the same containers
if [ "${#claude_array[@]}" -eq "${#workflow_array[@]}" ] && \
   [ "${#workflow_array[@]}" -eq "${#ghcr_array[@]}" ] && \
   [ "${#ghcr_array[@]}" -eq "${#path_array[@]}" ]; then
    echo "✅ All sources have the same number of containers"
else
    echo "⚠️ Different number of containers across sources"
    consistent=false
fi

echo ""
echo "🔍 Checking documentation references..."

# Check for broken references or outdated information
if grep -q "snowbunk" CLAUDE.md; then
    echo "⚠️ Legacy 'snowbunk' reference found in CLAUDE.md"
    consistent=false
fi

# Check if all containers are documented
documented_containers="bunkbot djcova starbunk-dnd covabot"
for container in $documented_containers; do
    if grep -q "$container" CLAUDE.md; then
        echo "✅ $container is documented in CLAUDE.md"
    else
        echo "❌ $container is missing from CLAUDE.md"
        consistent=false
    fi
done

echo ""
echo "🏗️ Checking build system consistency..."

# Check if all containers have build scripts
for container in $documented_containers; do
    if grep -q "build:$container" package.json 2>/dev/null; then
        echo "✅ $container has build script"
    else
        echo "⚠️ $container may be missing build script"
    fi
done

echo ""
echo "📁 Checking container directories..."

for container in $documented_containers; do
    if [ -d "containers/$container" ]; then
        echo "✅ containers/$container directory exists"

        # Check for essential files
        if [ -f "containers/$container/package.json" ]; then
            echo "  ✅ package.json found"
        else
            echo "  ❌ package.json missing"
            consistent=false
        fi

        if [ -f "containers/$container/Dockerfile" ] || [ -f "containers/$container/Dockerfile.optimized" ]; then
            echo "  ✅ Dockerfile found"
        else
            echo "  ❌ Dockerfile missing"
            consistent=false
        fi

        if [ -d "containers/$container/src" ]; then
            echo "  ✅ src directory found"
        else
            echo "  ❌ src directory missing"
            consistent=false
        fi
    else
        echo "❌ containers/$container directory missing"
        consistent=false
    fi
done

echo ""
echo "📋 Summary:"
if $consistent; then
    echo "✅ Documentation and configuration are consistent"
    exit 0
else
    echo "⚠️ Inconsistencies found - please review and fix"
    exit 1
fi