#!/bin/bash
# Per-app semantic version bumper for starbunk-js monorepo
#
# Determines and applies independent semver bumps per container app based on
# conventional commits since each app's last git release tag.
#
# Rules:
#   - Each app tracks its own version in src/<app>/VERSION
#   - Git tags are per-app prefixed: bunkbot-v1.2.3, djcova-v1.2.3, etc.
#   - Breaking commits  → major bump
#   - feat commits      → minor bump
#   - fix/hotfix/perf   → patch bump
#   - Any change to src/shared → at minimum a minor bump on all apps
#
# Outputs:
#   - Updated src/<app>/VERSION files
#   - Updated src/<app>/package.json versions
#   - .version-bumps.json  e.g. {"bunkbot":"1.31.0","djcova":"1.30.2"}

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APPS=(bunkbot djcova covabot bluebot)
declare -A NEW_VERSIONS

# ─── Helpers ───────────────────────────────────────────────────────────────────

bump_version() {
  local VERSION="$1" BUMP="$2"
  IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"
  case "$BUMP" in
    major) echo "$((MAJOR+1)).0.0" ;;
    minor) echo "${MAJOR}.$((MINOR+1)).0" ;;
    patch) echo "${MAJOR}.${MINOR}.$((PATCH+1))" ;;
    *)     echo "$VERSION" ;;
  esac
}

# Determine the highest bump type from a newline-separated list of full commit
# messages (use --format="%B" so BREAKING CHANGE footers are included).
# Prints: major | minor | patch | none
analyze_commits() {
  local COMMITS="$1"
  local BUMP="none"
  while IFS= read -r msg; do
    [[ -z "$msg" ]] && continue
    # BREAKING CHANGE footer or <type>!: breaking indicator → major (short-circuit)
    if echo "$msg" | grep -qE 'BREAKING[[:space:]]CHANGE' \
      || echo "$msg" | grep -qE '^[a-zA-Z]+(\([^()]*\))?!:'; then
      echo "major"; return
    fi
    # feat → minor
    if echo "$msg" | grep -qE '^feat(\([^()]*\))?:' && [[ "$BUMP" != "major" ]]; then
      BUMP="minor"
    fi
    # fix / hotfix / perf → patch (only if nothing higher yet)
    if echo "$msg" | grep -qE '^(fix|hotfix|perf)(\([^()]*\))?:' && [[ "$BUMP" == "none" ]]; then
      BUMP="patch"
    fi
  done <<< "$COMMITS"
  echo "$BUMP"
}

# Return the higher of two bump levels.
max_bump() {
  local A="$1" B="$2"
  for level in major minor patch; do
    [[ "$A" == "$level" || "$B" == "$level" ]] && echo "$level" && return
  done
  echo "none"
}

update_package_json() {
  local FILE="$1" VERSION="$2"
  node -e "
    const fs = require('fs');
    const d = JSON.parse(fs.readFileSync('${FILE}', 'utf8'));
    d.version = '${VERSION}';
    fs.writeFileSync('${FILE}', JSON.stringify(d, null, 2) + '\n');
  "
}

# ─── Shared analysis ───────────────────────────────────────────────────────────

SHARED_LAST_TAG=$(git tag -l "shared-v*" --sort=-v:refname 2>/dev/null | head -1)
if [[ -n "$SHARED_LAST_TAG" ]]; then
  SHARED_COMMITS=$(git log "${SHARED_LAST_TAG}..HEAD" --format="%B" -- src/shared/ 2>/dev/null || true)
else
  # First run: look at the last 30 shared commits as a baseline
  SHARED_COMMITS=$(git log --format="%B" -- src/shared/ 2>/dev/null | head -100 || true)
fi

SHARED_BUMP=$(analyze_commits "$SHARED_COMMITS")
SHARED_CURRENT=$(cat src/shared/VERSION 2>/dev/null || echo "1.0.0")
echo "shared: ${SHARED_CURRENT} (bump=${SHARED_BUMP})"

if [[ "$SHARED_BUMP" != "none" ]]; then
  SHARED_NEW=$(bump_version "$SHARED_CURRENT" "$SHARED_BUMP")
  echo "$SHARED_NEW" > src/shared/VERSION
  update_package_json src/shared/package.json "$SHARED_NEW"
  NEW_VERSIONS[shared]="$SHARED_NEW"
  echo "  → shared bumped to ${SHARED_NEW}"
fi

# SHARED_CHANGED is true whenever ANY commits touched src/shared (regardless of
# commit type) — chore:/docs:/style: changes to shared still require all apps
# to rebuild against the new shared code, so they all get at minimum a minor bump.
SHARED_CHANGED=false
if [[ -n "$(echo "$SHARED_COMMITS" | tr -d '[:space:]')" ]]; then
  SHARED_CHANGED=true
fi

# ─── Per-app analysis ──────────────────────────────────────────────────────────

for APP in "${APPS[@]}"; do
  CURRENT=$(cat "src/${APP}/VERSION" 2>/dev/null || echo "1.0.0")
  LAST_TAG=$(git tag -l "${APP}-v*" --sort=-v:refname 2>/dev/null | head -1)

  if [[ -n "$LAST_TAG" ]]; then
    APP_COMMITS=$(git log "${LAST_TAG}..HEAD" --format="%B" -- "src/${APP}/" 2>/dev/null || true)
  else
    # First run: look at the last 30 app-specific commits as a baseline
    APP_COMMITS=$(git log --format="%B" -- "src/${APP}/" 2>/dev/null | head -100 || true)
  fi

  APP_BUMP=$(analyze_commits "$APP_COMMITS")

  # Any shared change forces at minimum a minor bump
  if [[ "$SHARED_CHANGED" == "true" ]]; then
    APP_BUMP=$(max_bump "$APP_BUMP" "minor")
  fi

  echo "${APP}: ${CURRENT} (bump=${APP_BUMP})"

  if [[ "$APP_BUMP" != "none" ]]; then
    NEW=$(bump_version "$CURRENT" "$APP_BUMP")
    echo "$NEW" > "src/${APP}/VERSION"
    update_package_json "src/${APP}/package.json" "$NEW"
    NEW_VERSIONS[$APP]="$NEW"
    echo "  → ${APP} bumped to ${NEW}"
  fi
done

# ─── Write summary JSON ────────────────────────────────────────────────────────

JSON="{"
FIRST=true
for KEY in "${!NEW_VERSIONS[@]}"; do
  $FIRST || JSON+=","
  JSON+="\"${KEY}\":\"${NEW_VERSIONS[$KEY]}\""
  FIRST=false
done
JSON+="}"

echo "$JSON" > .version-bumps.json
echo ""
echo "Bumps applied: $JSON"

# Keep root VERSION + root package.json in sync with the highest app version
# so any tooling that still reads the root files sees current data.
if [[ ${#NEW_VERSIONS[@]} -gt 0 ]]; then
  bash "$(dirname "${BASH_SOURCE[0]}")/sync-versions.sh"
fi
