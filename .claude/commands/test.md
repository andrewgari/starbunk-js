# Test Runner

Run tests for Starbunk containers. Specify a container name or run all tests.

## Arguments
- `$ARGUMENTS` - Optional: container name (bunkbot, djcova, covabot, bluebot, shared) or "all"

## Instructions

Run tests based on the argument provided:

1. If no argument or "all" is provided, run the full test suite:
   ```bash
   npm run test
   ```

2. If a specific container is provided (bunkbot, djcova, covabot, bluebot, shared), run tests for that container:
   ```bash
   npm run test:<container>
   ```

3. Report the test results clearly, highlighting any failures.

4. If tests fail, analyze the output and suggest fixes if the errors are straightforward.
