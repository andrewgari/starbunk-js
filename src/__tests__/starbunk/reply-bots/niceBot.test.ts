import { Message, TextChannel, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import createNiceBot from '../../../starbunk/bots/reply-bots/niceBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';

describe('NiceBot', () => {
	let niceBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		niceBot = createNiceBot(mockWebhookService);
		patchReplyBot(niceBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = niceBot.getIdentity();
			expect(identity.name).toBe('BunkBot');
		});

		it('should have correct avatar URL', () => {
			const identity = niceBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx.jpeg');
		});
	});

	describe('message handling', () => {
		const expectedResponse = 'Nice.';

		const expectedMessageOptions = {
			username: 'BunkBot',
			avatarURL: 'https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx.jpeg',
			content: expectedResponse,
			embeds: []
		};

		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = '69';

			await niceBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "69"', async () => {
			mockMessage.content = '69';

			await niceBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: expectedMessageOptions.username,
					avatarURL: expectedMessageOptions.avatarURL,
					content: expectedMessageOptions.content
				})
			);
		});

		it('should respond to "69" in a sentence', async () => {
			mockMessage.content = 'The answer is 69 my friend';

			await niceBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: expectedMessageOptions.username,
					avatarURL: expectedMessageOptions.avatarURL,
					content: expectedMessageOptions.content
				})
			);
		});

		it('should respond to "sixty-nine"', async () => {
			mockMessage.content = 'sixty-nine';

			await niceBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: expectedMessageOptions.username,
					avatarURL: expectedMessageOptions.avatarURL,
					content: expectedMessageOptions.content
				})
			);
		});

		it('should respond to "sixtynine"', async () => {
			mockMessage.content = 'sixtynine';

			await niceBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: expectedMessageOptions.username,
					avatarURL: expectedMessageOptions.avatarURL,
					content: expectedMessageOptions.content
				})
			);
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = 'Hello there!';

			await niceBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to other numbers', async () => {
			mockMessage.content = '420';

			await niceBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
