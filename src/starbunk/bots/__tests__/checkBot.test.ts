import { getWebhookService } from '../../../services/bootstrap';
import CheckBot from '../reply-bots/checkBot';
import { MockWebhookService, createMockMessage, expectWebhookCalledWith } from './testUtils';

jest.mock('../../../services/bootstrap');

describe('CheckBot', () => {
	let checkBot: CheckBot;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		mockWebhookService = new MockWebhookService();
		(getWebhookService as jest.Mock).mockReturnValue(mockWebhookService);
		checkBot = new CheckBot();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test('should replace "check" with "czech" in messages', () => {
		// Arrange
		const message = createMockMessage('I need to check this out');
		const expectedResponse = "I believe you meant to say: 'I need to czech this out'.";

		// Act
		checkBot.handleMessage(message);

		// Assert
		expectWebhookCalledWith(
			mockWebhookService,
			checkBot.botName,
			expectedResponse
		);
	});

	test('should replace "Czech" with "Check" in messages', () => {
		// Arrange
		const message = createMockMessage('I am going to the Czech Republic');
		const expectedResponse = "I believe you meant to say: 'I am going to the Check Republic'.";

		// Act
		checkBot.handleMessage(message);

		// Assert
		expectWebhookCalledWith(
			mockWebhookService,
			checkBot.botName,
			expectedResponse
		);
	});

	test('should preserve capitalization when replacing', () => {
		// Arrange
		const message = createMockMessage('Check this out, Czech people!');
		const expectedResponse = "I believe you meant to say: 'Czech this out, Check people!'.";

		// Act
		checkBot.handleMessage(message);

		// Assert
		expectWebhookCalledWith(
			mockWebhookService,
			checkBot.botName,
			expectedResponse
		);
	});

	test('should not respond to messages without "check" or "czech"', () => {
		// Arrange
		const message = createMockMessage('Hello world');

		// Act
		checkBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should not respond to bot messages', () => {
		// Arrange
		const message = createMockMessage('check this out', '123456789', true);

		// Act
		checkBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
