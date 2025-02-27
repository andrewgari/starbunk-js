import { CommandInteraction, GuildMember, TextChannel, User } from 'discord.js';
import { MessageSender, MonkeySayService, WebhookMessageSender } from '../../../starbunk/commands/monkeySay';
import { WebhookService } from '../../../webhooks/webhookService';

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
		let mockUser: User;
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

			mockUser = {
				id: 'user-id',
				username: 'TestUser',
				displayAvatarURL: jest.fn().mockReturnValue('https://example.com/default-avatar.png')
			} as unknown as User;

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
		});

		it('should use member nickname and avatar when available', async () => {
			const message = 'Hello, world!';

			await service.impersonateUser(
				mockInteraction as CommandInteraction,
				mockUser,
				mockMember,
				message
			);

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
			mockMember.nickname = null;

			await service.impersonateUser(
				mockInteraction as CommandInteraction,
				mockUser,
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
			(mockMember.displayAvatarURL as jest.Mock).mockReturnValue(null);

			await service.impersonateUser(
				mockInteraction as CommandInteraction,
				mockUser,
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
						mockUser,
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
