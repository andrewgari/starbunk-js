import {
	ChatInputCommandInteraction,
	GuildChannel,
	GuildMember,
	SlashCommandBuilder
} from 'discord.js';
import { logger } from '../../services/logger';
import { CampaignService } from '../services/campaignService';
import { HelpService } from '../services/helpService';
import { GameLLMService } from '../services/llmService';
import { VectorService } from '../services/vectorService';
import { SUPPORTED_SYSTEMS } from '../types/game';
import { getCampaignContext, getCampaignPermissions } from '../utils/campaignChecks';

const data = new SlashCommandBuilder()
	.setName('rpg')
	.setDescription('RPG game management commands')
	.addSubcommandGroup(group =>
		group
			.setName('campaign')
			.setDescription('Campaign management commands')
			.addSubcommand(subcommand =>
				subcommand
					.setName('create')
					.setDescription('Create a new campaign')
					.addStringOption(option =>
						option
							.setName('name')
							.setDescription('Campaign name')
							.setRequired(true)
					)
					.addStringOption(option =>
						option
							.setName('system')
							.setDescription('Game system')
							.setRequired(true)
							.addChoices(
								...Object.entries(SUPPORTED_SYSTEMS).map(([key, system]) => ({
									name: system.name,
									value: key
								}))
							)
					)
					.addStringOption(option =>
						option
							.setName('help')
							.setDescription('Get help with this command')
					)
			)
			.addSubcommand(subcommand =>
				subcommand
					.setName('list')
					.setDescription('List all campaigns')
					.addStringOption(option =>
						option
							.setName('help')
							.setDescription('Get help with this command')
					)
			)
			.addSubcommand(subcommand =>
				subcommand
					.setName('set-active')
					.setDescription('Set a campaign as active in the current channel')
					.addStringOption(option =>
						option
							.setName('campaign')
							.setDescription('Campaign name')
							.setRequired(true)
					)
					.addStringOption(option =>
						option
							.setName('help')
							.setDescription('Get help with this command')
					)
			)
			.addSubcommand(subcommand =>
				subcommand
					.setName('rename')
					.setDescription('Rename the current campaign')
					.addStringOption(option =>
						option
							.setName('name')
							.setDescription('New campaign name')
							.setRequired(true)
					)
					.addStringOption(option =>
						option
							.setName('help')
							.setDescription('Get help with this command')
					)
			)
	)
	.addSubcommandGroup(group =>
		group
			.setName('vector')
			.setDescription('Vector database management commands')
			.addSubcommand(subcommand =>
				subcommand
					.setName('build')
					.setDescription('Build vector database for the current campaign')
					.addBooleanOption(option =>
						option
							.setName('include_gm')
							.setDescription('Include GM-only content in the vector database')
					)
					.addStringOption(option =>
						option
							.setName('model')
							.setDescription('Vector model to use (optional)')
					)
					.addIntegerOption(option =>
						option
							.setName('chunk_size')
							.setDescription('Size of text chunks (optional)')
					)
					.addStringOption(option =>
						option
							.setName('help')
							.setDescription('Get help with this command')
					)
			)
	)
	.addSubcommandGroup(group =>
		group
			.setName('game')
			.setDescription('Game management commands')
			.addSubcommand(subcommand =>
				subcommand
					.setName('ask')
					.setDescription('Ask a question about the game')
					.addStringOption(option =>
						option
							.setName('question')
							.setDescription('Your question about the game')
							.setRequired(true)
					)
					.addStringOption(option =>
						option
							.setName('help')
							.setDescription('Get help with this command')
					)
			)
	)
	.addSubcommandGroup(group =>
		group
			.setName('session')
			.setDescription('Session management commands')
			.addSubcommand(subcommand =>
				subcommand
					.setName('schedule')
					.setDescription('Schedule a gaming session')
					.addStringOption(option =>
						option
							.setName('date')
							.setDescription('Session date and time (YYYY-MM-DD HH:mm)')
							.setRequired(true)
					)
					.addStringOption(option =>
						option
							.setName('title')
							.setDescription('Session title')
							.setRequired(true)
					)
					.addStringOption(option =>
						option
							.setName('description')
							.setDescription('Session description')
					)
					.addBooleanOption(option =>
						option
							.setName('recurring')
							.setDescription('Whether this is a recurring session')
					)
					.addStringOption(option =>
						option
							.setName('interval')
							.setDescription('Recurring interval (if recurring)')
							.addChoices(
								{ name: 'Weekly', value: 'weekly' },
								{ name: 'Biweekly', value: 'biweekly' },
								{ name: 'Monthly', value: 'monthly' }
							)
					)
					.addStringOption(option =>
						option
							.setName('help')
							.setDescription('Get help with this command')
					)
			)
	);

