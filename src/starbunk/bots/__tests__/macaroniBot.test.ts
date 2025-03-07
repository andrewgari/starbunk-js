import userID from '../../../discord/userId';
import { MacaroniBotConfig } from '../config/macaroniBotConfig';
import MacaroniBot from '../reply-bots/macaroniBot';
import { MockLogger, MockWebhookService, createMockMessage, expectWebhookCalledWith } from './testUtils';

describe('MacaroniBot', () => {
	let macaroniBot: MacaroniBot;
	let mockLogger: MockLogger;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		// Arrange - Set up our test environment
		mockLogger = new MockLogger();
		mockWebhookService = new MockWebhookService();

		// Create the bot with our mocks
		macaroniBot = new MacaroniBot(mockLogger);
		// @ts-expect-error - Set the webhook service property directly
		macaroniBot.webhookService = mockWebhookService;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test('should respond with mention when message contains "macaroni"', () => {
		// Arrange
		const message = createMockMessage('I love macaroni cheese');
		const expectedResponse = `Are you trying to reach <@${userID.Venn}>`;

		// Act
		macaroniBot.handleMessage(message);

		// Assert
		expectWebhookCalledWith(
			mockWebhookService,
			'Macaroni Bot',
			expectedResponse
		);
	});

	test('should respond with mention when message contains "pasta"', () => {
		// Arrange
		const message = createMockMessage('Pasta is delicious');
		const expectedResponse = `Are you trying to reach <@${userID.Venn}>`;

		// Act
		macaroniBot.handleMessage(message);

		const matches = message.content.match(MacaroniBotConfig.Patterns.Macaroni);
		// Assert
		expect(matches).toBeDefined();
		expect(matches?.[0].toLowerCase()).toBe('pasta');
		expectWebhookCalledWith(
			mockWebhookService,
			'Macaroni Bot',
			expectedResponse
		);
	});

	test('should respond with correction when message contains "venn"', () => {
		// Arrange
		const message = createMockMessage('Hey venn, how are you?');
		const expectedResponse = 'Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum';

		// Act
		macaroniBot.handleMessage(message);

		// Assert
		expectWebhookCalledWith(
			mockWebhookService,
			'Macaroni Bot',
			expectedResponse
		);
	});

	test('should not respond to bot messages', () => {
		// Arrange
		const message = createMockMessage('macaroni', '123456789', true);

		// Act
		macaroniBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should not respond to messages without trigger words', () => {
		// Arrange
		const message = createMockMessage('Hello world');

		// Act
		macaroniBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should log debug message when triggered', () => {
		// Arrange
		const message = createMockMessage('I love macaroni');
		message.author.username = 'TestUser';

		// Act
		macaroniBot.handleMessage(message);

		// Assert
		expect(mockLogger.debug).toHaveBeenCalledWith(
			expect.stringContaining('TestUser mentioned macaroni')
		);
	});
});
