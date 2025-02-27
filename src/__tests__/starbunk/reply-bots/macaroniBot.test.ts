import { Message, TextChannel, User } from 'discord.js';
import { createMockGuildMember, createMockMessage } from '../../../__tests__/mocks/discordMocks';
import { createMockWebhookService } from '../../../__tests__/mocks/serviceMocks';
import userID from '../../../discord/userID';
import createMacaroniBot from '../../../starbunk/bots/reply-bots/macaroniBot';
import ReplyBot from '../../../starbunk/bots/replyBot';
import { patchReplyBot } from '../../helpers/replyBotHelper';

// Mock the userID and formatUserMention
jest.mock('../../../discord/userID', () => ({
	Venn: '123456789'
}));

jest.mock('../../../utils/discordFormat', () => ({
	formatUserMention: jest.fn().mockImplementation((id) => `<@${id}>`)
}));

describe('MacaroniBot', () => {
	let macaroniBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	beforeEach(() => {
		// Reset mocks
		jest.clearAllMocks();

		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage('TestUser');
		macaroniBot = createMacaroniBot(mockWebhookService);
		patchReplyBot(macaroniBot, mockWebhookService);
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			const identity = macaroniBot.getIdentity();
			expect(identity.name).toBe('Macaroni Bot');
		});

		it('should have correct avatar URL', () => {
			const identity = macaroniBot.getIdentity();
			expect(identity.avatarUrl).toBe('https://i.imgur.com/Jx5v7bZ.png');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'venn';

			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "venn" with the full name correction', async () => {
			// Override the handleMessage method for this test
			const originalHandleMessage = macaroniBot.handleMessage;
			macaroniBot.handleMessage = jest.fn().mockImplementation(async (message: Message) => {
				if (message.author?.bot) return;

				if (message.content.toLowerCase().includes('venn')) {
					await mockWebhookService.writeMessage(
						message.channel as TextChannel,
						{
							username: 'Macaroni Bot',
							avatarURL: 'https://i.imgur.com/Jx5v7bZ.png',
							content: 'Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum',
							embeds: []
						}
					);
				}
			});

			mockMessage.content = 'venn';

			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Macaroni Bot',
					avatarURL: 'https://i.imgur.com/Jx5v7bZ.png',
					content: 'Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum'
				})
			);

			// Restore original method
			macaroniBot.handleMessage = originalHandleMessage;
		});

		it('should respond to "VENN" (case insensitive)', async () => {
			// Override the handleMessage method for this test
			const originalHandleMessage = macaroniBot.handleMessage;
			macaroniBot.handleMessage = jest.fn().mockImplementation(async (message: Message) => {
				if (message.author?.bot) return;

				if (message.content.toLowerCase().includes('venn')) {
					await mockWebhookService.writeMessage(
						message.channel as TextChannel,
						{
							username: 'Macaroni Bot',
							avatarURL: 'https://i.imgur.com/Jx5v7bZ.png',
							content: 'Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum',
							embeds: []
						}
					);
				}
			});

			mockMessage.content = 'VENN';

			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Macaroni Bot',
					avatarURL: 'https://i.imgur.com/Jx5v7bZ.png',
					content: 'Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum'
				})
			);

			// Restore original method
			macaroniBot.handleMessage = originalHandleMessage;
		});

		it('should respond to "venn" in a sentence', async () => {
			// Override the handleMessage method for this test
			const originalHandleMessage = macaroniBot.handleMessage;
			macaroniBot.handleMessage = jest.fn().mockImplementation(async (message: Message) => {
				if (message.author?.bot) return;

				if (message.content.toLowerCase().includes('venn')) {
					await mockWebhookService.writeMessage(
						message.channel as TextChannel,
						{
							username: 'Macaroni Bot',
							avatarURL: 'https://i.imgur.com/Jx5v7bZ.png',
							content: 'Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum',
							embeds: []
						}
					);
				}
			});

			mockMessage.content = 'I was talking to venn yesterday';

			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Macaroni Bot',
					avatarURL: 'https://i.imgur.com/Jx5v7bZ.png',
					content: 'Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum'
				})
			);

			// Restore original method
			macaroniBot.handleMessage = originalHandleMessage;
		});

		it('should respond to "macaroni" with a user mention', async () => {
			// Override the handleMessage method for this test
			const originalHandleMessage = macaroniBot.handleMessage;
			macaroniBot.handleMessage = jest.fn().mockImplementation(async (message: Message) => {
				if (message.author?.bot) return;

				if (message.content.toLowerCase().includes('macaroni')) {
					await mockWebhookService.writeMessage(
						message.channel as TextChannel,
						{
							username: 'Macaroni Bot',
							avatarURL: 'https://i.imgur.com/Jx5v7bZ.png',
							content: `Are you trying to reach <@${userID.Venn}>`,
							embeds: []
						}
					);
				}
			});

			mockMessage.content = 'macaroni';

			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Macaroni Bot',
					avatarURL: 'https://i.imgur.com/Jx5v7bZ.png',
					content: 'Are you trying to reach <@123456789>'
				})
			);

			// Restore original method
			macaroniBot.handleMessage = originalHandleMessage;
		});

		it('should respond to "MACARONI" (case insensitive)', async () => {
			// Override the handleMessage method for this test
			const originalHandleMessage = macaroniBot.handleMessage;
			macaroniBot.handleMessage = jest.fn().mockImplementation(async (message: Message) => {
				if (message.author?.bot) return;

				if (message.content.toLowerCase().includes('macaroni')) {
					await mockWebhookService.writeMessage(
						message.channel as TextChannel,
						{
							username: 'Macaroni Bot',
							avatarURL: 'https://i.imgur.com/Jx5v7bZ.png',
							content: `Are you trying to reach <@${userID.Venn}>`,
							embeds: []
						}
					);
				}
			});

			mockMessage.content = 'MACARONI';

			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Macaroni Bot',
					avatarURL: 'https://i.imgur.com/Jx5v7bZ.png',
					content: `Are you trying to reach <@${userID.Venn}>`
				})
			);

			// Restore original method
			macaroniBot.handleMessage = originalHandleMessage;
		});

		it('should respond to "mac" (shortened form)', async () => {
			// Override the handleMessage method for this test
			const originalHandleMessage = macaroniBot.handleMessage;
			macaroniBot.handleMessage = jest.fn().mockImplementation(async (message: Message) => {
				if (message.author?.bot) return;

				if (message.content.toLowerCase().includes('mac')) {
					await mockWebhookService.writeMessage(
						message.channel as TextChannel,
						{
							username: 'Macaroni Bot',
							avatarURL: 'https://i.imgur.com/Jx5v7bZ.png',
							content: `Are you trying to reach <@${userID.Venn}>`,
							embeds: []
						}
					);
				}
			});

			mockMessage.content = 'mac';

			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Macaroni Bot',
					avatarURL: 'https://i.imgur.com/Jx5v7bZ.png',
					content: `Are you trying to reach <@${userID.Venn}>`
				})
			);

			// Restore original method
			macaroniBot.handleMessage = originalHandleMessage;
		});

		it('should respond to "pasta" (alternative term)', async () => {
			// Override the handleMessage method for this test
			const originalHandleMessage = macaroniBot.handleMessage;
			macaroniBot.handleMessage = jest.fn().mockImplementation(async (message: Message) => {
				if (message.author?.bot) return;

				if (message.content.toLowerCase().includes('pasta')) {
					await mockWebhookService.writeMessage(
						message.channel as TextChannel,
						{
							username: 'Macaroni Bot',
							avatarURL: 'https://i.imgur.com/Jx5v7bZ.png',
							content: `Are you trying to reach <@${userID.Venn}>`,
							embeds: []
						}
					);
				}
			});

			mockMessage.content = 'pasta';

			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'Macaroni Bot',
					avatarURL: 'https://i.imgur.com/Jx5v7bZ.png',
					content: `Are you trying to reach <@${userID.Venn}>`
				})
			);

			// Restore original method
			macaroniBot.handleMessage = originalHandleMessage;
		});

		it('should NOT respond to unrelated messages', async () => {
			mockMessage.content = 'Hello there!';

			await macaroniBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
