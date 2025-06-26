#!/bin/bash

# Quick PR Snapshot Cleanup Script
# This script specifically targets PR snapshot images for cleanup
# Usage: ./cleanup-pr-images.sh [PR_NUMBER]

set -e

OWNER="andrewgari"
CONTAINERS=("bunkbot" "djcova" "starbunk-dnd" "covabot")
PR_NUMBER=$1

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧹 PR Snapshot Image Cleanup${NC}"
echo -e "${BLUE}=============================${NC}"

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install from: https://cli.github.com/"
    exit 1
fi

if [ -n "$PR_NUMBER" ]; then
    echo -e "${YELLOW}🎯 Targeting specific PR: #${PR_NUMBER}${NC}"
    TAG_PATTERN="pr-${PR_NUMBER}-snapshot"
else
    echo -e "${YELLOW}🎯 Targeting all PR snapshot images${NC}"
    TAG_PATTERN="pr-.*-snapshot"
fi

echo ""

for container in "${CONTAINERS[@]}"; do
    echo -e "${GREEN}📦 Cleaning ${container}...${NC}"
    
    # Get all versions
    versions=$(gh api "/users/${OWNER}/packages/container/${container}/versions" --paginate 2>/dev/null || echo "[]")
    
    if [ "$versions" = "[]" ]; then
        echo -e "  ${YELLOW}⚠️ No versions found${NC}"
        continue
    fi
    
    deleted_count=0
    
    # Process each version
    echo "$versions" | jq -r '.[] | @base64' | while IFS= read -r version_data; do
        version_json=$(echo "$version_data" | base64 -d)
        version_id=$(echo "$version_json" | jq -r '.id')
        tags=$(echo "$version_json" | jq -r '.metadata.container.tags[]?' | tr '\n' ',' | sed 's/,$//')
        
        if [ -z "$tags" ]; then
            continue
        fi
        
        # Check if this version matches our PR pattern
        if echo "$tags" | grep -E -q "$TAG_PATTERN"; then
            echo -e "  ${RED}🗑️ Deleting version with tags: ${tags}${NC}"
            gh api -X DELETE "/users/${OWNER}/packages/container/${container}/versions/${version_id}"
            ((deleted_count++))
        fi
    done
    
    if [ $deleted_count -eq 0 ]; then
        echo -e "  ${YELLOW}ℹ️ No PR snapshots found to delete${NC}"
    else
        echo -e "  ${GREEN}✅ Deleted ${deleted_count} PR snapshot(s)${NC}"
    fi
    
    echo ""
done

echo -e "${GREEN}🎉 PR snapshot cleanup completed!${NC}"
