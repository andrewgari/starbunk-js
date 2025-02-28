import { Message, TextChannel, User } from 'discord.js';
import createAttitudeBot from '../../../starbunk/bots/reply-bots/attitudeBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';
import { createMockWebhookService } from '../../mocks/serviceMocks';

/**
 * Unit tests for the AttitudeBot
 *
 * Tests the bot's configuration and message handling functionality
 */
describe('AttitudeBot', () => {
	let attitudeBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		attitudeBot = createAttitudeBot(mockWebhookService);
		jest.spyOn(mockWebhookService, 'writeMessage').mockImplementation(() => Promise.resolve({} as Message<boolean>));
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = attitudeBot.getIdentity();
			expect(identity.name).toBe('Xander Crews');
		});

		it('should have correct avatar URL', () => {
			const identity = attitudeBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://i.ytimg.com/vi/56PMgO3q2-A/sddefault.jpg');
		});
	});

	function isDiscordMessage(message: Partial<Message<boolean>>): message is Message<boolean> {
		return message.content !== undefined && message.author !== undefined;
	}

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'I can\'t do that';

			if (!isDiscordMessage(mockMessage)) {
				throw new Error('Invalid mock message setup');
			}

			await attitudeBot.handleMessage(mockMessage);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		describe('should respond to negative attitude messages', () => {
			const testCases = [
				{ description: '"I can\'t" messages', content: 'I can\'t do that' },
				{ description: '"you can\'t" messages', content: 'you can\'t do that' },
				{ description: '"they can\'t" messages', content: 'they can\'t do that' },
				{ description: '"we can\'t" messages', content: 'we can\'t do that' }
			];

			testCases.forEach(testCase => {
				it(`should respond to ${testCase.description}`, async () => {
					mockMessage.content = testCase.content;

					if (!isDiscordMessage(mockMessage)) {
						throw new Error('Invalid mock message setup');
					}

					await attitudeBot.handleMessage(mockMessage);
					expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
						mockMessage.channel as TextChannel,
						expect.objectContaining({
							username: 'Xander Crews',
							avatarURL: 'https://i.ytimg.com/vi/56PMgO3q2-A/sddefault.jpg',
							content: "Not with THAT attitude!!!"
						})
					);
				});
			});
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = 'Hello there!';

			if (!isDiscordMessage(mockMessage)) {
				throw new Error('Invalid mock message setup');
			}

			await attitudeBot.handleMessage(mockMessage);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
