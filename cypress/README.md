# Cypress E2E Tests

This directory contains end-to-end tests for the Discord bots using Cypress.

## Setup

1. Create a `.env` file in the root directory with the following variables:

    ```
    DISCORD_TOKEN=your_discord_token
    ```

2. Install dependencies:
    ```
    npm install
    ```

## Running Tests

### Run all bot tests

```
npm run test:e2e:local
```

### Run a specific bot test

```
npm run test:e2e:bot blueBot
```

Replace `blueBot` with the name of the bot you want to test.

### Open Cypress UI

```
npm run cypress:open
```

### Clean up Cypress artifacts

```
npm run cypress:clean
```

## Test Structure

- `cypress/e2e/bots/` - Contains test files for each bot
- `cypress/support/` - Contains helper functions and custom commands
- `cypress/fixtures/` - Contains test data

## Adding a New Bot Test

1. Create a new test file in `cypress/e2e/bots/` named after your bot (e.g., `myBot.cy.ts`)
2. Use the `testBot` and `testBotNoResponse` helper functions from `botTestHelper.ts`
3. Run your test with `npm run test:e2e:bot myBot`

## Troubleshooting

- If tests fail, check the screenshots in `cypress/screenshots/`
- If you encounter network issues, ensure your Discord token is valid
- For more detailed logs, run Cypress in UI mode with `npm run cypress:open`

## Notes

- Screenshots and videos are automatically excluded from git
- Tests are configured to run in CI/CD pipelines with GitHub Actions