export default {
	data: data.toJSON(),
	async execute(interaction: ChatInputCommandInteraction): Promise<void> {
		try {
			const group = interaction.options.getSubcommandGroup(false);
			const subcommand = interaction.options.getSubcommand();

			// Get campaign context and permissions
			const member = interaction.member as GuildMember;
			const context = getCampaignContext(member, interaction.channelId);
			const permissions = await getCampaignPermissions(context);

			// Get campaign service instance
			const campaignService = CampaignService.getInstance();
			const helpService = HelpService.getInstance();

			// Skip campaign check for campaign create and list commands
			const skipCampaignCheck = group === 'campaign' && (subcommand === 'create' || subcommand === 'list');

			// Get the campaign for the current channel
			const activeCampaign = await campaignService.getCampaignByChannel(interaction.channelId);
			if (!activeCampaign && !skipCampaignCheck) {
				await interaction.reply({
					content: 'This channel is not associated with any active campaign. Use `/rpg campaign create` to create one.',
					ephemeral: true
				});
				return;
			}

			// Handle help option for any subcommand
			const helpTopic = interaction.options.getString('help');
			if (helpTopic !== null) {
				const helpContent = await helpService.getRelevantHelp(`${group} ${subcommand}`, permissions.canManageCampaign);
				await interaction.reply({
					content: helpService.formatHelpContent(helpContent),
					ephemeral: true
				});
				return;
			}

			// Campaign Management Commands
			if (group === 'campaign') {
				switch (subcommand) {
					case 'create': {
						if (!permissions.canManageCampaign) {
							await interaction.reply({
								content: 'You do not have permission to create campaigns.',
								ephemeral: true
							});
							return;
						}

						const name = interaction.options.getString('name', true);
						const systemId = interaction.options.getString('system', true);
						const system = SUPPORTED_SYSTEMS[systemId];

						if (!interaction.channel?.isTextBased() || !(interaction.channel instanceof GuildChannel)) {
							await interaction.reply({
								content: 'This command can only be used in guild text channels.',
								ephemeral: true
							});
							return;
						}

						await campaignService.createCampaign(
							interaction.channel,
							name,
							system,
							interaction.user.id
						);

						await interaction.reply({
							content: `Campaign "${name}" created successfully! Use \`/rpg campaign set-active\` to set it as the active campaign in a channel.`,
							ephemeral: true
						});
						break;
					}

					case 'list': {
						const campaigns = await campaignService.listCampaigns();
						if (campaigns.length === 0) {
							await interaction.reply({
								content: 'No campaigns found. Use `/rpg campaign create` to create one.',
								ephemeral: true
							});
							return;
						}

						const campaignList = campaigns
							.map(c => `• **${c.name}** (${c.system.name})`)
							.join('\n');

						await interaction.reply({
							content: `**Available Campaigns:**\n${campaignList}`,
							ephemeral: true
						});
						break;
					}

					case 'set-active': {
						if (!permissions.canManageCampaign) {
							await interaction.reply({
								content: 'You do not have permission to manage campaigns.',
								ephemeral: true
							});
							return;
						}

						const campaignName = interaction.options.getString('campaign', true);
						const campaigns = await campaignService.listCampaigns();
						const campaign = campaigns.find(c => c.name === campaignName);

						if (!campaign) {
							await interaction.reply({
								content: `Campaign "${campaignName}" not found.`,
								ephemeral: true
							});
							return;
						}

						await campaignService.updateCampaign(campaign.id, {
							textChannelId: interaction.channelId,
							isActive: true
						});

						await interaction.reply({
							content: `Campaign "${campaignName}" is now active in this channel.`,
							ephemeral: true
						});
						break;
					}

					case 'rename': {
						if (!permissions.canManageCampaign) {
							await interaction.reply({
								content: 'You do not have permission to manage campaigns.',
								ephemeral: true
							});
							return;
						}

						if (!activeCampaign) {
							await interaction.reply({
								content: 'No active campaign in this channel.',
								ephemeral: true
							});
							return;
						}

						const newName = interaction.options.getString('name', true);
						await campaignService.updateCampaign(activeCampaign.id, { name: newName });

						await interaction.reply({
							content: `Campaign renamed to "${newName}".`,
							ephemeral: true
						});
						break;
					}
				}
			}

			// Vector Management Commands
			if (group === 'vector') {
				switch (subcommand) {
					case 'build': {
						if (!permissions.canManageCampaign) {
							await interaction.reply({
								content: 'Only GMs can manage the vector database.',
								ephemeral: true
							});
							return;
						}

						await interaction.deferReply({ ephemeral: true });

						try {
							const includeGM = interaction.options.getBoolean('include_gm') ?? false;
							const model = interaction.options.getString('model');
							const chunkSize = interaction.options.getInteger('chunk_size');

							const vectorService = VectorService.getInstance();
							if (!permissions.campaignId) {
								await interaction.editReply({
									content: 'No active campaign found. Please select a campaign first.'
								});
								return;
							}

							await vectorService.generateVectors(permissions.campaignId, {
								includeGMContent: includeGM,
								...(model && { modelName: model }),
								...(chunkSize && { chunkSize })
							});

							await interaction.editReply({
								content: `Successfully built vector database for campaign.\n${includeGM ? 'GM content included.' : 'Only player content was processed.'}`
							});
						} catch (error) {
							logger.error('Error building vector database:', error instanceof Error ? error : new Error(String(error)));
							await interaction.editReply({
								content: 'Failed to build vector database. Please check the logs for details.'
							});
						}
						break;
					}
				}
			}

			// Game Management Commands
			if (group === 'game') {
				switch (subcommand) {
					case 'ask': {
						await interaction.deferReply({ ephemeral: false });

						try {
							const question = interaction.options.getString('question', true);
							const vectorService = VectorService.getInstance();

							if (!permissions.campaignId) {
								await interaction.editReply({
									content: 'No active campaign found. Please select a campaign first.'
								});
								return;
							}

							const results = await vectorService.searchCampaignContent(
								permissions.campaignId,
								question,
								{
									limit: 3,
									includeGMContent: permissions.canManageCampaign
								}
							);

							const gameLLMService = await GameLLMService.getInstance();
							const answer = await gameLLMService.answerQuestion(
								question,
								results.map(r => r.text).join('\n\n'),
								permissions.canManageCampaign,
								activeCampaign!
							);

							await interaction.editReply({
								content: answer
							});
						} catch (error) {
							logger.error('Error answering game question:', error instanceof Error ? error : new Error(String(error)));
							await interaction.editReply({
								content: 'Failed to answer your question. Please try again later.'
							});
						}
						break;
					}
				}
			}

			// Session Management Commands
			if (group === 'session') {
				switch (subcommand) {
					case 'schedule': {
						if (!permissions.canManageCampaign) {
							await interaction.reply({
								content: 'Only GMs can schedule sessions.',
								ephemeral: true
							});
							return;
						}

						if (!activeCampaign) {
							await interaction.reply({
								content: 'No active campaign in this channel.',
								ephemeral: true
							});
							return;
						}

						const date = interaction.options.getString('date', true);
						const title = interaction.options.getString('title', true);
						const description = interaction.options.getString('description');
						const isRecurring = interaction.options.getBoolean('recurring') ?? false;
						const recurringInterval = isRecurring ? interaction.options.getString('interval') as 'weekly' | 'biweekly' | 'monthly' | null : null;

						if (isRecurring && !recurringInterval) {
							await interaction.reply({
								content: 'Please specify a recurring interval (weekly, biweekly, or monthly) for recurring sessions.',
								ephemeral: true
							});
							return;
						}

						try {
							await campaignService.scheduleSession(
								activeCampaign.id,
								date,
								title,
								description ?? undefined,
								isRecurring,
								recurringInterval ?? undefined
							);

							await interaction.reply({
								content: `Session "${title}" scheduled for ${date}${isRecurring ? ` (recurring ${recurringInterval})` : ''}.`,
								ephemeral: false
							});
						} catch (error) {
							logger.error('Error scheduling session:', error instanceof Error ? error : new Error(String(error)));
							await interaction.reply({
								content: 'Failed to schedule session. Please check the date format (YYYY-MM-DD HH:mm) and try again.',
								ephemeral: true
							});
						}
						break;
					}
				}
			}
		} catch (error) {
			logger.error('Error executing rpg command:', error instanceof Error ? error : new Error(String(error)));

			try {
				await interaction.reply({
					content: 'An error occurred while processing the command. Please try again later.',
					ephemeral: true
				});
			} catch (replyError) {
				// If we can't reply normally, try to follow up
				try {
					await interaction.followUp({
						content: 'An error occurred while processing the command. Please try again later.',
						ephemeral: true
					});
				} catch (followUpError) {
					logger.error('Failed to respond to command error:', followUpError instanceof Error ? followUpError : new Error(String(followUpError)));
				}
			}
		}
	}
};
