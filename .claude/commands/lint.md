# Lint

Run ESLint and Prettier on the codebase.

## Arguments
- `$ARGUMENTS` - Optional: "fix" to auto-fix issues, or "check" to just report

## Instructions

1. If "fix" is provided (or no argument), run lint with auto-fix:
   ```bash
   npm run lint:fix && npm run format
   ```

2. If "check" is provided, run lint without fixing:
   ```bash
   npm run lint
   ```

3. Report any remaining issues that couldn't be auto-fixed.

4. For remaining issues, offer to fix them manually if they are straightforward.
