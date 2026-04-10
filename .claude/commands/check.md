# Full Check

Run all CI checks: type-check, lint, and tests.

## Instructions

Run the full check suite used in CI:

```bash
npm run check:all
```

This runs:
1. TypeScript type checking (`npm run type-check`)
2. ESLint (`npm run lint`)
3. All tests (`npm run test`)

Report the results of each step clearly. If any step fails:
- For type errors: show the specific errors and affected files
- For lint errors: show the violations and offer to fix
- For test failures: show which tests failed and analyze the errors
