import { ApplicationCommandOptionType, ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../../services/logger';
import { CampaignService } from '../services/campaignService';
import { NoteService } from '../services/noteService';

export async function handleNoteCommand(
	interaction: ChatInputCommandInteraction
): Promise<void> {
	try {
		const noteService = NoteService.getInstance();
		const campaignService = CampaignService.getInstance();

		// Get command options with proper type checking
		const content = interaction.options.getString('content');
		if (!content) {
			await interaction.reply({
				content: 'Note content is required.',
				ephemeral: true
			});
			return;
		}

		const tags = interaction.options.getString('tags');

		// Get the active campaign for this channel
		const campaigns = await campaignService.getActiveCampaigns();
		const campaign = campaigns.find(c => c.channelId === interaction.channelId);

		if (!campaign) {
			await interaction.reply({
				content: 'No active campaign in this channel. Use `/rpg campaign set-active` to set one.',
				ephemeral: true
			});
			return;
		}

		// Check if user is GM
		const isGM = campaign.gmId === interaction.user.id;

		// Parse tags if provided
		const parsedTags = tags?.split(',').map(tag => tag.trim()) || [];

		// Add the note
		await noteService.addNote({
			campaignId: campaign.id,
			adventureId: campaign.adventureId || 'default',
			content,
			userId: interaction.user.id,
			isGM,
			tags: parsedTags
		});

		await interaction.reply({
			content: 'Note added successfully! I\'ve categorized it based on its content.',
			ephemeral: true
		});
	} catch (error) {
		logger.error('Error handling note command:', error as Error);
		await interaction.reply({
			content: 'Failed to add note. Please try again.',
			ephemeral: true
		});
	}
}

export const noteCommand = {
	name: 'note',
	description: 'Add a note that will be automatically categorized',
	options: [
		{
			name: 'content',
			type: ApplicationCommandOptionType.String,
			description: 'The content of the note',
			required: true
		},
		{
			name: 'tags',
			type: ApplicationCommandOptionType.String,
			description: 'Optional comma-separated tags',
			required: false
		}
	]
} as const;
