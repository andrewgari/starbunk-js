#!/usr/bin/env bash
set -euo pipefail

# Validate that package TODO.md files include required sections/keywords
# This is a lightweight guard to encourage structured manifests.

ROOT_DIR=$(cd "$(dirname "$0")/../.." && pwd)
MANIFEST_FILES=(
  "$ROOT_DIR/src/bluebot/TODO.md"
  "$ROOT_DIR/src/bunkbot/TODO.md"
  "$ROOT_DIR/src/covabot/TODO.md"
)

missing=()

check_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo "ERROR: Manifest not found: $file"
    missing+=("$file")
    return 1
  fi
  # Required tokens to appear at least once in the file
  local required=(
    "Context"
    "File Scope"
    "The Change"
    "Validation"
    "Relationship"
    "Tests"
    "Repo Validations"
    "Tracing"
    "Security"
  )
  local fail=0
  for token in "${required[@]}"; do
    if ! grep -qiE "\b${token}\b" "$file"; then
      echo "ERROR: '$token' section/keyword missing in $file"
      fail=1
    fi
  done
  return $fail
}

exit_code=0
for f in "${MANIFEST_FILES[@]}"; do
  if ! check_file "$f"; then
    exit_code=1
  fi
done

if [[ "$exit_code" -ne 0 ]]; then
  echo "\nManifest validation failed. Ensure each TODO.md includes required sections and validation gates."
else
  echo "Manifest validation passed."
fi

exit "$exit_code"
