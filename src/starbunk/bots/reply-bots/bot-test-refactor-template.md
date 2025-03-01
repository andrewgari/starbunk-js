# Bot Test Refactoring Template

This template provides a step-by-step guide for refactoring bot tests to use constants and follow the AAA (Arrange-Act-Assert) pattern.

## Step 1: Update the Model File

Add a `TEST` object to the bot's model file with all the constants needed for testing:

```typescript
/**
 * Test constants for BotName tests
 */
export const TEST = {
	// User constants
	USER_NAME: 'TestUser',
	BOT_USER_ID: 'bot-id',
	BOT_USER_NAME: 'BotUser',

	// Test message content
	MESSAGE: {
		// Add message constants specific to this bot
		EXAMPLE_MESSAGE: 'Example message',
		UNRELATED: 'Hello there!',
	},

	// Test conditions
	CONDITIONS: {
		TRIGGER: true,
		NO_TRIGGER: false,
	},

	// Test responses (if needed)
	RESPONSE: {
		// Add response constants specific to this bot
	},
};
```

Make sure to also add a `BOT_NAME` constant if it doesn't exist:

```typescript
export const BOT_NAME = 'BotName';
```

## Step 2: Update the Test File

### 2.1 Update Imports

Replace the webhook service mock with the reusable mock:

```typescript
import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

// Import the model constants
import { BOT_NAME, AVATAR_URL, TEST } from './botNameModel';
```

### 2.2 Refactor Test Fixtures

Add test fixtures at the top of the describe block:

```typescript
describe('BotName', () => {
	// Test fixtures
	let botInstance: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;

	beforeEach(() => {
		// Arrange - Common setup for all tests
		jest.clearAllMocks();

		// Create message mock
		mockMessage = createMockMessage(TEST.USER_NAME);
		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: TEST.USER_NAME,
				configurable: true,
			});
		}

		// Create bot instance
		botInstance = createBotName();
	});

	// Tests go here...
});
```

### 2.3 Refactor Identity Tests

Combine name and avatar URL tests:

```typescript
describe('identity', () => {
	it('should have correct name and avatar URL', () => {
		// Act
		const identity = botInstance.getIdentity();

		// Assert
		expect(identity.name).toBe(BOT_NAME);
		expect(identity.avatarUrl).toBe(AVATAR_URL);
	});
});
```

### 2.4 Refactor Message Handling Tests

Follow the AAA pattern for each test:

```typescript
describe('message handling', () => {
	it('should ignore messages from bots', async () => {
		// Arrange
		mockMessage.author = {
			...createMockGuildMember(TEST.BOT_USER_ID, TEST.BOT_USER_NAME).user,
			bot: true,
		} as User;
		mockMessage.content = TEST.MESSAGE.EXAMPLE_MESSAGE;

		// Act
		await botInstance.handleMessage(mockMessage as Message<boolean>);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to specific messages', async () => {
		// Arrange
		mockMessage.content = TEST.MESSAGE.EXAMPLE_MESSAGE;

		// Act
		await botInstance.handleMessage(mockMessage as Message<boolean>);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalledWith(
			mockMessage.channel as TextChannel,
			expect.objectContaining({
				username: BOT_NAME,
				avatarURL: AVATAR_URL,
				content: expect.any(String),
			}),
		);
	});

	// Add more tests as needed...
});
```

## Step 3: Test and Verify

After refactoring, run the tests to make sure they still pass:

```bash
npm test -- -t "BotName"
```

## Benefits of This Approach

1. **Maintainability**: Changes to test values only need to be made in one place
2. **Readability**: Tests are more descriptive and easier to understand
3. **Consistency**: All tests follow the same pattern and structure
4. **Safety**: You can update the bot and its tests at the same time by changing constants in one place
