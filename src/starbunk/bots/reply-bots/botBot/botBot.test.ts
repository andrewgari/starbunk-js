// Mocks need to be at the very top, before any imports
import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

// Import the model constants
import { AVATAR_URL, BOT_GREETING, BOT_NAME, TEST } from './botBotModel';

// Create variables to control mock behaviors
let randomChanceShouldTrigger = true;

jest.mock('@/starbunk/bots/triggers/conditions/randomChanceCondition', () => {
	return {
		RandomChanceCondition: jest.fn().mockImplementation(() => ({
			shouldTrigger: jest.fn().mockImplementation((message) => {
				// Only trigger on messages containing "bot" or from bot users
				if (message &&
					((message.content && message.content.toLowerCase().includes('bot')) ||
						(message.author && message.author.bot))) {
					return Promise.resolve(randomChanceShouldTrigger);
				}
				return Promise.resolve(false);
			})
		}))
	};
});

// Real imports after all mocks
import { createMockGuildMember, createMockMessage } from "@/tests/mocks/discordMocks";
import webhookService from "@/webhooks/webhookService";
import { Message, TextChannel, User } from "discord.js";
import ReplyBot from "../../replyBot";
import createBotBot from "./botBot";

describe('BotBot', () => {
	// Test fixtures
	let botBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;

	beforeEach(() => {
		// Arrange - Common setup for all tests
		jest.clearAllMocks();

		// Reset variables
		randomChanceShouldTrigger = true;

		// Create message mock
		mockMessage = createMockMessage(TEST.USER_NAME);
		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: TEST.USER_NAME,
				configurable: true
			});
		}

		// Create bot instance
		botBot = createBotBot();
	});

	describe('identity', () => {
		it('should have correct name and avatar URL', () => {
			// Act
			const identity = botBot.getIdentity();

			// Assert
			expect(identity.name).toBe(BOT_NAME);
			expect(identity.avatarUrl).toBe(AVATAR_URL);
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots when not triggered by random chance', async () => {
			// Arrange
			randomChanceShouldTrigger = TEST.CONDITIONS.NO_TRIGGER;
			const mockMember = createMockGuildMember(TEST.BOT_USER_ID);
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = TEST.MESSAGE.UNRELATED;

			// Act
			await botBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to messages from bots when triggered by random chance', async () => {
			// Arrange
			randomChanceShouldTrigger = TEST.CONDITIONS.TRIGGER;
			const mockMember = createMockGuildMember(TEST.BOT_USER_ID);
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = TEST.MESSAGE.UNRELATED;

			// Act
			await botBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: BOT_GREETING
				})
			);
		});

		it('should respond to "bot" when random chance is met', async () => {
			// Arrange
			randomChanceShouldTrigger = TEST.CONDITIONS.TRIGGER;
			mockMessage.content = TEST.MESSAGE.BOT;

			// Act
			await botBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: BOT_NAME,
					avatarURL: AVATAR_URL,
					content: BOT_GREETING
				})
			);
		});

		it('should NOT respond to "bot" when random chance is not met', async () => {
			// Arrange
			randomChanceShouldTrigger = TEST.CONDITIONS.NO_TRIGGER;
			mockMessage.content = TEST.MESSAGE.BOT;

			// Act
			await botBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.UNRELATED;

			// Act
			await botBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(webhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
