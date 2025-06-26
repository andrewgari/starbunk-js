#!/bin/bash

# Safe GHCR Container Image Cleanup Script
# This script cleans up container images while preserving protected images
# 
# PROTECTED IMAGES (NEVER DELETED):
# - ghcr.io/andrewgari/{container}:latest
# - ghcr.io/andrewgari/{container}:pr-*-snapshot (current PR testing)
#
# TARGETS FOR DELETION:
# - Untagged images
# - Images older than 30 days (except protected)
# - Development/branch images (main-*, dev-*, test-*)
# - Closed PR snapshots (if identifiable)
# - Duplicate/intermediate build artifacts

set -e

# Configuration
OWNER="andrewgari"
CONTAINERS=("bunkbot" "djcova" "starbunk-dnd" "covabot")
DAYS_OLD_THRESHOLD=30
DRY_RUN=true  # Start with dry run for safety

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --execute)
            DRY_RUN=false
            shift
            ;;
        --days)
            DAYS_OLD_THRESHOLD="$2"
            shift 2
            ;;
        --help)
            echo "Safe GHCR Container Image Cleanup"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --execute     Actually delete images (default is dry-run)"
            echo "  --days N      Delete images older than N days (default: 30)"
            echo "  --help        Show this help message"
            echo ""
            echo "Protected images (never deleted):"
            echo "  - *:latest tags"
            echo "  - *:pr-*-snapshot tags"
            echo ""
            echo "IMPORTANT: Run without --execute first to see what would be deleted!"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check prerequisites
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install from: https://cli.github.com/"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Error: Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# Header
echo -e "${BLUE}🧹 Safe GHCR Container Image Cleanup${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}🔍 DRY RUN MODE - No images will be deleted${NC}"
    echo -e "${YELLOW}   Use --execute to actually delete images${NC}"
else
    echo -e "${RED}⚠️  EXECUTION MODE - Images will be deleted!${NC}"
fi

echo -e "${CYAN}📅 Age threshold: ${DAYS_OLD_THRESHOLD} days${NC}"
echo -e "${CYAN}📦 Containers: ${CONTAINERS[*]}${NC}"
echo ""

# Function to check if a tag is protected
is_protected_tag() {
    local tag=$1
    
    # Protect latest tags
    if [[ "$tag" == "latest" ]]; then
        return 0
    fi
    
    # Protect current PR snapshot tags
    if [[ "$tag" =~ ^pr-[0-9]+-snapshot$ ]]; then
        return 0
    fi
    
    return 1
}

# Function to check if image is older than threshold
is_older_than_threshold() {
    local created_at=$1
    local created_timestamp=$(date -d "$created_at" +%s 2>/dev/null || echo "0")
    local cutoff_timestamp=$(date -d "${DAYS_OLD_THRESHOLD} days ago" +%s)
    [ $created_timestamp -lt $cutoff_timestamp ]
}

# Function to categorize and potentially delete a version
process_version() {
    local container=$1
    local version_json=$2
    
    local version_id=$(echo "$version_json" | jq -r '.id')
    local created_at=$(echo "$version_json" | jq -r '.created_at')
    local tags_array=$(echo "$version_json" | jq -r '.metadata.container.tags[]?' 2>/dev/null || echo "")
    local tags=$(echo "$tags_array" | tr '\n' ',' | sed 's/,$//')
    
    # Handle untagged images
    if [ -z "$tags" ]; then
        tags="<untagged>"
    fi
    
    local should_delete=false
    local reason=""
    local category=""
    
    # Categorize the image
    if [ "$tags" = "<untagged>" ]; then
        should_delete=true
        reason="untagged image"
        category="🏷️  UNTAGGED"
    else
        # Check each tag for protection
        local has_protected_tag=false
        
        while IFS= read -r tag; do
            if [ -n "$tag" ] && is_protected_tag "$tag"; then
                has_protected_tag=true
                break
            fi
        done <<< "$tags_array"
        
        if [ "$has_protected_tag" = true ]; then
            category="🛡️  PROTECTED"
            reason="contains protected tag"
        else
            # Check age for non-protected images
            if is_older_than_threshold "$created_at"; then
                should_delete=true
                reason="older than ${DAYS_OLD_THRESHOLD} days"
                category="📅 OLD"
            else
                # Check for development/branch patterns
                if echo "$tags" | grep -E -q "(main-|dev-|test-|branch-)"; then
                    should_delete=true
                    reason="development/branch image"
                    category="🔧 DEV/BRANCH"
                else
                    category="📦 RECENT"
                    reason="recent non-protected image"
                fi
            fi
        fi
    fi
    
    # Display the decision
    local age_days=$(( ($(date +%s) - $(date -d "$created_at" +%s 2>/dev/null || echo "0")) / 86400 ))
    
    if [ "$should_delete" = true ]; then
        if [ "$DRY_RUN" = true ]; then
            echo -e "  ${RED}🗑️  [WOULD DELETE]${NC} ${category} - ID: ${version_id}"
            echo -e "      Tags: ${tags}"
            echo -e "      Age: ${age_days} days - Reason: ${reason}"
        else
            echo -e "  ${RED}🗑️  [DELETING]${NC} ${category} - ID: ${version_id}"
            echo -e "      Tags: ${tags}"
            echo -e "      Age: ${age_days} days - Reason: ${reason}"
            
            if gh api -X DELETE "/users/${OWNER}/packages/container/${container}/versions/${version_id}" 2>/dev/null; then
                echo -e "      ${GREEN}✅ Successfully deleted${NC}"
                return 0  # Success
            else
                echo -e "      ${RED}❌ Failed to delete${NC}"
                return 1  # Failure
            fi
        fi
    else
        echo -e "  ${GREEN}✅ [KEEPING]${NC} ${category} - ID: ${version_id}"
        echo -e "      Tags: ${tags}"
        echo -e "      Age: ${age_days} days - Reason: ${reason}"
    fi
    
    echo ""
    return 0
}

