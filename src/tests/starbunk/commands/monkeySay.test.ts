import { CommandInteraction, GuildMember, TextChannel } from 'discord.js';
import { getUserIdentity } from '../../../starbunk/bots/identity/userIdentity';
import { MessageSender, MonkeySayService, WebhookMessageSender } from '../../../starbunk/commands/monkeySay';
import { WebhookService } from '../../../webhooks/webhookService';

// Mock the getUserIdentity function
jest.mock('../../../starbunk/bots/identity/userIdentity');

describe('MonkeySay Command', () => {
	describe('WebhookMessageSender', () => {
		let mockWebhookService: Partial<WebhookService>;
		let sender: WebhookMessageSender;
		let mockChannel: Partial<TextChannel>;

		beforeEach(() => {
			mockWebhookService = {
				writeMessage: jest.fn().mockResolvedValue(undefined)
			};

			mockChannel = {
				id: 'channel-id',
				name: 'test-channel'
			} as Partial<TextChannel>;

			sender = new WebhookMessageSender(mockWebhookService as WebhookService);
		});

		it('should send message with correct parameters', async () => {
			const username = 'TestUser';
			const avatarURL = 'https://example.com/avatar.png';
			const content = 'Hello, world!';

			await sender.sendMessage(mockChannel as TextChannel, username, avatarURL, content);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockChannel,
				{
					username,
					avatarURL,
					content,
					embeds: []
				}
			);
		});
	});

	describe('MonkeySayService', () => {
		let mockMessageSender: MessageSender;
		let service: MonkeySayService;
		let mockInteraction: Partial<CommandInteraction>;
		let mockMember: GuildMember;
		let mockChannel: Partial<TextChannel>;

		beforeEach(() => {
			mockMessageSender = {
				sendMessage: jest.fn().mockResolvedValue(undefined)
			};

			mockChannel = {
				id: 'channel-id',
				name: 'test-channel'
			} as Partial<TextChannel>;

			mockMember = {
				id: 'user-id',
				nickname: 'TestNickname',
				displayAvatarURL: jest.fn().mockReturnValue('https://example.com/member-avatar.png')
			} as unknown as GuildMember;

			mockInteraction = {
				channel: mockChannel as TextChannel,
				reply: jest.fn().mockResolvedValue(undefined)
			} as unknown as Partial<CommandInteraction>;

			service = new MonkeySayService(mockMessageSender);

			// Mock getUserIdentity to return a default identity
			(getUserIdentity as jest.Mock).mockResolvedValue({
				name: 'TestNickname',
				avatarUrl: 'https://example.com/member-avatar.png'
			});
		});

		it('should use member nickname and avatar when available', async () => {
			const message = 'Hello, world!';

			await service.impersonateUser(
				mockInteraction as CommandInteraction,
				mockMember,
				message
			);

			expect(getUserIdentity).toHaveBeenCalledWith(mockMember);
			expect(mockMessageSender.sendMessage).toHaveBeenCalledWith(
				mockChannel,
				'TestNickname',
				'https://example.com/member-avatar.png',
				message
			);

			expect(mockInteraction.reply).toHaveBeenCalledWith({
				content: 'Message sent!',
				ephemeral: true
			});
		});

		it('should fall back to user username when nickname is not available', async () => {
			const message = 'Hello, world!';

			// Mock getUserIdentity to return a username instead of nickname
			(getUserIdentity as jest.Mock).mockResolvedValue({
				name: 'TestUser',
				avatarUrl: 'https://example.com/member-avatar.png'
			});

			await service.impersonateUser(
				mockInteraction as CommandInteraction,
				mockMember,
				message
			);

			expect(mockMessageSender.sendMessage).toHaveBeenCalledWith(
				mockChannel,
				'TestUser',
				'https://example.com/member-avatar.png',
				message
			);
		});

		it('should fall back to user avatar when member avatar is not available', async () => {
			const message = 'Hello, world!';

			// Mock getUserIdentity to return a default avatar
			(getUserIdentity as jest.Mock).mockResolvedValue({
				name: 'TestNickname',
				avatarUrl: 'https://example.com/default-avatar.png'
			});

			await service.impersonateUser(
				mockInteraction as CommandInteraction,
				mockMember,
				message
			);

			expect(mockMessageSender.sendMessage).toHaveBeenCalledWith(
				mockChannel,
				'TestNickname',
				'https://example.com/default-avatar.png',
				message
			);
		});

		it('should handle errors when sending message', async () => {
			const message = 'Hello, world!';
			const error = new Error('Failed to send message');

			(mockMessageSender.sendMessage as jest.Mock).mockRejectedValue(error);

			// Mock console.error to prevent test output pollution
			const originalConsoleError = console.error;
			console.error = jest.fn();

			try {
				await expect(
					service.impersonateUser(
						mockInteraction as CommandInteraction,
						mockMember,
						message
					)
				).rejects.toThrow(error);
			} finally {
				// Restore console.error
				console.error = originalConsoleError;
			}
		});
	});
});
