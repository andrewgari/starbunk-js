import { createMockCommandInteraction } from '@/__tests__/mocks/discordMocks';
import clearWebhooksCommand from '@/starbunk/commands/clearWebhooks';
import { ChatInputCommandInteraction, Guild, Webhook } from 'discord.js';

describe('ClearWebhooks Command', () => {
	let mockInteraction: ChatInputCommandInteraction;
	const mockWebhooks = [
		{
			name: 'Bunkbot-test1',
			delete: jest.fn().mockResolvedValue(undefined)
		},
		{
			name: 'Bunkbot-test2',
			delete: jest.fn().mockResolvedValue(undefined)
		},
		{
			name: 'OtherWebhook',
			delete: jest.fn().mockResolvedValue(undefined)
		}
	] as unknown as Webhook[];

	beforeEach(() => {
		mockInteraction = {
			...createMockCommandInteraction(),
			guild: {
				fetchWebhooks: jest.fn().mockResolvedValue(mockWebhooks)
			} as unknown as Guild,
			followUp: jest.fn().mockResolvedValue(undefined)
		} as unknown as ChatInputCommandInteraction;
	});

	it('should delete only Bunkbot webhooks', async () => {
		await clearWebhooksCommand.execute(mockInteraction);
		await Promise.all(mockWebhooks.map(w => w.delete));

		expect(mockInteraction.reply).toHaveBeenCalledWith({
			content: 'Clearing Webhooks now, boss',
			fetchReply: false,
			ephemeral: true
		});

		expect(mockWebhooks[0].delete).toHaveBeenCalled();
		expect(mockWebhooks[1].delete).toHaveBeenCalled();
		expect(mockWebhooks[2].delete).not.toHaveBeenCalled();

		expect(mockInteraction.followUp).toHaveBeenCalledWith({
			content: 'Deleting Bunkbot-test1',
			fetchReply: false,
			ephemeral: true
		});
		expect(mockInteraction.followUp).toHaveBeenCalledWith({
			content: 'Deleting Bunkbot-test2',
			fetchReply: false,
			ephemeral: true
		});
	});

	it('should have correct command data', () => {
		expect(clearWebhooksCommand.data.name).toBe('clearwebhooks');
		expect(clearWebhooksCommand.data.description).toBe('Clear all webhooks made by the bot');
		expect(clearWebhooksCommand.data.default_member_permissions).toBe('536870912'); // ManageWebhooks permission
	});
});
