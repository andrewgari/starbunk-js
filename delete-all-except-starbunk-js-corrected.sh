#!/bin/bash

# Delete All GHCR Container Images Except starbunk-js (CORRECTED VERSION)
# This script deletes ALL container packages except starbunk-js based on your actual GHCR packages
# 
# WILL DELETE COMPLETELY (based on your screenshot):
# - app
# - starbunk-dnd
# - starbunk-covabot  
# - starbunk/bunkbot
# - starbunk/djcova
# - starbunk/starbunk-dnd
# - starbunk/covabot
# - starbunk-starbunk-dnd
# - starbunk-djcova
# - starbunk-bunkbot
# - covabot
# - bunkbot
# - djcova
#
# WILL PRESERVE:
# - starbunk-js

set -e

# Configuration
OWNER="andrewgari"
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
            echo "Delete All GHCR Container Images Except starbunk-js (CORRECTED)"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --execute     Actually delete packages (default is dry-run)"
            echo "  --help        Show this help message"
            echo ""
            echo "WILL PRESERVE:"
            echo "  - ${PRESERVE_PACKAGE}"
            echo ""
            echo "WILL DELETE:"
            echo "  - ALL other container packages"
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
echo -e "${BLUE}🗑️  Delete All GHCR Images Except starbunk-js (CORRECTED)${NC}"
echo -e "${BLUE}=======================================================${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}🔍 DRY RUN MODE - No packages will be deleted${NC}"
    echo -e "${YELLOW}   Use --execute to actually delete packages${NC}"
else
    echo -e "${RED}⚠️  EXECUTION MODE - Packages will be PERMANENTLY deleted!${NC}"
fi

echo ""
echo -e "${CYAN}🛡️  PRESERVED PACKAGE: ${PRESERVE_PACKAGE}${NC}"
echo ""

# Function to get all packages for the user
get_all_packages() {
    local response=$(gh api "/users/${OWNER}/packages?package_type=container" --paginate 2>/dev/null || echo "[]")
    echo "$response"
}

# Function to delete all versions of a package
delete_package_completely() {
    local package_name=$1
    
    echo -e "${BLUE}📦 Processing package: ${package_name}${NC}"
    
    # URL encode the package name for API calls (handle slashes)
    local encoded_package_name=$(echo "$package_name" | sed 's|/|%2F|g')
    
    # Get all versions
    local versions=$(gh api "/users/${OWNER}/packages/container/${encoded_package_name}/versions" --paginate 2>/dev/null || echo "[]")
    
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
            if gh api -X DELETE "/users/${OWNER}/packages/container/${encoded_package_name}/versions/${version_id}" 2>/dev/null; then
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

echo -e "${YELLOW}🔧 Debug: API Response:${NC}"
echo "$all_packages" | head -5
echo ""

if [ "$all_packages" = "[]" ] || [ -z "$all_packages" ]; then
    echo -e "${YELLOW}⚠️  No container packages found${NC}"
    exit 0
fi

# Try to parse package names with better error handling
existing_packages=$(echo "$all_packages" | jq -r 'if type == "array" then .[].name else empty end' 2>/dev/null || echo "")

if [ -z "$existing_packages" ]; then
    echo -e "${RED}❌ Failed to parse package names from API response${NC}"
    echo -e "${YELLOW}Raw API response:${NC}"
    echo "$all_packages"
    exit 1
fi

echo -e "${CYAN}📦 Found packages:${NC}"
echo "$existing_packages" | while read -r pkg; do
    if [ -n "$pkg" ]; then
        echo "   - $pkg"
    fi
done
echo ""

# Check if preserved package exists
if echo "$existing_packages" | grep -q "^${PRESERVE_PACKAGE}$"; then
    echo -e "${GREEN}✅ Preserved package '${PRESERVE_PACKAGE}' found and will be kept${NC}"
else
    echo -e "${YELLOW}⚠️  Preserved package '${PRESERVE_PACKAGE}' not found${NC}"
fi
echo ""

# Process all packages except the preserved one
total_processed=0
total_deleted=0

echo -e "${RED}🎯 Packages targeted for deletion:${NC}"
while read -r package; do
    if [ "$package" != "$PRESERVE_PACKAGE" ]; then
        echo -e "${RED}   - ${package}${NC}"
        if [ "$DRY_RUN" = false ]; then
            delete_package_completely "$package"
            total_deleted=$((total_deleted + 1))
        fi
        total_processed=$((total_processed + 1))
    else
        echo -e "${GREEN}   - ${package} (PRESERVED)${NC}"
    fi
done <<< "$existing_packages"

echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}📋 DRY RUN SUMMARY:${NC}"
    echo -e "   Would delete: ${total_processed} packages"
    echo -e "   Would preserve: ${PRESERVE_PACKAGE}"
    echo ""
    echo -e "${YELLOW}🚨 This was a DRY RUN - no packages were actually deleted${NC}"
    echo -e "${YELLOW}   To execute the deletion, run: $0 --execute${NC}"
else
    # Final summary
    echo -e "${BLUE}🎉 DELETION SUMMARY${NC}"
    echo -e "${BLUE}===================${NC}"
    echo -e "📊 Packages processed: ${total_processed}"
    echo -e "🗑️  Packages deleted: ${total_deleted}"
    echo -e "🛡️  Packages preserved: ${PRESERVE_PACKAGE}"
    echo ""
    echo -e "${GREEN}✅ Deletion completed!${NC}"
fi

echo ""
echo -e "${CYAN}💡 To verify remaining packages, run:${NC}"
echo -e "   gh api /users/${OWNER}/packages?package_type=container"
