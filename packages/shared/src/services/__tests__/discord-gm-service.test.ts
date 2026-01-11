import { Client, Message } from 'discord.js';
import { DiscordGMService } from '../discordGMService';
import { DiscordService } from '../discordService';

// Mock dependencies before importing service
jest.mock('../../discord/channelIds', () => ({
	Starbunk: {
		BotChannelAdmin: '1014170827601748048',
		BotChannel: '753251583084724366',
	},
}));

// Define test constants
const GM_CHANNEL_ID = '1014170827601748048'; // BotChannelAdmin ID from Starbunk
const BOT_CHANNEL_ID = '753251583084724366'; // Regular bot channel

describe('DiscordGMService', () => {
	// Test variables
	let discordGMService: DiscordGMService;
	let mockClient: Partial<Client>;
	let mockDiscordService: Partial<DiscordService>;

	// Setup before each test
	beforeEach(() => {
		// Create mock for Discord client
		mockClient = {
			user: {
				id: 'bot123',
				username: 'TestBot',
			},
		} as any;

		// Create mock for Discord service
		mockDiscordService = {
			sendMessage: jest.fn().mockResolvedValue({ id: 'msg123', content: 'Test message' }),
			sendMessageWithBotIdentity: jest.fn().mockResolvedValue(undefined),
		};

		// Clear singleton instance
		// @ts-expect-error - accessing private field for testing
		DiscordGMService['discordGMServiceInstance'] = null;

		// Initialize service
		discordGMService = DiscordGMService.initialize(mockClient as Client, mockDiscordService as DiscordService);

		// Clear all mocks before each test
		jest.clearAllMocks();
	});

	// Test initialization
	describe('initialization', () => {
		it('should create a singleton instance', () => {
			// Create two instances and verify they're the same
			const instance1 = DiscordGMService.initialize(mockClient as Client, mockDiscordService as DiscordService);
			const instance2 = DiscordGMService.initialize(mockClient as Client, mockDiscordService as DiscordService);

			expect(instance1).toBe(instance2);
		});
	});

	// Test isGMChannel
	describe('isGMChannel', () => {
		it('should return true for GM channels', () => {
			expect(discordGMService.isGMChannel(GM_CHANNEL_ID)).toBe(true);
		});

		it('should return false for non-GM channels', () => {
			expect(discordGMService.isGMChannel(BOT_CHANNEL_ID)).toBe(false);
		});
	});

	// Test processGMCommand
	describe('processGMCommand', () => {
		it('should process valid gm-note commands', async () => {
			// Mock private method
			const processNoteSpy = jest
				.spyOn(discordGMService as any, 'processGMNote')
				.mockImplementation(() => Promise.resolve());

			// Create mock Discord message
			const mockMessage = {
				content: '!gm-note Test note content',
				channel: { id: GM_CHANNEL_ID },
			} as Message;

			// Process the message
			const _result = await discordGMService.processGMCommand(mockMessage);

			// Verify results
			expect(_result).toBe(true);
			expect(processNoteSpy).toHaveBeenCalledWith('Test note content');
		});

		it('should reject commands from non-GM channels', async () => {
			// Create mock Discord message from non-GM channel
			const mockMessage = {
				content: '!gm-note Test note content',
				channel: { id: BOT_CHANNEL_ID },
			} as Message;

			// Process the message
			const _result = await discordGMService.processGMCommand(mockMessage);

			// Verify results
			expect(_result).toBe(false);
			expect(mockDiscordService.sendMessage).not.toHaveBeenCalled();
		});

		it('should ignore non-GM prefixed commands', async () => {
			// Create mock Discord message with regular command
			const mockMessage = {
				content: '!regular-command',
				channel: { id: GM_CHANNEL_ID },
			} as Message;

			// Process the message
			const _result = await discordGMService.processGMCommand(mockMessage);

			// Verify results
			expect(_result).toBe(false);
			expect(mockDiscordService.sendMessage).not.toHaveBeenCalled();
		});

		it('should handle unknown GM commands', async () => {
			// Mock sendGMAlert method instead of directly checking sendMessage
			const sendGMAlertSpy = jest.spyOn(discordGMService, 'sendGMAlert').mockResolvedValue({} as any);

			// Create mock Discord message with unknown GM command
			const mockMessage = {
				content: '!gm-unknown Test parameters',
				channel: { id: GM_CHANNEL_ID },
			} as Message;

			// Process the message
			const _result = await discordGMService.processGMCommand(mockMessage);

			// Verify results
			expect(_result).toBe(false);
			expect(sendGMAlertSpy).toHaveBeenCalledWith('Unknown GM command: gm-unknown');
		});
	});
});