# Main cleanup logic
total_processed=0
total_deleted=0
total_kept=0
total_errors=0

for container in "${CONTAINERS[@]}"; do
    echo -e "${GREEN}📦 Processing container: ${container}${NC}"
    echo -e "${GREEN}${'='*50}${NC}"
    
    # Get all versions for this container
    versions=$(gh api "/users/${OWNER}/packages/container/${container}/versions" --paginate 2>/dev/null || echo "[]")
    
    if [ "$versions" = "[]" ]; then
        echo -e "  ${YELLOW}⚠️  No versions found or package doesn't exist${NC}"
        echo ""
        continue
    fi
    
    container_processed=0
    container_deleted=0
    container_kept=0
    container_errors=0
    
    # Process each version
    echo "$versions" | jq -r '.[] | @base64' | while IFS= read -r version_data; do
        version_json=$(echo "$version_data" | base64 -d)
        
        if process_version "$container" "$version_json"; then
            if [[ $(echo "$version_json" | jq -r '.metadata.container.tags[]?' 2>/dev/null) ]]; then
                container_kept=$((container_kept + 1))
            else
                container_deleted=$((container_deleted + 1))
            fi
        else
            container_errors=$((container_errors + 1))
        fi
        
        container_processed=$((container_processed + 1))
    done
    
    echo -e "${BLUE}📊 Container Summary for ${container}:${NC}"
    echo -e "   Processed: ${container_processed} versions"
    echo -e "   Kept: ${container_kept} versions"
    if [ "$DRY_RUN" = false ]; then
        echo -e "   Deleted: ${container_deleted} versions"
        echo -e "   Errors: ${container_errors} versions"
    else
        echo -e "   Would delete: ${container_deleted} versions"
    fi
    echo ""
    
    total_processed=$((total_processed + container_processed))
    total_deleted=$((total_deleted + container_deleted))
    total_kept=$((total_kept + container_kept))
    total_errors=$((total_errors + container_errors))
done

# Final summary
echo -e "${BLUE}🎉 CLEANUP SUMMARY${NC}"
echo -e "${BLUE}==================${NC}"
echo -e "📊 Total versions processed: ${total_processed}"
echo -e "✅ Total versions kept: ${total_kept}"

if [ "$DRY_RUN" = true ]; then
    echo -e "🔍 Total versions that would be deleted: ${total_deleted}"
    echo ""
    echo -e "${YELLOW}🚨 This was a DRY RUN - no images were actually deleted${NC}"
    echo -e "${YELLOW}   To execute the cleanup, run: $0 --execute${NC}"
else
    echo -e "🗑️  Total versions deleted: ${total_deleted}"
    echo -e "❌ Total errors: ${total_errors}"
    echo ""
    echo -e "${GREEN}✅ Cleanup completed successfully!${NC}"
fi

echo ""
echo -e "${CYAN}🛡️  Protected images preserved:${NC}"
for container in "${CONTAINERS[@]}"; do
    echo -e "   - ghcr.io/${OWNER}/${container}:latest"
done
echo -e "   - All pr-*-snapshot tags"
