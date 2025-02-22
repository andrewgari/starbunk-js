import { createMockGuildMember, createMockMessage } from '@/__tests__/mocks/discordMocks';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import userID from '@/discord/userID';
import GuyBot from '@/starbunk/bots/reply-bots/guyBot';
import Random from '@/utils/random';
import { Guild, GuildMember, Message, User } from 'discord.js';

jest.mock('@/utils/random');

describe('GuyBot', () => {
	let guyBot: GuyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;
	let mockGuy: GuildMember;

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockGuy = {
			...createMockGuildMember(userID.Guy, 'Guy'),
			nickname: 'Guy',
			displayName: 'Guy',
			avatarURL: () => 'guy-avatar-url',
			displayAvatarURL: () => 'guy-display-avatar-url'
		} as unknown as GuildMember;

		mockMessage = {
			...createMockMessage('Guy'),
			guild: {
				members: {
					fetch: jest.fn().mockResolvedValue(mockGuy)
				}
			} as unknown as Guild
		};

		guyBot = new GuyBot(mockWebhookService);
		jest.clearAllMocks();
	});

	describe('bot configuration', () => {
		it('should have correct initial name', () => {
			expect(guyBot.getBotName()).toBe('GuyBot');
		});

		it('should have empty initial avatar URL', () => {
			expect(guyBot.getAvatarUrl()).toBe('');
		});
	});

	describe('message handling', () => {
		beforeEach(() => {
			jest.spyOn(Random, 'roll').mockReturnValue(0);
		});

		it('should ignore messages from bots', () => {
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			guyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to messages containing "guy"', async () => {
			mockMessage.content = 'hey guy what\'s up';
			await guyBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockMessage.guild?.members.fetch).toHaveBeenCalledWith(userID.Guy);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					username: 'Guy',
					avatarURL: 'guy-avatar-url'
				})
			);
		});

		it('should respond to Guy\'s messages with 5% chance', async () => {
			mockMessage.content = 'regular message';
			mockMessage.author = { id: userID.Guy } as User;
			(Random.percentChance as jest.Mock).mockReturnValue(true);

			await guyBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					username: 'Guy'
				})
			);
		});

		it('should not respond to Guy\'s messages with 95% chance', () => {
			mockMessage.content = 'regular message';
			mockMessage.author = { id: userID.Guy } as User;
			(Random.percentChance as jest.Mock).mockReturnValue(false);

			guyBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should use random responses', async () => {
			mockMessage.content = 'guy';
			const responses = new Set();

			for (let i = 0; i < 5; i++) {
				jest.spyOn(Random, 'roll').mockReturnValue(i);
				await guyBot.handleMessage(mockMessage as Message<boolean>);
				const call = (mockWebhookService.writeMessage as jest.Mock).mock.calls[i];
				responses.add(call[1].content);
			}

			expect(responses.size).toBeGreaterThan(1);
		});

		it('should use display name if nickname is not available', async () => {
			mockMessage.content = 'guy';
			mockGuy.nickname = null;

			await guyBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					username: 'Guy'
				})
			);
		});

		it('should use display avatar URL if avatar URL is not available', async () => {
			mockMessage.content = 'guy';
			mockGuy.avatarURL = () => null;

			await guyBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel,
				expect.objectContaining({
					avatarURL: 'guy-display-avatar-url'
				})
			);
		});
	});
});
