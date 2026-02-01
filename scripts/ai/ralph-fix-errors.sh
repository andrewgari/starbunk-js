#!/bin/bash
# Usage: ./fix-loop.sh "Fix the race condition in the auth service"
PROMPT=$1
MAX_RETRIES=5
COUNT=0

# Get repo root and load context
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -n "$REPO_ROOT" ]; then
  cd "$REPO_ROOT" || exit 1

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
fi

while ! npm test; do
  ((COUNT++))
  if [ $COUNT -gt $MAX_RETRIES ]; then
    echo "Max retries reached. Ralph is tired."
    exit 1
  fi
  echo "Iteration $COUNT: Attempting fix..."
  # --allow-all-tools lets Copilot edit files and run shell commands directly
  FIX_PROMPT="You are Ralph, an autonomous test-fixing assistant.

Task: $PROMPT

Context:
- Iteration $COUNT of $MAX_RETRIES
- Tests are currently failing
- Focus on fixing the root cause, not just symptoms

Requirements:
- Unit Tests must pass with no errors
- Linting must pass with no errors
- Build must pass with no errors
- Docker build must pass with no errors
- CI/CD pipeline must pass with no errors
- Analyze test output carefully before making changes
- Make minimal, targeted fixes
- Ensure type safety (strict TypeScript)
- Follow existing patterns and conventions
- Verify changes don't break other tests
- If the issue is unclear, investigate related code first

Run 'npm test' to see current failures."

  # Add PRD context if available
  if [ -n "$PRD_CONTEXT" ]; then
    FIX_PROMPT="$FIX_PROMPT

--- PROJECT CONTEXT (PRD.md) ---
$PRD_CONTEXT
--- END PRD CONTEXT ---"
  fi

  # Add AGENTS context if available
  if [ -n "$AGENTS_CONTEXT" ]; then
    FIX_PROMPT="$FIX_PROMPT

--- AGENT COORDINATION RULES (docs/AGENTS.md) ---
$AGENTS_CONTEXT
--- END AGENTS CONTEXT ---"
  fi

  copilot -p "$FIX_PROMPT" --allow-all-tools
done

echo "Tests passed after $COUNT iterations!"
