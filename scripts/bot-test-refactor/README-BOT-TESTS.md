# Bot Testing in Cypress

This document explains the approach to testing bots in Cypress.

## Overview

We use Cypress for end-to-end testing of our Discord bots. The tests verify that bots respond correctly to specific messages and ignore messages they shouldn't respond to.

## Test Structure

Each bot has:

1. A model file (`botNameModel.ts`) that contains constants used by both the bot implementation and tests
2. A unit test file (`botName.test.ts`) that tests the bot's functionality in isolation
3. A Cypress test file (`botName.cy.ts`) that tests the bot's functionality in a real Discord environment

## Constants and Shared Code

To ensure consistency between unit tests and E2E tests, we:

1. Use constants from the model files in both unit tests and Cypress tests
2. Use a shared helper file (`botConstants.ts`) that imports and exports all constants from model files
3. Use helper functions to create flexible regex patterns for matching bot responses

## Bot Names in Discord vs. Code

There's a difference between how bot names are stored in code and how they appear in Discord:

- In code: `NiceBot`, `SpiderBot`, etc.
- In Discord: `Nice-Bot`, `Spider-Bot`, etc.

To handle this, we use a mapping object in our tests:

```typescript
const BOT_NAMES_IN_DISCORD = {
	NICE_BOT: 'Nice-Bot',
	SPIDER_BOT: 'Spider-Bot',
	// etc.
};
```

## Response Patterns

Bot responses might have slight variations in case or punctuation between what's defined in the model and what's actually sent to Discord. To handle this, we use flexible regex patterns:

```typescript
const createFlexiblePattern = (response: string): RegExp => {
	// Create a case-insensitive pattern that's flexible with punctuation
	return new RegExp(response.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\.$/, '\\.?'), 'i');
};
```

## Helper Script

We provide a helper script (`scripts/update-cypress-tests.sh`) that creates templates for bot test files. To use it:

```bash
./scripts/update-cypress-tests.sh
```

This will create template files for each bot test file that you can use as a reference.

## Example Test

Here's an example of a bot test:

```typescript
describe('Nice-Bot E2E Tests', () => {
	const { RESPONSE, TEST } = BOT_CONSTANTS.NICE_BOT;
	const BOT_NAME_IN_DISCORD = 'Nice-Bot';

	// The model has "Nice." but the actual response might be "nice" (lowercase)
	const RESPONSE_PATTERN = /nice\.?/i;

	before(() => {
		cy.initDiscordClient();
	});

	it('should respond to "69" with "nice"', () => {
		cy.sendDiscordMessage(TEST.MESSAGE.SIXTY_NINE, BOT_NAME_IN_DISCORD, RESPONSE_PATTERN, channelIDs.NebulaChat);
	});

	it('should NOT respond to unrelated messages', () => {
		cy.task('sendDiscordMessage', {
			message: TEST.MESSAGE.UNRELATED,
			channelId: channelIDs.NebulaChat,
			expectResponse: false,
		}).then((result) => {
			expect(result).to.equal(null);
		});
	});
});
```

## Running Tests

To run all bot tests:

```bash
npx cypress run --spec "cypress/e2e/bots/**/*.cy.ts"
```

To run tests for a specific bot:

```bash
npx cypress run --spec "cypress/e2e/bots/botName.cy.ts"
```

## Troubleshooting

If tests are failing, check:

1. Bot name in Discord vs. code
2. Response pattern (case sensitivity, punctuation)
3. Discord API rate limits (add delays if needed)
4. Bot implementation (make sure the bot is actually responding as expected)
