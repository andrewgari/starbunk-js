# Ensuring Cypress Tests Work with Refactored Bots

This guide explains how to ensure that Cypress tests continue to work with the refactored bot architecture.

## Overview

The Cypress tests rely on the constants exported from the bot model files. When refactoring bots, we need to make sure that these constants are still available and correctly imported in the `botConstants.ts` file.

## Key Files

1. **Bot Model Files**: Each bot has a model file that exports constants used by both unit tests and Cypress tests.
2. **botConstants.ts**: This file imports constants from all bot model files and exports them for use in Cypress tests.
3. **Cypress Test Files**: These files import constants from `botConstants.ts` and use them to test the bots.

## Steps to Ensure Cypress Tests Work

### 1. Keep Constants in Model Files

When refactoring a bot, make sure to keep all constants in the model file:

```typescript
// src/starbunk/bots/reply-bots/[botName]/[botName]Model.ts
export const BOT_NAME = 'BotName';
export const AVATAR_URL = 'https://example.com/avatar.png';
export const RESPONSE = 'Bot response';

export const TEST = {
	// Test constants
};
```

### 2. Check botConstants.ts

Make sure that `botConstants.ts` correctly imports and exports the constants:

```typescript
// cypress/support/botConstants.ts
import { BOT_NAME, TEST, RESPONSE } from '../../src/starbunk/bots/reply-bots/[botName]/[botName]Model';

export const BOT_CONSTANTS = {
	BOT_NAME_BOT: {
		NAME: BOT_NAME,
		RESPONSE: RESPONSE,
		TEST: TEST,
	},
};
```

### 3. Run Cypress Tests

Run the Cypress tests to make sure they still work:

```bash
npm run test:e2e -- --spec "cypress/e2e/bots/[botName].cy.ts"
```

### 4. Fix Any Issues

If the tests fail, check the following:

1. **Import Paths**: Make sure the import paths in `botConstants.ts` are correct.
2. **Constant Names**: Make sure the constant names match between the model file and `botConstants.ts`.
3. **Bot Names in Discord**: Make sure the bot names in the Cypress tests match the actual bot names in Discord.

## Example: SpiderBot

Here's how the SpiderBot constants are used in Cypress tests:

```typescript
// cypress/e2e/bots/spiderBot.cy.ts
describe('Spider-Bot E2E Tests', () => {
	const { RESPONSE, TEST } = BOT_CONSTANTS.SPIDERBOT_BOT;
	const BOT_NAME_IN_DISCORD = 'Spider-Bot';

	it('should respond to "spiderman" with a correction message', () => {
		cy.sendDiscordMessage(
			TEST.MESSAGE.SPIDERMAN_IN_SENTENCE,
			BOT_NAME_IN_DISCORD,
			new RegExp(RESPONSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
			channelIDs.NebulaChat,
		);
	});
});
```

## Testing All Bots

To run tests for all bots, use:

```bash
npm run test:e2e -- --spec "cypress/e2e/bots/allBots.cy.ts"
```

This will test the core functionality of all bots to ensure they're working correctly.

## Troubleshooting

### Bot Not Responding

If a bot doesn't respond in the tests:

1. Check that the bot is running in Discord.
2. Check that the bot name in the test matches the actual bot name in Discord.
3. Check that the trigger message in the test is something the bot should respond to.

### Wrong Response

If a bot responds with the wrong message:

1. Check that the response pattern in the test matches the actual response from the bot.
2. Check that the bot's response generator is returning the correct response.

### Import Errors

If there are import errors:

1. Check that the model file exports all the constants needed by the tests.
2. Check that `botConstants.ts` correctly imports and exports these constants.
3. Check that the Cypress tests correctly import from `botConstants.ts`.
