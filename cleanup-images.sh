#!/bin/bash

# Container Image Cleanup Script for GitHub Container Registry
# Usage: ./cleanup-images.sh [options]
# 
# Options:
#   --dry-run     Show what would be deleted without actually deleting
#   --pr-only     Only delete PR snapshot images
#   --old-only    Only delete images older than 30 days
#   --all         Delete all versions except latest
#   --help        Show this help message

set -e

# Configuration
OWNER="andrewgari"
CONTAINERS=("bunkbot" "djcova" "starbunk-dnd" "covabot")
DRY_RUN=false
PR_ONLY=false
OLD_ONLY=false
DELETE_ALL=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --pr-only)
            PR_ONLY=true
            shift
            ;;
        --old-only)
            OLD_ONLY=true
            shift
            ;;
        --all)
            DELETE_ALL=true
            shift
            ;;
        --help)
            echo "Container Image Cleanup Script"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --dry-run     Show what would be deleted without actually deleting"
            echo "  --pr-only     Only delete PR snapshot images (pr-*-snapshot)"
            echo "  --old-only    Only delete images older than 30 days"
            echo "  --all         Delete all versions except latest"
            echo "  --help        Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --dry-run --pr-only    # Show PR snapshots that would be deleted"
            echo "  $0 --pr-only              # Delete all PR snapshot images"
            echo "  $0 --old-only             # Delete images older than 30 days"
            echo "  $0 --all --dry-run        # Show all non-latest images"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check if gh CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${BLUE}🧹 Container Image Cleanup Tool${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}🔍 DRY RUN MODE - No images will be deleted${NC}"
    echo ""
fi

# Function to get package versions
get_package_versions() {
    local container=$1
    gh api "/users/${OWNER}/packages/container/${container}/versions" --paginate
}

# Function to delete a package version
delete_package_version() {
    local container=$1
    local version_id=$2
    local tags=$3
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "  ${YELLOW}[DRY RUN]${NC} Would delete: ${container} version ${version_id} (tags: ${tags})"
    else
        echo -e "  ${RED}🗑️${NC} Deleting: ${container} version ${version_id} (tags: ${tags})"
        gh api -X DELETE "/users/${OWNER}/packages/container/${container}/versions/${version_id}"
    fi
}

# Function to check if image is older than N days
is_older_than_days() {
    local created_at=$1
    local days=$2
    local created_timestamp=$(date -d "$created_at" +%s)
    local cutoff_timestamp=$(date -d "${days} days ago" +%s)
    [ $created_timestamp -lt $cutoff_timestamp ]
}

# Main cleanup logic
for container in "${CONTAINERS[@]}"; do
    echo -e "${GREEN}📦 Processing container: ${container}${NC}"
    
    # Get all versions for this container
    versions=$(get_package_versions "$container" 2>/dev/null || echo "[]")
    
    if [ "$versions" = "[]" ]; then
        echo -e "  ${YELLOW}⚠️${NC} No versions found or package doesn't exist"
        continue
    fi
    
    # Parse versions and apply filters
    echo "$versions" | jq -r '.[] | @base64' | while IFS= read -r version_data; do
        version_json=$(echo "$version_data" | base64 -d)
        version_id=$(echo "$version_json" | jq -r '.id')
        created_at=$(echo "$version_json" | jq -r '.created_at')
        tags=$(echo "$version_json" | jq -r '.metadata.container.tags[]?' | tr '\n' ',' | sed 's/,$//')
        
        # Skip if no tags
        if [ -z "$tags" ]; then
            continue
        fi
        
        # Apply filters
        should_delete=false
        
        if [ "$PR_ONLY" = true ]; then
            # Only delete PR snapshot images
            if echo "$tags" | grep -q "pr-.*-snapshot"; then
                should_delete=true
            fi
        elif [ "$OLD_ONLY" = true ]; then
            # Only delete images older than 30 days (except latest)
            if ! echo "$tags" | grep -q "latest" && is_older_than_days "$created_at" 30; then
                should_delete=true
            fi
        elif [ "$DELETE_ALL" = true ]; then
            # Delete all except latest
            if ! echo "$tags" | grep -q "latest"; then
                should_delete=true
            fi
        fi
        
        if [ "$should_delete" = true ]; then
            delete_package_version "$container" "$version_id" "$tags"
        fi
    done
    
    echo ""
done

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}🔍 Dry run completed. Use without --dry-run to actually delete images.${NC}"
else
    echo -e "${GREEN}✅ Cleanup completed!${NC}"
fi
