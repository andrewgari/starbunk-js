import { PrismaClient } from '@prisma/client';
import {
	ChatInputCommandInteraction,
	GuildMember,
	SlashCommandBuilder
} from 'discord.js';
import { logger } from '../../services/logger';
import { CampaignService } from '../services/campaignService';
import { GameContentService } from '../services/gameContentService';
import { HelpService } from '../services/helpService';
import { VectorService } from '../services/vectorService';
import { SUPPORTED_SYSTEMS } from '../types/game';
import { getCampaignContext, getCampaignPermissions } from '../utils/campaignChecks';

// Initialize Prisma client
const prisma = new PrismaClient();

const data = new SlashCommandBuilder()
	.setName('rpg')
	.setDescription('RPG game management commands');

// Campaign Management Commands
data.addSubcommandGroup(group =>
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
								name: system.name,
								value: system.id
							}))
						)
				)
				.addStringOption(option =>
					option
						.setName('help')
						.setDescription('Get help about campaign creation')
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('list')
				.setDescription('List all campaigns')
				.addStringOption(option =>
					option
						.setName('help')
						.setDescription('Get help about campaign listing')
				)
		)
);

// Session Management Commands
data.addSubcommandGroup(group =>
	group
		.setName('session')
		.setDescription('Session management commands')
		.addSubcommand(subcommand =>
			subcommand
				.setName('schedule')
				.setDescription('Schedule a session')
				.addStringOption(option =>
					option
						.setName('date')
						.setDescription('Session date (YYYY-MM-DD HH:mm)')
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('description')
						.setDescription('Session description')
				)
				.addStringOption(option =>
					option
						.setName('help')
						.setDescription('Get help about session scheduling')
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('reminder')
				.setDescription('Set a session reminder')
				.addStringOption(option =>
					option
						.setName('message')
						.setDescription('Reminder message')
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('time')
						.setDescription('Reminder time (YYYY-MM-DD HH:mm)')
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('help')
						.setDescription('Get help about setting reminders')
				)
		)
);

// Character Management Commands
data.addSubcommandGroup(group =>
	group
		.setName('character')
		.setDescription('Character management commands')
		.addSubcommand(subcommand =>
			subcommand
				.setName('create')
				.setDescription('Create a new character')
				.addStringOption(option =>
					option
						.setName('name')
						.setDescription('Character name')
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('class')
						.setDescription('Character class')
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('help')
						.setDescription('Get help about character creation')
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('list')
				.setDescription('List all characters in the campaign')
				.addStringOption(option =>
					option
						.setName('help')
						.setDescription('Get help about character listing')
				)
		)
);

export const rpgCommand = {
	data: data as SlashCommandBuilder,
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
			const gameContentService = GameContentService.getInstance();

			// Get the campaign for the current channel
			const campaign = await campaignService.getCampaignByChannel(interaction.channelId);
			if (!campaign) {
				await interaction.reply({
					content: 'This channel is not associated with any active campaign.',
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

			// Game Commands (require active campaign in channel)
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
							logger.error('Error querying game context:', error instanceof Error ? error : new Error(String(error)));
							await interaction.editReply({
								content: 'Failed to query game context. Please try again later.'
							});
						}
						break;
					}
				}
				return;
			}

			// Session Management Commands
			if (group === 'session') {
				if (!permissions.canManageCampaign) {
					await interaction.reply({
						content: 'Only GMs can manage sessions.',
						ephemeral: true
					});
					return;
				}

				switch (subcommand) {
					case 'schedule': {
						const date = interaction.options.getString('date', true);
						const description = interaction.options.getString('description') ?? undefined;

						try {
							await campaignService.scheduleSession(campaign.id, date, description);
							await interaction.reply({
								content: `Scheduled next session for ${date}${description ? `\nDescription: ${description}` : ''}`,
								ephemeral: false
							});
						} catch (error) {
							logger.error('Error scheduling session:', error instanceof Error ? error : new Error(String(error)));
							await interaction.reply({
								content: 'Failed to schedule session. Please try again later.',
								ephemeral: true
							});
						}
						break;
					}
					case 'reminder': {
						const message = interaction.options.getString('message', true);
						const time = interaction.options.getString('time', true);

						try {
							await campaignService.addReminder(campaign.id, message, time);
							await interaction.reply({
								content: `Set reminder: ${message} to be sent at ${time}`,
								ephemeral: false
							});
						} catch (error) {
							logger.error('Error setting reminder:', error instanceof Error ? error : new Error(String(error)));
							await interaction.reply({
								content: 'Failed to set reminder. Please try again later.',
								ephemeral: true
							});
						}
						break;
					}
				}
				return;
			}

			// Character Management Commands
			if (group === 'character') {
				switch (subcommand) {
					case 'create': {
						if (!permissions.canManageCampaign) {
							await interaction.reply({
								content: 'Only GMs can create characters.',
								ephemeral: true
							});
							return;
						}

						const name = interaction.options.getString('name', true);
						const characterClass = interaction.options.getString('class', true);

						try {
							await campaignService.createCharacter(campaign.id, name, characterClass);
							await interaction.reply({
								content: `Created new character: ${name} (${characterClass})`,
								ephemeral: false
							});
						} catch (error) {
							logger.error('Error creating character:', error instanceof Error ? error : new Error(String(error)));
							await interaction.reply({
								content: 'Failed to create character. Please try again later.',
								ephemeral: true
							});
						}
						break;
					}
					case 'list': {
						try {
							const characters = await campaignService.getCharacters(campaign.id);
							if (characters.length === 0) {
								await interaction.reply({
									content: 'No characters found in this campaign.',
									ephemeral: true
								});
								return;
							}

							const characterList = characters.map(c => `• ${c.name} (${c.class})`).join('\n');
							await interaction.reply({
								content: `**Characters in ${campaign.name}:**\n${characterList}`,
								ephemeral: true
							});
						} catch (error) {
							logger.error('Error listing characters:', error instanceof Error ? error : new Error(String(error)));
							await interaction.reply({
								content: 'Failed to list characters. Please try again later.',
								ephemeral: true
							});
						}
						break;
					}
				}
				return;
			}
		} catch (error) {
			logger.error('Error executing command:', error instanceof Error ? error : new Error(String(error)));
			await interaction.reply({
				content: 'An error occurred while executing the command. Please try again later.',
				ephemeral: true
			});
		}
	}
};
