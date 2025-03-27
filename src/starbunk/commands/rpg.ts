import { PrismaClient } from '@prisma/client';
import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { Campaign } from '../../domain/models';
import { logger } from '../../services/logger';
import { CampaignService } from '../services/campaignService';
import { GameContentService } from '../services/gameContentService';
import { VectorService } from '../services/vectorService';
import { SUPPORTED_SYSTEMS } from '../types/game';
import { getCampaignContext, getCampaignPermissions, validateCampaignAccess } from '../utils/campaignChecks';

// Initialize Prisma client
const prisma = new PrismaClient();

const rpgCommand = {
	data: new SlashCommandBuilder()
		.setName('rpg')
		.setDescription('TTRPG assistance commands')
		// Campaign Management Commands
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
									...Object.values(SUPPORTED_SYSTEMS).map(system => ({
										name: `${system.name} ${system.version}`,
										value: system.id
									}))
								)
						)
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('list')
						.setDescription('List all campaigns')
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('rename')
						.setDescription('Rename a campaign')
						.addStringOption(option =>
							option
								.setName('new-name')
								.setDescription('New name for the campaign')
								.setRequired(true)
						)
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('set-active')
						.setDescription('Set the active campaign for this channel')
						.addStringOption(option =>
							option
								.setName('campaign-id')
								.setDescription('Campaign ID')
								.setRequired(true)
								.setAutocomplete(true)
						)
				)
		)
		// Game Commands (require active campaign in channel)
		.addSubcommandGroup(group =>
			group
				.setName('game')
				.setDescription('Game commands (requires active campaign in channel)')
				.addSubcommand(subcommand =>
					subcommand
						.setName('build')
						.setDescription('Build vector database for campaign content')
						.addBooleanOption(option =>
							option
								.setName('include_gm')
								.setDescription('Include GM content in the build')
								.setRequired(false)
						)
						.addStringOption(option =>
							option
								.setName('model')
								.setDescription('Model to use for embeddings')
								.setRequired(false)
						)
						.addIntegerOption(option =>
							option
								.setName('chunk_size')
								.setDescription('Size of text chunks for processing')
								.setRequired(false)
						)
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('create')
						.setDescription('Create a new game session')
						.addStringOption(option =>
							option
								.setName('name')
								.setDescription('Game session name')
								.setRequired(true)
						)
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('ask')
						.setDescription('Ask a question about the campaign or game system')
						.addStringOption(option =>
							option
								.setName('question')
								.setDescription('Your question about the game')
								.setRequired(true)
						)
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('ask-gm')
						.setDescription('GM only: Ask a question with access to all information')
						.addStringOption(option =>
							option
								.setName('question')
								.setDescription('Your GM question about the game')
								.setRequired(true)
						)
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('note')
						.setDescription('Add a player note')
						.addStringOption(option =>
							option
								.setName('content')
								.setDescription('The note content')
								.setRequired(true)
						)
						.addStringOption(option =>
							option
								.setName('tags')
								.setDescription('Optional: Tags for the note (comma-separated)')
						)
						.addBooleanOption(option =>
							option
								.setName('gm_only')
								.setDescription('Only visible to GM')
						)
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('note-gm')
						.setDescription('GM only: Add a GM note')
						.addStringOption(option =>
							option
								.setName('content')
								.setDescription('The GM note content')
								.setRequired(true)
						)
						.addStringOption(option =>
							option
								.setName('tags')
								.setDescription('Optional: Tags for the note (comma-separated)')
						)
				)
		)
		// Session Management
		.addSubcommandGroup(group =>
			group
				.setName('session')
				.setDescription('Session management commands')
				.addSubcommand(subcommand =>
					subcommand
						.setName('schedule')
						.setDescription('Schedule the next session')
						.addStringOption(option =>
							option
								.setName('date')
								.setDescription('The date and time (YYYY-MM-DD HH:MM)')
								.setRequired(true)
						)
						.addStringOption(option =>
							option
								.setName('description')
								.setDescription('Optional: Session description or agenda')
						)
				)
				.addSubcommand(subcommand =>
					subcommand
						.setName('reminder')
						.setDescription('Set a reminder message')
						.addStringOption(option =>
							option
								.setName('message')
								.setDescription('The reminder message')
								.setRequired(true)
						)
						.addStringOption(option =>
							option
								.setName('time')
								.setDescription('When to send the reminder (YYYY-MM-DD HH:MM)')
								.setRequired(true)
						)
				)
		),

	async execute(interaction: ChatInputCommandInteraction): Promise<void> {
		const group = interaction.options.getSubcommandGroup();
		const subcommand = interaction.options.getSubcommand();
		const campaignService = CampaignService.getInstance();
		const gameContentService = GameContentService.getInstance();

		try {
			// Validate member access for all commands except campaign list
			const member = interaction.member as GuildMember;

			// Allow campaign list without channel validation
			if (group === 'campaign' && subcommand === 'list') {
				const campaigns = await campaignService.getActiveCampaigns();
				if (campaigns.length === 0) {
					await interaction.reply({
						content: 'No active campaigns found.',
						ephemeral: true
					});
					return;
				}

				const campaignList = campaigns.map((c: Campaign) =>
					`• ${c.name} (${c.system.name} ${c.system.version}) - <#${c.channelId}>`
				).join('\n');

				await interaction.reply({
					content: `**Active Campaigns:**\n${campaignList}`,
					ephemeral: true
				});
				return;
			}

			// Validate channel and role access for all other commands
			const accessError = validateCampaignAccess(member, interaction.channelId);
			if (accessError) {
				await interaction.reply({
					content: accessError,
					ephemeral: true
				});
				return;
			}

			const context = getCampaignContext(member, interaction.channelId);
			const permissions = await getCampaignPermissions(context);

			// Campaign Management Commands
			if (group === 'campaign') {
				switch (subcommand) {
					case 'create': {
						if (!permissions.canManageCampaign) {
							await interaction.reply({
								content: 'Only GMs can create campaigns.',
								ephemeral: true
							});
							return;
						}

						const name = interaction.options.getString('name', true);
						const systemId = interaction.options.getString('system', true);

						const campaign = await campaignService.createCampaign(
							name,
							systemId,
							interaction.channel!,
							interaction.user.id
						);

						await interaction.reply({
							content: `Created new campaign: ${campaign.name} (${campaign.system.name} ${campaign.system.version})`,
							ephemeral: true
						});
						break;
					}
					case 'set-active': {
						if (!permissions.canManageCampaign) {
							await interaction.reply({
								content: 'Only GMs can set active campaigns.',
								ephemeral: true
							});
							return;
						}

						const campaignId = interaction.options.getString('campaign-id', true);

						try {
							// Get the campaign to activate
							const campaign = await campaignService.getCampaign(campaignId);
							if (!campaign) {
								await interaction.reply({
									content: `Campaign with ID ${campaignId} not found.`,
									ephemeral: true
								});
								return;
							}

							// Check if there's an existing active campaign in this channel
							const existingCampaign = await campaignService.getCampaignByChannel(interaction.channelId);
							if (existingCampaign && existingCampaign.id !== campaignId) {
								// Deactivate the existing campaign
								await campaignService.deactivateCampaign(existingCampaign.id);
							}

							// Activate the selected campaign and set its channel
							await campaignService.updateCampaign(campaignId, {
								isActive: true,
								channelId: interaction.channelId
							});

							await interaction.reply({
								content: `Campaign "${campaign.name}" is now active in this channel.`,
								ephemeral: false
							});
						} catch (error) {
							logger.error('Error setting active campaign:', error instanceof Error ? error : new Error(String(error)));
							await interaction.reply({
								content: 'Failed to set active campaign. Please try again later.',
								ephemeral: true
							});
						}
						break;
					}
					case 'rename': {
						if (!permissions.canManageCampaign) {
							await interaction.reply({
								content: 'Only GMs can rename campaigns.',
								ephemeral: true
							});
							return;
						}

						const newName = interaction.options.getString('new-name', true);

						try {
							// Get the current campaign in this channel
							const campaign = await campaignService.getCampaignByChannel(interaction.channelId);
							if (!campaign) {
								await interaction.reply({
									content: 'No active campaign found in this channel.',
									ephemeral: true
								});
								return;
							}

							// Check if a campaign with the new name already exists
							const allCampaigns = await campaignService.listCampaigns();
							const existingCampaign = allCampaigns.find(
								c => c.name.toLowerCase() === newName.toLowerCase() && c.id !== campaign.id
							);

							if (existingCampaign) {
								await interaction.reply({
									content: `A campaign named "${newName}" already exists.`,
									ephemeral: true
								});
								return;
							}

							// Update the campaign name
							const oldName = campaign.name;
							await campaignService.updateCampaign(campaign.id, {
								name: newName
							});

							await interaction.reply({
								content: `Campaign "${oldName}" has been renamed to "${newName}".`,
								ephemeral: false
							});
						} catch (error) {
							logger.error('Error renaming campaign:', error instanceof Error ? error : new Error(String(error)));
							await interaction.reply({
								content: 'Failed to rename campaign. Please try again later.',
								ephemeral: true
							});
						}
						break;
					}
				}
				return;
			}

			// Game Commands - Require Active Campaign
			if (group === 'game') {
				// Get the actual campaign - no special testing campaign needed
				const campaign = await campaignService.getCampaignByChannel(interaction.channelId);

				if (!campaign) {
					await interaction.reply({
						content: 'This channel is not associated with any active campaign. Use `/rpg campaign create` to create one.',
						ephemeral: true
					});
					return;
				}

				// Skip campaign ID validation in testing channel
				if (!context.isTestingChannel && campaign.id !== permissions.campaignId) {
					await interaction.reply({
						content: 'Campaign mismatch. Please use the appropriate channel for this campaign.',
						ephemeral: true
					});
					return;
				}

				switch (subcommand) {
					case 'build': {
						// Check if user has GM permissions
						if (!permissions.canManageCampaign) {
							await interaction.reply({
								content: 'Only GMs can build the vector database.',
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
							await vectorService.generateVectors(campaign.id, {
								includeGMContent: includeGM,
								...(model && { modelName: model }),
								...(chunkSize && { chunkSize })
							});

							await interaction.editReply({
								content: `Successfully built vector database for campaign "${campaign.name}".${includeGM ? ' GM content included.' : ''}`
							});
						} catch (error) {
							logger.error('Error building vector database:', error instanceof Error ? error : new Error(String(error)));
							await interaction.editReply({
								content: 'Failed to build vector database. Please check the logs for details.'
							});
						}
						break;
					}
					case 'create': {
						// Check if user has permission to create game
						if (!permissions.canManageCampaign) {
							await interaction.reply({
								content: 'Only GMs can create game sessions.',
								ephemeral: true
							});
							return;
						}

						const gameName = interaction.options.getString('name', true);

						try {
							// Check if a game with that name already exists
							const existingGames = await prisma.gameSession.findMany({
								where: { campaignId: campaign.id }
							});

							const gameExists = existingGames.some((game: { name: string }) =>
								game.name.toLowerCase() === gameName.toLowerCase()
							);

							if (gameExists) {
								await interaction.reply({
									content: `A game session named "${gameName}" already exists in this campaign.`,
									ephemeral: true
								});
								return;
							}

							// Create the game and store it in database
							const newGame = await prisma.gameSession.create({
								data: {
									campaignId: campaign.id,
									name: gameName,
									channelId: interaction.channelId,
									createdBy: interaction.user.id,
									isActive: true
								}
							});

							// Make sure other games in this channel are not active
							await prisma.gameSession.updateMany({
								where: {
									channelId: interaction.channelId,
									id: { not: newGame.id }
								},
								data: { isActive: false }
							});

							await interaction.reply({
								content: `Game session "${gameName}" created and set as active in this channel.`,
								ephemeral: false
							});
						} catch (error) {
							logger.error('Error creating game session:', error instanceof Error ? error : new Error(String(error)));
							await interaction.reply({
								content: 'Failed to create game session. Please try again later.',
								ephemeral: true
							});
						}
						break;
					}
					case 'ask':
					case 'ask-gm': {
						// Check GM permissions for GM-only queries
						if (subcommand === 'ask-gm' && !permissions.canAccessGMContent) {
							await interaction.reply({
								content: 'Only the GM can use this command.',
								ephemeral: true
							});
							return;
						}

						const question = interaction.options.getString('question', true);

						// Defer the reply since LLM processing might take time
						await interaction.deferReply({
							ephemeral: permissions.canAccessGMContent
						});

						try {
							const response = await gameContentService.queryGameContext(
								campaign,
								question,
								interaction.user.id,
								permissions.canAccessGMContent
							);

							const sourcesList = response.sources.length > 0
								? '\n\nSources:\n' + response.sources.map((source) =>
									`• [${source.category}] ${source.content.substring(0, 100)}...`
								).join('\n')
								: '';

							await interaction.editReply({
								content: `[${campaign.name}] ${response.answer}${sourcesList}`
							});
						} catch (error) {
							logger.error('Error processing ask command:', error instanceof Error ? error : new Error(String(error)));
							await interaction.editReply({
								content: 'Sorry, I encountered an error while processing your question. Please try again.'
							});
						}
						break;
					}
					case 'note':
					case 'note-gm': {
						// Check permissions for note creation
						if (!permissions.canCreateNotes) {
							await interaction.reply({
								content: 'You do not have permission to create notes in this campaign.',
								ephemeral: true
							});
							return;
						}

						// Check GM permissions for GM notes
						if (subcommand === 'note-gm' && !permissions.canAccessGMContent) {
							await interaction.reply({
								content: 'Only the GM can create GM notes.',
								ephemeral: true
							});
							return;
						}

						const content = interaction.options.getString('content', true);
						const tags = interaction.options.getString('tags')?.split(',').map(tag => tag.trim()) || [];
						const isGMOnly = interaction.options.getBoolean('gm_only') || false;

						// Only GM can create GM-only notes
						if (isGMOnly && !permissions.canAccessGMContent) {
							await interaction.reply({
								content: 'Only the GM can create GM-only notes.',
								ephemeral: true
							});
							return;
						}

						const note = await gameContentService.addNote({
							campaignId: campaign.id,
							adventureId: campaign.adventureId,
							content,
							userId: interaction.user.id,
							isGM: permissions.canAccessGMContent,
							tags
						});

						await interaction.reply({
							content: `Note saved! Category: ${note.category}\nTags: ${note.tags.join(', ')}`,
							ephemeral: note.isGMOnly
						});
						break;
					}
				}
				return;
			}

			// Session Management Commands
			if (group === 'session') {
				// Get the actual campaign - no special testing campaign needed
				const campaign = await campaignService.getCampaignByChannel(interaction.channelId);

				if (!campaign) {
					await interaction.reply({
						content: 'This channel is not associated with any active campaign.',
						ephemeral: true
					});
					return;
				}

				// Skip campaign ID validation in testing channel
				console.log(`Campaign ID: ${campaign.id}, Permissions Campaign ID: ${permissions.campaignId}. Context: ${context.isTestingChannel}`);
				if (!context.isTestingChannel && campaign.id !== permissions.campaignId) {
					await interaction.reply({
						content: 'Campaign mismatch. Please use the appropriate channel for this campaign.',
						ephemeral: true
					});
					return;
				}

				if (!permissions.canManageSessions) {
					await interaction.reply({
						content: 'Only the GM can manage sessions.',
						ephemeral: true
					});
					return;
				}

				switch (subcommand) {
					case 'schedule': {
						const date = interaction.options.getString('date', true);
						const description = interaction.options.getString('description');
						// TODO: Implement session scheduling logic with campaign context
						await interaction.reply({
							content: `[${campaign.name}] Session scheduled for ${date}${description ? ` with description: ${description}` : ''}\nThis feature is coming soon!`,
							ephemeral: true
						});
						break;
					}
					case 'reminder': {
						const _message = interaction.options.getString('message', true);
						const time = interaction.options.getString('time', true);
						// TODO: Implement reminder logic with campaign context
						await interaction.reply({
							content: `[${campaign.name}] Reminder set for ${time}\nThis feature is coming soon!`,
							ephemeral: true
						});
						break;
					}
				}
			}
		} catch (error) {
			logger.error('Error executing rpg command:', error instanceof Error ? error : new Error(String(error)));
			await interaction.reply({
				content: 'An error occurred while executing the command',
				ephemeral: true
			});
		}
	}
};

export default rpgCommand;
