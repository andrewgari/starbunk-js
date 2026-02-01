#!/bin/bash

# 1. Force context to Repo Root
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

if [ -z "$REPO_ROOT" ]; then
  echo "Error: Not in a git repository."
  exit 1
fi

cd "$REPO_ROOT" || exit 1
echo "Ralph is operating from: $(pwd)"

# Load context documents
PRD_CONTEXT=""
if [ -f "PRD.md" ]; then
  PRD_CONTEXT=$(cat PRD.md)
  echo "✓ Loaded PRD.md context"
fi

AGENTS_CONTEXT=""
if [ -f "docs/AGENTS.md" ]; then
  AGENTS_CONTEXT=$(cat docs/AGENTS.md)
  echo "✓ Loaded AGENTS.md context"
fi

# 2. Configuration & State
# Ensure we fetch the latest remote state to avoid stale comment data
git fetch origin

PR_NUMBER=$(gh pr view --json number -q .number)

if [ -z "$PR_NUMBER" ]; then
  echo "Error: No PR found for the current branch."
  exit 1
fi

while true; do
  # Fetching thread IDs and bodies using GraphQL API
  REPO_OWNER=$(gh repo view --json owner -q .owner.login)
  REPO_NAME=$(gh repo view --json name -q .name)

  # Query for review threads via GraphQL (get last comment only)
  THREADS_RAW=$(gh api graphql -f query='
    query($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        pullRequest(number: $number) {
          reviewThreads(first: 100) {
            nodes {
              id
              isResolved
              comments(last: 1) {
                nodes {
                  body
                }
              }
            }
          }
        }
      }
    }' -f owner="$REPO_OWNER" -f name="$REPO_NAME" -F number="$PR_NUMBER")

  # Filter to unresolved threads and format
  THREADS=$(echo "$THREADS_RAW" | jq -r '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | {id: .id, lastComment: .comments.nodes[0].body}' | jq -c '.')

  if [ -z "$THREADS" ] || [ "$THREADS" == "" ]; then
    echo "No unresolved threads. Task complete."
    break
  fi

  while IFS= read -r thread; do
    T_ID=$(echo "$thread" | jq -r '.id')
    T_BODY=$(echo "$thread" | jq -r '.lastComment')

    echo "---"
    echo "Processing Thread: $T_ID"
    echo "Comment: $T_BODY"

    # Use -p mode to determine if action is needed
    SHOULD_FIX=$(copilot -p "Analyze this PR review comment and determine if it requires a code change (YES) or is just informational/acknowledgment (NO).

Comment: '$T_BODY'

Respond with ONLY 'YES' or 'NO'.")

    if [[ "$SHOULD_FIX" == *"YES"* ]]; then
      echo "✓ Action required - applying fix..."
      # Apply fix from root
      CONTEXT_PROMPT="You are Ralph, an autonomous code assistant. Apply the fix requested in this PR review comment:

Comment: $T_BODY

Requirements:
- Make minimal, focused changes
- Follow existing code patterns and style
- Ensure type safety (strict TypeScript)
- Run relevant tests after changes
- Do NOT introduce new dependencies unless absolutely necessary

You are at repo root: $(pwd)"

      # Add PRD context if available
      if [ -n "$PRD_CONTEXT" ]; then
        CONTEXT_PROMPT="$CONTEXT_PROMPT

--- PROJECT CONTEXT (PRD.md) ---
$PRD_CONTEXT
--- END PRD CONTEXT ---"
      fi

      # Add AGENTS context if available
      if [ -n "$AGENTS_CONTEXT" ]; then
        CONTEXT_PROMPT="$CONTEXT_PROMPT

--- AGENT COORDINATION RULES (docs/AGENTS.md) ---
$AGENTS_CONTEXT
--- END AGENTS CONTEXT ---"
      fi

      copilot -p "$CONTEXT_PROMPT" --allow-all-tools

      git add .
      git commit -m "Ralph: fixed feedback in thread $T_ID"
      git push origin $(git branch --show-current)
      echo "✓ Fix applied and pushed"
    else
      echo "○ No action needed - comment acknowledged"
    fi

    # Always resolve the thread regardless of whether we fixed it
    gh api graphql -f query='
      mutation($id: ID!) {
        resolveReviewThread(input: {threadId: $id}) {
          thread { isResolved }
        }
      }' -f id="$T_ID" > /dev/null

    echo "✓ Thread $T_ID resolved"

  done <<< "$(echo "$THREADS" | jq -c '.')"

  sleep 5
done
