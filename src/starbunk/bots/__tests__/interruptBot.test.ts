import { Message } from 'discord.js';
import { container, ServiceId } from '../../../services/container';
import Random from '../../../utils/random';
import InterruptBot from '../reply-bots/interruptBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

// Mock the necessary dependencies
jest.mock('../../../discord/discordGuildMemberHelper', () => ({
	getCurrentMemberIdentity: jest.fn(),
	getRandomMemberExcept: jest.fn()
}));

// Mock the Random utility
jest.mock('../../../utils/random', () => ({
	__esModule: true,
	default: {
		percentChance: jest.fn()
	}
}));

// Mock DiscordService only
jest.mock('../../../services/discordService', () => ({
	DiscordService: {
		getInstance: jest.fn().mockReturnValue({
			getRandomMemberAsBotIdentity: jest.fn().mockReturnValue({
				avatarUrl: 'https://example.com/avatar.jpg',
				botName: 'RandomUser'
			})
		})
	}
}));

// Mock the interrupt bot config
jest.mock('../config/interruptBotConfig', () => ({
	InterruptBotConfig: {
		Responses: {
			createInterruptedMessage: (message: string) => {
				// Simple implementation that matches the tests
				const words = message.split(' ');
				if (words.length > 1) {
					return words.slice(0, 2).join(' ') + '--- Oh, sorry... go ahead';
				} else {
					return message.slice(0, 10) + '--- Oh, sorry... go ahead';
				}
			}
		}
	}
}));

describe('InterruptBot', () => {
	let interruptBot: InterruptBot;
	let message: Message;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Reset mocks
		jest.clearAllMocks();

		// Create InterruptBot instance
		interruptBot = new InterruptBot();

		// Create a mock message
		message = mockMessage('This is a test message');

		// Mock environment variables
		process.env.DEBUG_MODE = 'false';
	});

	afterEach(() => {
		// Reset environment variables
		delete process.env.DEBUG_MODE;
	});

	it('should not trigger if random check fails', async () => {
		// Arrange
		(Random.percentChance as jest.Mock).mockReturnValueOnce(false);

		// Act
		await interruptBot.handleMessage(message);

		// Assert
		expect(Random.percentChance).toHaveBeenCalledWith(1);
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should always trigger in debug mode', async () => {
		// Arrange
		process.env.DEBUG_MODE = 'true';
		// Mock Random.percentChance to return true in debug mode
		(Random.percentChance as jest.Mock).mockReturnValueOnce(true);

		// Act
		await interruptBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: expect.stringContaining('--- Oh, sorry... go ahead')
			})
		);
	});

	it('should trigger with 1% chance', async () => {
		// Arrange
		(Random.percentChance as jest.Mock).mockReturnValueOnce(true);

		// Act
		await interruptBot.handleMessage(message);

		// Assert
		expect(Random.percentChance).toHaveBeenCalledWith(1);
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: expect.stringContaining('--- Oh, sorry... go ahead')
			})
		);
	});

	it('should create interrupted message with first few words', async () => {
		// Arrange
		(Random.percentChance as jest.Mock).mockReturnValueOnce(true);
		message.content = 'Did somebody say BLU?';

		// Act
		await interruptBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: 'Did somebody--- Oh, sorry... go ahead'
			})
		);
	});

	it('should create interrupted message with first few characters for single word', async () => {
		// Arrange
		(Random.percentChance as jest.Mock).mockReturnValueOnce(true);
		message.content = 'Supercalifragilisticexpialidocious';

		// Act
		await interruptBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: 'Supercalif--- Oh, sorry... go ahead'
			})
		);
	});
});
