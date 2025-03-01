// Mocks need to be at the very top, before any imports
import { mockWebhookServiceDefault } from '@/tests/mocks/serviceMocks';
jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());

// Import the model constants
import { AVATAR_URL, BOT_NAME, NEGATIVE_ATTITUDE_RESPONSE, TEST } from './attitudeBotModel';

// Real imports after all mocks
import { createMockGuildMember, createMockMessage } from "@/tests/mocks/discordMocks";
import { createMockWebhookService } from "@/tests/mocks/serviceMocks";
import { Message, TextChannel, User } from "discord.js";
import ReplyBot from "../../replyBot";
import createAttitudeBot from "./attitudeBot";

/**
 * Unit tests for the AttitudeBot
 *
 * Tests the bot's configuration and message handling functionality
 */
describe('AttitudeBot', () => {
	// Test fixtures
	let attitudeBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		// Arrange - Common setup for all tests
		jest.clearAllMocks();

		// Create mocks and bot instance
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage(TEST.USER_NAME);

		if (mockMessage.author) {
			Object.defineProperty(mockMessage.author, 'displayName', {
				value: TEST.USER_NAME,
				configurable: true
			});
		}

		attitudeBot = createAttitudeBot(mockWebhookService);
	});

	describe('identity', () => {
		it('should have correct name and avatar URL', () => {
			// Act
			const identity = attitudeBot.getIdentity();

			// Assert
			expect(identity.name).toBe(BOT_NAME);
			expect(identity.avatarUrl).toBe(AVATAR_URL);
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange
			const mockMember = createMockGuildMember(TEST.BOT_USER_ID, TEST.BOT_USER_NAME);
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = TEST.MESSAGE.I_CANT;

			// Act
			await attitudeBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		describe('should respond to negative attitude messages', () => {
			// Use the test cases from the model file
			TEST.NEGATIVE_ATTITUDE_CASES.forEach(testCase => {
				it(`should respond to ${testCase.description}`, async () => {
					// Arrange
					mockMessage.content = testCase.content;

					// Act
					await attitudeBot.handleMessage(mockMessage as Message<boolean>);

					// Assert
					expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
						mockMessage.channel as TextChannel,
						expect.objectContaining({
							username: BOT_NAME,
							avatarURL: AVATAR_URL,
							content: NEGATIVE_ATTITUDE_RESPONSE
						})
					);
				});
			});
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			mockMessage.content = TEST.MESSAGE.UNRELATED;

			// Act
			await attitudeBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
