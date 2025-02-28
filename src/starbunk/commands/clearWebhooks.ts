import { CommandInteraction, PermissionFlagsBits, SlashCommandBuilder, Webhook } from 'discord.js';

// Interface for webhook filter strategy
export interface WebhookFilter {
	shouldDelete(webhook: Webhook): boolean;
}

// Implementation for Bunkbot webhooks
export class BunkbotWebhookFilter implements WebhookFilter {
	private readonly prefix: string;

	constructor(prefix: string = 'Bunkbot-') {
		this.prefix = prefix;
	}

	shouldDelete(webhook: Webhook): boolean {
		return webhook.name.startsWith(this.prefix);
	}
}

// Service for webhook operations
export class WebhookCleanupService {
	private readonly filter: WebhookFilter;

	constructor(filter: WebhookFilter) {
		this.filter = filter;
	}

	async cleanupWebhooks(interaction: CommandInteraction): Promise<void> {
		// Check if guild exists before attempting to fetch webhooks
		if (!interaction.guild) {
			await interaction.followUp({
				content: 'This command can only be used in a server, not in DMs.',
				ephemeral: true
			});
			return;
		}

		const webhooks = await interaction.guild.fetchWebhooks();

		if (!webhooks) {
			return;
		}

		const deletionPromises: Promise<void>[] = [];

		webhooks.forEach(async (webhook: Webhook) => {
			if (this.filter.shouldDelete(webhook)) {
				await interaction.followUp({
					content: `Deleting ${webhook.name}`,
					fetchReply: false,
					ephemeral: true,
				});

				deletionPromises.push(webhook.delete());
			}
		});

		// Wait for all deletions to complete
		await Promise.all(deletionPromises).catch(console.error);
	}
}

// Command definition
export default {
	data: new SlashCommandBuilder()
		.setName('clearwebhooks')
		.setDescription('Clear all webhooks made by the bot')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks),

	async execute(interaction: CommandInteraction) {
		// Check if the command is being used in a guild
		if (!interaction.guild) {
			await interaction.reply({
				content: 'This command can only be used in a server, not in DMs.',
				ephemeral: true
			});
			return;
		}

		await interaction.reply({
			content: 'Clearing Webhooks now, boss',
			fetchReply: false,
			ephemeral: true,
		});

		// Create service with default filter
		const filter = new BunkbotWebhookFilter();
		const cleanupService = new WebhookCleanupService(filter);

		try {
			await cleanupService.cleanupWebhooks(interaction);
		} catch (error) {
			console.error('Error cleaning up webhooks:', error);
			await interaction.followUp({
				content: 'An error occurred while clearing webhooks',
				ephemeral: true
			});
		}
	},
};
