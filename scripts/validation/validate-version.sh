#!/bin/bash

# Semantic Version Validation Script
# Validates that a VERSION file contains a valid semantic version and is greater than a base version
#
# Usage: validate-version.sh [BASE_VERSION_GIT_SPEC]
#   BASE_VERSION_GIT_SPEC: Optional git spec to read base version from (e.g., origin/main:VERSION, HEAD~1:VERSION)
#                          If not provided or file doesn't exist, defaults to 0.0.0

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly VERSION_FILE="$PROJECT_ROOT/VERSION"

# Parse arguments
readonly BASE_VERSION_SPEC="${1:-}"

# Read current version from working tree
if [ ! -f "$VERSION_FILE" ]; then
    echo "❌ ERROR: VERSION file not found at $VERSION_FILE"
    exit 1
fi

NEW_VERSION=$(cat "$VERSION_FILE" | tr -d '\n')

# Read base version from git spec or use default
if [ -z "$BASE_VERSION_SPEC" ]; then
    BASE_VERSION="0.0.0"
    echo "Using default base version: $BASE_VERSION"
else
    BASE_VERSION=$(git show "$BASE_VERSION_SPEC" 2>/dev/null | tr -d '\n' || echo "0.0.0")
    echo "Base version from $BASE_VERSION_SPEC: $BASE_VERSION"
fi

echo "New version: $NEW_VERSION"

# Validate version format: strict MAJOR.MINOR.PATCH (semantic versioning)
SEMVER_REGEX='^[0-9]+\.[0-9]+\.[0-9]+$'

if ! [[ "$NEW_VERSION" =~ $SEMVER_REGEX ]]; then
    echo "❌ ERROR: Version must be in MAJOR.MINOR.PATCH format (e.g., 1.2.3)"
    echo "   Found: $NEW_VERSION"
    exit 1
fi

if ! [[ "$BASE_VERSION" =~ $SEMVER_REGEX ]]; then
    echo "❌ ERROR: Base version must be in MAJOR.MINOR.PATCH format (e.g., 1.2.3)"
    echo "   Found: $BASE_VERSION"
    exit 1
fi

# Parse versions into components
IFS='.' read -r base_major base_minor base_patch <<< "$BASE_VERSION"
IFS='.' read -r new_major new_minor new_patch <<< "$NEW_VERSION"

# Compare versions: NEW_VERSION must be strictly greater than BASE_VERSION
if [ "$new_major" -lt "$base_major" ]; then
    echo "❌ ERROR: Version cannot decrease (major version)"
    echo "   Base: $BASE_VERSION, New: $NEW_VERSION"
    exit 1
elif [ "$new_major" -eq "$base_major" ]; then
    if [ "$new_minor" -lt "$base_minor" ]; then
        echo "❌ ERROR: Version cannot decrease (minor version)"
        echo "   Base: $BASE_VERSION, New: $NEW_VERSION"
        exit 1
    elif [ "$new_minor" -eq "$base_minor" ]; then
        if [ "$new_patch" -le "$base_patch" ]; then
            echo "❌ ERROR: Version must be greater than base version (patch version)"
            echo "   Base: $BASE_VERSION, New: $NEW_VERSION"
            exit 1
        fi
    fi
fi

echo "✅ Version properly incremented from $BASE_VERSION to $NEW_VERSION"
exit 0
