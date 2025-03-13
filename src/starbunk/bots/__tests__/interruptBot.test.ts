import { Message } from 'discord.js';
import { getRandomMemberExcept } from '../../../discord/discordGuildMemberHelper';
import { container, ServiceId } from '../../../services/services';
import Random from '../../../utils/random';
import InterruptBot from '../reply-bots/interruptBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

// Mock the getRandomMemberExcept function
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
		interruptBot = new InterruptBot(mockLogger);

		// Create a mock message
		message = mockMessage('This is a test message');

		// Mock environment variables
		process.env.DEBUG_MODE = 'false';
	});

	afterEach(() => {
		// Reset environment variables
		delete process.env.DEBUG_MODE;
	});

	it('should not respond to bot messages', async () => {
		// Arrange
		const botMessage = mockMessage('Hello world', 'testUser', true);

		// Act
		await interruptBot.handleMessage(botMessage);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		expect(Random.percentChance).not.toHaveBeenCalled();
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
		const randomMember = {
			id: 'random123',
			displayName: 'RandomUser',
			user: {
				username: 'RandomUser'
			},
			displayAvatarURL: jest.fn().mockReturnValue('https://example.com/avatar.jpg')
		};
		(getRandomMemberExcept as jest.Mock).mockResolvedValueOnce(randomMember);

		// Act
		await interruptBot.handleMessage(message);

		// Assert
		expect(getRandomMemberExcept).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should trigger with 1% chance and respond with random member identity', async () => {
		// Arrange
		(Random.percentChance as jest.Mock).mockReturnValueOnce(true);
		const randomMember = {
			id: 'random123',
			displayName: 'RandomUser',
			user: {
				username: 'RandomUser'
			},
			displayAvatarURL: jest.fn().mockReturnValue('https://example.com/avatar.jpg')
		};
		(getRandomMemberExcept as jest.Mock).mockResolvedValueOnce(randomMember);

		// Act
		await interruptBot.handleMessage(message);

		// Assert
		expect(Random.percentChance).toHaveBeenCalledWith(1);
		expect(getRandomMemberExcept).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: 'RandomUser',
				avatarURL: 'https://example.com/avatar.jpg',
				content: expect.stringContaining('--- Oh, sorry... go ahead')
			})
		);
	});

	it('should not respond if no random member is found', async () => {
		// Arrange
		(Random.percentChance as jest.Mock).mockReturnValueOnce(true);
		(getRandomMemberExcept as jest.Mock).mockResolvedValueOnce(null);

		// Clear any previous calls to mocks
		jest.clearAllMocks();

		// Act
		await interruptBot.handleMessage(message);

		// Assert
		expect(Random.percentChance).toHaveBeenCalledWith(1);
		expect(getRandomMemberExcept).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should create interrupted message with first few words', async () => {
		// Arrange
		(Random.percentChance as jest.Mock).mockReturnValueOnce(true);
		const randomMember = {
			id: 'random123',
			displayName: 'RandomUser',
			user: {
				username: 'RandomUser'
			},
			displayAvatarURL: jest.fn().mockReturnValue('https://example.com/avatar.jpg')
		};
		(getRandomMemberExcept as jest.Mock).mockResolvedValueOnce(randomMember);
		message.content = 'Did somebody say BLU?';

		// Act
		await interruptBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: 'Did somebody say--- Oh, sorry... go ahead'
			})
		);
	});

	it('should create interrupted message with first few characters for single word', async () => {
		// Arrange
		(Random.percentChance as jest.Mock).mockReturnValueOnce(true);
		const randomMember = {
			id: 'random123',
			displayName: 'RandomUser',
			user: {
				username: 'RandomUser'
			},
			displayAvatarURL: jest.fn().mockReturnValue('https://example.com/avatar.jpg')
		};
		(getRandomMemberExcept as jest.Mock).mockResolvedValueOnce(randomMember);
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
