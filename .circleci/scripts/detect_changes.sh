#!/usr/bin/env bash
set -uo pipefail

# Install jq if not available
if ! command -v jq &> /dev/null; then
  echo "Installing jq..."
  apt-get update && apt-get install -y jq || npm install -g jq-shell || exit 0
fi

# Determine base commit for diff
BASE=${BASE_REF:-origin/main}

# Try to get the diff, but don't fail if it doesn't work
if ! git diff --name-only "$BASE"...HEAD > .circleci/changed_files.txt 2>/dev/null; then
  echo "Warning: Could not diff against $BASE, assuming all files changed"
  git ls-files > .circleci/changed_files.txt
fi

shared_changed=false
bunkbot_changed=false
covabot_changed=false
djcova_changed=false
bluebot_changed=false
workflow_changed=false
container_config_changed=false
source_changed=false

while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  case "$file" in
    src/shared/*) shared_changed=true; source_changed=true ;;
    src/bunkbot/*|src/bunkbot/Dockerfile*) bunkbot_changed=true; source_changed=true ;;
    src/covabot/*|src/covabot/Dockerfile*) covabot_changed=true; source_changed=true ;;
    src/djcova/*|src/djcova/Dockerfile*) djcova_changed=true; source_changed=true ;;
    src/bluebot/*|src/bluebot/Dockerfile*) bluebot_changed=true; source_changed=true ;;
    .github/*|.circleci/*) workflow_changed=true ;;
    Dockerfile*|**/Dockerfile*) container_config_changed=true ;;
    src/*) source_changed=true ;;
  esac
done < .circleci/changed_files.txt

any_app_changed=false
changed_apps=()
for app in bunkbot covabot djcova bluebot; do
  var="${app}_changed"
  if [[ ${!var} == true ]]; then
    any_app_changed=true
    changed_apps+=("$app")
  fi
done

jq -n \
  --arg source_changed "$source_changed" \
  --arg workflow_changed "$workflow_changed" \
  --arg container_config_changed "$container_config_changed" \
  --arg shared_changed "$shared_changed" \
  --arg bunkbot_changed "$bunkbot_changed" \
  --arg covabot_changed "$covabot_changed" \
  --arg djcova_changed "$djcova_changed" \
  --arg bluebot_changed "$bluebot_changed" \
  --arg any_app_changed "$any_app_changed" \
  --arg changed_apps "${changed_apps[*]}" \
  '{source_changed: $source_changed, workflow_changed: $workflow_changed, container_config_changed: $container_config_changed, shared_changed: $shared_changed, bunkbot_changed: $bunkbot_changed, covabot_changed: $covabot_changed, djcova_changed: $djcova_changed, bluebot_changed: $bluebot_changed, any_app_changed: $any_app_changed, changed_apps: $changed_apps}' \
  > .circleci/diff.json

cat .circleci/diff.json

# Always exit successfully
exit 0
