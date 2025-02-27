import guildIDs from '@/discord/guildIDs';
import { MessageInfo } from '@/discord/messageInfo';
import webhookService from '@/webhooks/webhookService';
import { TextChannel, Webhook } from 'discord.js';

describe('WebhookService', () => {
	const mockWebhook = {
		name: 'StarBunkBunkbot-test-channel',
		send: jest.fn().mockResolvedValue({ id: 'message-id' })
	} as unknown as Webhook;

	const mockChannel = {
		name: 'test-channel',
		guild: {
			id: 'default-guild-id'
		},
		fetchWebhooks: jest.fn().mockResolvedValue(new Map([[mockWebhook.name, mockWebhook]])),
		createWebhook: jest.fn().mockResolvedValue(mockWebhook)
	} as unknown as TextChannel;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getWebhookName', () => {
		it('should return StarBunk name for regular guild', () => {
			const name = webhookService.getWebhookName('test-channel', false);
			expect(name).toBe('StarBunkBunkbot-test-channel');
		});

		it('should return Snowbunk name for Snowfall guild', () => {
			const name = webhookService.getWebhookName('test-channel', true);
			expect(name).toBe('SnowbunkBunkbot-test-channel');
		});
	});

	describe('getChannelWebhook', () => {
		it('should return existing webhook if found', async () => {
			const webhook = await webhookService.getChannelWebhook(mockChannel);
			expect(webhook).toBe(mockWebhook);
			expect(mockChannel.createWebhook).not.toHaveBeenCalled();
		});

		it('should create new webhook if none exists', async () => {
			const emptyChannel = {
				...mockChannel,
				fetchWebhooks: jest.fn().mockResolvedValue(new Map())
			} as unknown as TextChannel;

			await webhookService.getChannelWebhook(emptyChannel);
			expect(emptyChannel.createWebhook).toHaveBeenCalledWith({
				name: 'StarBunkBunkbot-test-channel',
				avatar: expect.any(String)
			});
		});

		it('should handle Snowfall guild correctly', async () => {
			const snowfallChannel = {
				...mockChannel,
				guild: { id: guildIDs.Snowfall }
			} as unknown as TextChannel;

			await webhookService.getChannelWebhook(snowfallChannel);
			expect(snowfallChannel.createWebhook).toHaveBeenCalledWith({
				name: 'SnowbunkBunkbot-test-channel',
				avatar: expect.any(String)
			});
		});
	});

	describe('writeMessage', () => {
		const mockMessage: MessageInfo = {
			content: 'test message',
			username: 'test user',
			avatarURL: 'test-avatar',
			embeds: [] as const
		};

		it('should send message through webhook', async () => {
			await webhookService.writeMessage(mockChannel, mockMessage);
			expect(mockWebhook.send).toHaveBeenCalledWith(mockMessage);
		});

		it('should reject if webhook not found', async () => {
			const channelWithoutWebhook = {
				...mockChannel,
				fetchWebhooks: jest.fn().mockResolvedValue(new Map()),
				createWebhook: jest.fn().mockResolvedValue(null)
			} as unknown as TextChannel;

			await expect(webhookService.writeMessage(channelWithoutWebhook, mockMessage))
				.rejects
				.toBe('Could not find webhook');
		});

		it('should handle webhook send errors', async () => {
			const errorWebhook = {
				...mockWebhook,
				send: jest.fn().mockRejectedValue(new Error('Send failed'))
			};

			const channelWithErrorWebhook = {
				...mockChannel,
				fetchWebhooks: jest.fn().mockResolvedValue(new Map([[mockWebhook.name, errorWebhook]]))
			} as unknown as TextChannel;

			const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
			await expect(webhookService.writeMessage(channelWithErrorWebhook, mockMessage))
				.rejects.toEqual(expect.any(Error));
			expect(consoleSpy).toHaveBeenCalledWith('Failed to send message', expect.any(Error));
			consoleSpy.mockRestore();
		});
	});
});
