import { Message, TextChannel, User } from 'discord.js';
import createAttitudeBot from '../../../starbunk/bots/reply-bots/attitudeBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';
import { createMockWebhookService } from '../../mocks/serviceMocks';

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

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'I can\'t do that';

			await attitudeBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "I can\'t" messages', async () => {
			mockMessage.content = 'I can\'t do that';

			await attitudeBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Xander Crews',
					avatarURL: 'https://i.ytimg.com/vi/56PMgO3q2-A/sddefault.jpg',
					content: "Not with THAT attitude!!!"
				})
			);
		});

		it('should respond to "you can\'t" messages', async () => {
			mockMessage.content = 'you can\'t do that';

			await attitudeBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Xander Crews',
					avatarURL: 'https://i.ytimg.com/vi/56PMgO3q2-A/sddefault.jpg',
					content: "Not with THAT attitude!!!"
				})
			);
		});

		it('should respond to "they can\'t" messages', async () => {
			mockMessage.content = 'they can\'t do that';

			await attitudeBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Xander Crews',
					avatarURL: 'https://i.ytimg.com/vi/56PMgO3q2-A/sddefault.jpg',
					content: "Not with THAT attitude!!!"
				})
			);
		});

		it('should respond to "we can\'t" messages', async () => {
			mockMessage.content = 'we can\'t do that';

			await attitudeBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Xander Crews',
					avatarURL: 'https://i.ytimg.com/vi/56PMgO3q2-A/sddefault.jpg',
					content: "Not with THAT attitude!!!"
				})
			);
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = 'Hello there!';

			await attitudeBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
