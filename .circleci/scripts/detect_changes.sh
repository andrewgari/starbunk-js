#!/usr/bin/env bash
set -uo pipefail

echo "--- DEBUG INFO ---"
echo "Current directory: $(pwd)"
ls -la
echo "Git log:"
git log --oneline -n 10
echo "--- END DEBUG INFO ---"

# Check for force-all-checks label on PR
force_all_checks=false
if [[ -n "${CIRCLE_PULL_REQUEST:-}" ]]; then
  PR_NUMBER=$(echo "$CIRCLE_PULL_REQUEST" | grep -oE '[0-9]+$' || true)
  if [[ -n "$PR_NUMBER" && -n "${GITHUB_TOKEN:-}" ]]; then
    LABELS=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
      "https://api.github.com/repos/andrewgari/starbunk-js/pulls/$PR_NUMBER" | \
      grep -o '"name":"[^"]*"' | grep -o '[^"]*$' | head -1 || echo "")
    
    if curl -s -H "Authorization: token $GITHUB_TOKEN" \
      "https://api.github.com/repos/andrewgari/starbunk-js/pulls/$PR_NUMBER" | \
      grep -q '"name":"force-all-checks"'; then
      force_all_checks=true
      echo "🔥 force-all-checks label detected - running all validations"
    fi
  fi
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

# If force-all-checks label is present, set all to true
if [[ "$force_all_checks" == true ]]; then
  shared_changed=true
  bunkbot_changed=true
  covabot_changed=true
  djcova_changed=true
  bluebot_changed=true
  workflow_changed=true
  container_config_changed=true
  source_changed=true
else
  # Normal change detection
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
fi

any_app_changed=false
changed_apps=()
for app in bunkbot covabot djcova bluebot; do
  var="${app}_changed"
  if [[ ${!var} == true ]]; then
    any_app_changed=true
    changed_apps+=("$app")
  fi
done

# Generate JSON output without jq using pure bash
{
  printf '{\n'
  printf '  "source_changed": %s,\n' "$source_changed"
  printf '  "workflow_changed": %s,\n' "$workflow_changed"
  printf '  "container_config_changed": %s,\n' "$container_config_changed"
  printf '  "shared_changed": %s,\n' "$shared_changed"
  printf '  "bunkbot_changed": %s,\n' "$bunkbot_changed"
  printf '  "covabot_changed": %s,\n' "$covabot_changed"
  printf '  "djcova_changed": %s,\n' "$djcova_changed"
  printf '  "bluebot_changed": %s,\n' "$bluebot_changed"
  printf '  "any_app_changed": %s,\n' "$any_app_changed"
  printf '  "force_all_checks": %s,\n' "$force_all_checks"
  printf '  "changed_apps": ['
  if [[ ${#changed_apps[@]} -gt 0 ]]; then
    printf '"%s"' "${changed_apps[0]}"
    for i in "${!changed_apps[@]}"; do
      if [[ $i -gt 0 ]]; then
        printf ', "%s"' "${changed_apps[$i]}"
      fi
    done
  fi
  printf ']\n'
  printf '}\n'
} > .circleci/diff.json

echo "Change detection completed. Results:"
cat .circleci/diff.json
echo "Changed files list:"
cat .circleci/changed_files.txt

exit 0
