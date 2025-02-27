# Cypress E2E Tests for Starbunk Bots

This directory contains Cypress E2E tests for the Starbunk Discord bots. These tests verify that each bot correctly responds to its trigger conditions by sending real messages to Discord and verifying the responses.

## Directory Structure

- `e2e/` - Contains the actual test files
  - `bots/` - Tests for Discord bots
    - `allBots.cy.ts` - Tests all bots in a single file
    - `spiderBot.cy.ts` - Tests specifically for Spider-Bot
    - `sigGreatBot.cy.ts` - Tests specifically for SigGreat-Bot
    - `botBot.cy.ts` - Tests specifically for Bot-Bot
    - And many more individual bot test files
- `support/` - Contains support files for Cypress
  - `commands.ts` - Custom Cypress commands
  - `e2e.ts` - E2E test configuration
  - `botTestHelper.ts` - Helper functions for testing bots
  - `index.d.ts` - Type definitions for custom commands
- `plugins/` - Contains Cypress plugins
  - `index.ts` - Plugin configuration

## Running Tests

To run the tests, you need to have the Discord bot running and properly configured with the correct token in your `.env` file.

### Running All Tests

```bash
npm run test:e2e
```

### Running Only Bot Tests

```bash
# Run all bot tests (includes nested directories)
npm run test:e2e:bots

# Run bot tests (direct pattern match)
npm run test:bots
```

### Opening Cypress UI

```bash
npm run cypress:open
```

## Adding New Bot Tests

To add tests for a new bot:

1. Add a new test case to `e2e/bots/allBots.cy.ts` using the `testBot` helper function:

```typescript
describe('New-Bot', () => {
  testBot({
    botName: 'New-Bot',
    triggerMessage: 'Message that triggers the bot',
    expectedResponsePattern: /expected response pattern/i
  });

  // Optionally test that the bot doesn't respond to certain messages
  testBotNoResponse('New-Bot', 'Message that should not trigger the bot');
});
```

2. Create a dedicated test file for the bot in `e2e/bots/newBot.cy.ts` following the pattern of existing bot test files.

## How It Works

The tests work by:

1. Initializing a Discord client
2. Sending a message to a specific Discord channel
3. Waiting for a bot response
4. Verifying that the response matches the expected pattern

The tests use real Discord channels specified in `src/discord/channelIDs.ts` to send and receive messages.

## Continuous Integration

These tests are run automatically as part of the GitHub Actions workflow for pull requests. The workflow is defined in `.github/workflows/pr-bot-tests.yml` and is triggered when changes are made to bot-related files.

For a pull request to be merged, all bot tests must pass.
