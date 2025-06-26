#!/bin/bash

# Delete All GHCR Container Images Except starbunk-js
# This script deletes ALL versions of ALL container packages except starbunk-js
# 
# WILL DELETE COMPLETELY:
# - ghcr.io/andrewgari/bunkbot (all versions)
# - ghcr.io/andrewgari/djcova (all versions)
# - ghcr.io/andrewgari/starbunk-dnd (all versions)
# - ghcr.io/andrewgari/covabot (all versions)
#
# WILL PRESERVE:
# - ghcr.io/andrewgari/starbunk-js (all versions)
# - Any other packages not in the deletion list

set -e

# Configuration
OWNER="andrewgari"
PACKAGES_TO_DELETE=("bunkbot*" "djcova*" "starbunk-dnd*" "covabot*", "starbunk/*", "app(")
PRESERVE_PACKAGE="starbunk-js"
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
        --help)
            echo "Delete All GHCR Container Images Except starbunk-js"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --execute     Actually delete packages (default is dry-run)"
            echo "  --help        Show this help message"
            echo ""
            echo "WILL DELETE COMPLETELY:"
            for pkg in "${PACKAGES_TO_DELETE[@]}"; do
                echo "  - ghcr.io/${OWNER}/${pkg} (all versions)"
            done
            echo ""
            echo "WILL PRESERVE:"
            echo "  - ghcr.io/${OWNER}/${PRESERVE_PACKAGE} (all versions)"
            echo ""
            echo "⚠️  WARNING: This deletes ENTIRE packages, not just old versions!"
            echo "⚠️  This includes production 'latest' tags!"
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
echo -e "${BLUE}🗑️  Delete All GHCR Images Except starbunk-js${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}🔍 DRY RUN MODE - No packages will be deleted${NC}"
    echo -e "${YELLOW}   Use --execute to actually delete packages${NC}"
else
    echo -e "${RED}⚠️  EXECUTION MODE - Packages will be PERMANENTLY deleted!${NC}"
fi

echo ""
echo -e "${CYAN}🛡️  PRESERVED PACKAGE: ${PRESERVE_PACKAGE}${NC}"
echo -e "${CYAN}🗑️  PACKAGES TO DELETE: ${PACKAGES_TO_DELETE[*]}${NC}"
echo ""

# Function to get all packages for the user
get_all_packages() {
    gh api "/users/${OWNER}/packages?package_type=container" --paginate 2>/dev/null || echo "[]"
}

# Function to delete all versions of a package
delete_package_completely() {
    local package_name=$1
    
    echo -e "${BLUE}📦 Processing package: ${package_name}${NC}"
    
    # Get all versions
    local versions=$(gh api "/users/${OWNER}/packages/container/${package_name}/versions" --paginate 2>/dev/null || echo "[]")
    
    if [ "$versions" = "[]" ]; then
        echo -e "  ${YELLOW}⚠️  No versions found or package doesn't exist${NC}"
        return 0
    fi
    
    local version_count=$(echo "$versions" | jq length)
    echo -e "  📊 Found ${version_count} version(s) to delete"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "  ${YELLOW}🔍 [DRY RUN] Would delete all ${version_count} versions${NC}"
        
        # Show what versions would be deleted
        echo "$versions" | jq -r '.[] | "    - Version ID: \(.id) | Tags: \(.metadata.container.tags // [] | join(", ")) | Created: \(.created_at)"'
    else
        echo -e "  ${RED}🗑️  [DELETING] All ${version_count} versions${NC}"
        
        local deleted_count=0
        local error_count=0
        
        # Delete each version
        echo "$versions" | jq -r '.[].id' | while read -r version_id; do
            if gh api -X DELETE "/users/${OWNER}/packages/container/${package_name}/versions/${version_id}" 2>/dev/null; then
                echo -e "    ${GREEN}✅ Deleted version: ${version_id}${NC}"
                deleted_count=$((deleted_count + 1))
            else
                echo -e "    ${RED}❌ Failed to delete version: ${version_id}${NC}"
                error_count=$((error_count + 1))
            fi
        done
        
        echo -e "  ${GREEN}📊 Deletion summary: ${deleted_count} deleted, ${error_count} errors${NC}"
    fi
    
    echo ""
}

# Get all existing packages
echo -e "${BLUE}🔍 Discovering existing packages...${NC}"
all_packages=$(get_all_packages)

if [ "$all_packages" = "[]" ]; then
    echo -e "${YELLOW}⚠️  No container packages found${NC}"
    exit 0
fi

existing_packages=$(echo "$all_packages" | jq -r '.[].name')
echo -e "${CYAN}📦 Found packages: $(echo "$existing_packages" | tr '\n' ' ')${NC}"
echo ""

# Check if preserved package exists
if echo "$existing_packages" | grep -q "^${PRESERVE_PACKAGE}$"; then
    echo -e "${GREEN}✅ Preserved package '${PRESERVE_PACKAGE}' found and will be kept${NC}"
else
    echo -e "${YELLOW}⚠️  Preserved package '${PRESERVE_PACKAGE}' not found (nothing to preserve)${NC}"
fi
echo ""

# Process packages to delete
total_processed=0
total_found=0

for package in "${PACKAGES_TO_DELETE[@]}"; do
    if echo "$existing_packages" | grep -q "^${package}$"; then
        echo -e "${RED}🎯 Target found: ${package}${NC}"
        delete_package_completely "$package"
        total_found=$((total_found + 1))
    else
        echo -e "${YELLOW}⚠️  Package not found: ${package} (already deleted or never existed)${NC}"
        echo ""
    fi
    total_processed=$((total_processed + 1))
done

# Final summary
echo -e "${BLUE}🎉 DELETION SUMMARY${NC}"
echo -e "${BLUE}===================${NC}"
echo -e "📊 Packages processed: ${total_processed}"
echo -e "📦 Packages found: ${total_found}"
echo -e "🛡️  Packages preserved: ${PRESERVE_PACKAGE}"

if [ "$DRY_RUN" = true ]; then
    echo ""
    echo -e "${YELLOW}🚨 This was a DRY RUN - no packages were actually deleted${NC}"
    echo -e "${YELLOW}   To execute the deletion, run: $0 --execute${NC}"
    echo ""
    echo -e "${RED}⚠️  WARNING: --execute will PERMANENTLY delete these packages:${NC}"
    for package in "${PACKAGES_TO_DELETE[@]}"; do
        if echo "$existing_packages" | grep -q "^${package}$"; then
            echo -e "${RED}   - ghcr.io/${OWNER}/${package} (ALL VERSIONS INCLUDING LATEST)${NC}"
        fi
    done
else
    echo ""
    echo -e "${GREEN}✅ Deletion completed!${NC}"
    echo ""
    echo -e "${CYAN}🛡️  Preserved packages:${NC}"
    echo -e "   - ghcr.io/${OWNER}/${PRESERVE_PACKAGE} (if it existed)"
fi

echo ""
echo -e "${CYAN}💡 To verify remaining packages, run:${NC}"
echo -e "   gh api /users/${OWNER}/packages?package_type=container"
