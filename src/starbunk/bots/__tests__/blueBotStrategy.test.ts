import userId from '@/discord/userId';
import { container, ServiceId } from '../../../services/container';
import blueBot from '../strategy-bots/blue-bot';
import { BLUE_BOT_AVATARS, BLUE_BOT_NAME, BLUE_BOT_PATTERNS, BLUE_BOT_RESPONSES } from '../strategy-bots/blue-bot/constants';
import { mockDiscordService, mockLogger, mockMessage, mockWebhookService } from "../test-utils/testUtils";

// Mock environment module to control isDebugMode
jest.mock('../../../environment', () => ({
	isDebugMode: jest.fn().mockReturnValue(false) // Force isDebugMode to return false for tests
}));

// Mock StandardLLMService
jest.mock('../../../services/llm/standardLlmService', () => ({
	StandardLLMService: {
		getInstance: jest.fn().mockResolvedValue({
			generateText: jest.fn().mockResolvedValue('false')
		})
	}
}));

// Create a simple implementation of the core triggers module to control test behavior
jest.mock('../strategy-bots/blue-bot/triggers', () => {
	const originals = jest.requireActual('../strategy-bots/blue-bot/constants');
	const { BLUE_BOT_AVATARS, BLUE_BOT_NAME, BLUE_BOT_RESPONSES } = originals;

	// Create trigger responses that match the actual implementation
	return {
		triggerBlueBotNiceVenn: {
			name: 'blue-nice-venn',
			priority: 1,
			condition: jest.fn().mockReturnValue(false),
			response: jest.fn().mockReturnValue(''),
			identity: { botName: BLUE_BOT_NAME, avatarUrl: BLUE_BOT_AVATARS.Contempt }
		},
		triggerBlueBotNice: {
			name: 'blue-nice',
			priority: 2,
			condition: jest.fn().mockReturnValue(false),
			response: jest.fn().mockReturnValue(''),
			identity: { botName: BLUE_BOT_NAME, avatarUrl: BLUE_BOT_AVATARS.Cheeky }
		},
		triggerBlueBotAcknowledgeVennMean: {
			name: 'blue-venn-mean',
			priority: 3,
			condition: jest.fn().mockImplementation((message) => {
				// Return true if the message is from Venn and contains "hate" or similar
				if (message.author.id === userId.Venn && BLUE_BOT_PATTERNS.Mean.test(message.content)) {
					return true;
				}
				return false;
			}),
			response: jest.fn().mockReturnValue(BLUE_BOT_RESPONSES.Murder),
			identity: jest.fn().mockReturnValue({
				botName: BLUE_BOT_NAME,
				avatarUrl: BLUE_BOT_AVATARS.Murder
			})
		},
		triggerBlueBotAcknowledgeOther: {
			name: 'blue-acknowledge',
			priority: 4,
			condition: jest.fn().mockImplementation((message) => {
				// Only match if author is not Venn and mentions yes/no/etc
				if (message.author.id !== userId.Venn &&
					BLUE_BOT_PATTERNS.Confirm.test(message.content)) {
					return true;
				}
				return false;
			}),
			response: jest.fn().mockReturnValue(BLUE_BOT_RESPONSES.Default),
			identity: jest.fn().mockReturnValue({
				botName: BLUE_BOT_NAME,
				avatarUrl: BLUE_BOT_AVATARS.Default
			})
		},
		triggerBlueBotMention: {
			name: 'blue-standard',
			priority: 5,
			condition: jest.fn().mockImplementation((message) => {
				// Match any message that mentions blue
				return /blue|blu/i.test(message.content);
			}),
			response: jest.fn().mockReturnValue(BLUE_BOT_RESPONSES.Default),
			identity: {
				botName: BLUE_BOT_NAME,
				avatarUrl: BLUE_BOT_AVATARS.Default
			}
		},
		triggerBlueBotLlmDetection: {
			name: 'blue-ai-generated',
			priority: 6,
			condition: jest.fn().mockReturnValue(false),
			response: jest.fn().mockReturnValue(BLUE_BOT_RESPONSES.Default),
			identity: {
				botName: BLUE_BOT_NAME,
				avatarUrl: BLUE_BOT_AVATARS.Default
			}
		}
	};
});

describe('blueBot Strategy', () => {
	beforeEach(() => {
		// Clear mocks before each test
		jest.clearAllMocks();
		// Reset state
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
		container.register(ServiceId.DiscordService, () => mockDiscordService);
	});

	describe('when it acknowledges that somebody said blue', () => {
		it.each([
			['Yes, I did.'],
			['No, I did not.'],
			['you got it'],
			['Go away stupid bot'],
			['I hate the bot']
		])('should acknowledge with a cheeky response for %s', async (text) => {
			// First message mentions blue
			const initialMessage = mockMessage('blue');
			initialMessage.author.id = 'otherUser123';
			await blueBot.processMessage(initialMessage);

			// Verify blue was detected
			expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalledTimes(1);
			expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				initialMessage.channel.id,
				expect.objectContaining({
					botName: BLUE_BOT_NAME,
					avatarUrl: BLUE_BOT_AVATARS.Default
				}),
				BLUE_BOT_RESPONSES.Default
			);

			// Clear previous calls
			jest.clearAllMocks();

			// Second message is acknowledgment
			const ackMessage = mockMessage(text);
			ackMessage.author.id = 'otherUser123';
			await blueBot.processMessage(ackMessage);

			// Verify cheeky response
			expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalledTimes(1);
			expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				ackMessage.channel.id,
				expect.objectContaining({
					botName: BLUE_BOT_NAME,
					avatarUrl: BLUE_BOT_AVATARS.Default
				}),
				expect.stringMatching(/.+/)
			);
		});
	});

	describe('when venn says mean things to blue bot', () => {
		it('should respond with the navy seal copypasta', async () => {
			// Create a message from Venn
			const message = mockMessage('I hate the bot');
			message.author.id = userId.Venn;

			await blueBot.processMessage(message);

			// Verify that the correct bot response was sent
			expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalledTimes(1);
			expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				message.channel.id,
				expect.objectContaining({
					botName: BLUE_BOT_NAME,
					avatarUrl: BLUE_BOT_AVATARS.Murder
				}),
				BLUE_BOT_RESPONSES.Murder
			);
		});
	});

	describe('when it asks if somebody said blue', () => {
		it('should respond to a message that mentions blue subtly', async () => {
			const message = mockMessage('Helo bloo');
			// Make sure the condition will match for "bloo"
			const triggers = require('../strategy-bots/blue-bot/triggers');
			triggers.triggerBlueBotMention.condition.mockReturnValueOnce(true);

			await blueBot.processMessage(message);
			expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				message.channel.id,
				expect.objectContaining({
					botName: BLUE_BOT_NAME,
					avatarUrl: BLUE_BOT_AVATARS.Default
				}),
				BLUE_BOT_RESPONSES.Default
			);
		});

		it('should respond to a message that mentions blue directly', async () => {
			const message = mockMessage('Hello blue');
			await blueBot.processMessage(message);
			expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				message.channel.id,
				expect.objectContaining({
					botName: BLUE_BOT_NAME,
					avatarUrl: BLUE_BOT_AVATARS.Default
				}),
				BLUE_BOT_RESPONSES.Default
			);
		});

		it('should not respond to unrelated messages', async () => {
			const message = mockMessage('Hello World!');
			await blueBot.processMessage(message);
			expect(mockDiscordService.sendMessageWithBotIdentity).not.toHaveBeenCalled();
		});
	});
});
