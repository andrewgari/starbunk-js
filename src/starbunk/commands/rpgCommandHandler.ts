import { AutocompleteInteraction, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Campaign } from '../../domain/models';
import { logger } from '../../services/logger';
import { Database } from '../database';
import { GameSystem, SUPPORTED_SYSTEMS } from '../types/game';

const db = Database.getInstance();

function getGameSystem(name: string): GameSystem {
	const system = SUPPORTED_SYSTEMS[name];
	if (!system) {
		throw new Error(`Unsupported game system: ${name}`);
	}
	return system;
}

async function getCampaignFromChannel(channelId: string, guildId: string): Promise<Campaign | null> {
	const campaigns = await db.campaigns.findAll();
	return campaigns.find(campaign =>
		campaign.textChannelId === channelId &&
		campaign.guildId === guildId &&
		campaign.isActive
	) || null;
}

const commandBuilder = new SlashCommandBuilder()
	.setName('rpg')
	.setDescription('RPG commands')
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
							.addChoices(...Object.entries(SUPPORTED_SYSTEMS).map(([key, value]) => ({
								name: value.name,
								value: key
							})))
					)
					.addStringOption(option =>
						option
							.setName('text-channel')
							.setDescription('Text channel ID')
							.setRequired(true)
					)
					.addStringOption(option =>
						option
							.setName('voice-channel')
							.setDescription('Voice channel ID')
					)
					.addStringOption(option =>
						option
							.setName('gm')
							.setDescription('Game Master ID')
							.setRequired(true)
					)
			)
			.addSubcommand(subcommand =>
				subcommand
					.setName('toggle')
					.setDescription('Toggle campaign active state')
			)
	)
	.addSubcommandGroup(group =>
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
							.setDescription('Name of the character')
							.setRequired(true)
					)
					.addStringOption(option =>
						option
							.setName('avatar-url')
							.setDescription('URL of character avatar')
							.setRequired(false)
					)
			)
			.addSubcommand(subcommand =>
				subcommand
					.setName('view')
					.setDescription('View a character')
					.addStringOption(option =>
						option
							.setName('name')
							.setDescription('Name of the character')
							.setRequired(true)
							.setAutocomplete(true)
					)
			)
			.addSubcommand(subcommand =>
				subcommand
					.setName('list')
					.setDescription('List all characters in the campaign')
			)
			.addSubcommand(subcommand =>
				subcommand
					.setName('delete')
					.setDescription('Delete a character')
					.addStringOption(option =>
						option
							.setName('name')
							.setDescription('Name of the character')
							.setRequired(true)
							.setAutocomplete(true)
					)
			)
	)
	.setDefaultMemberPermissions(PermissionFlagsBits.SendMessages);

export const rpgCommandHandler = {
	data: commandBuilder,

	async execute(interaction: ChatInputCommandInteraction): Promise<void> {
		const subcommandGroup = interaction.options.getSubcommandGroup();

		if (!interaction.guildId) {
			await interaction.reply('This command can only be used in a server.');
			return;
		}

		try {
			switch (subcommandGroup) {
				case 'campaign':
					await this.handleCampaignCommand(interaction);
					break;
				case 'character':
					await this.handleCharacterCommand(interaction);
					break;
				default:
					await interaction.reply('Unknown command group.');
			}
		} catch (error) {
			logger.error('RPG command error:', error instanceof Error ? error : new Error(String(error)));
			await interaction.reply('An error occurred while processing your command.');
		}
	},

	async handleCampaignCommand(interaction: ChatInputCommandInteraction): Promise<void> {
		const subcommand = interaction.options.getSubcommand();

		switch (subcommand) {
			case 'create': {
				const systemName = interaction.options.getString('system', true);
				const voiceChannelId = interaction.options.getString('voice-channel') || undefined;
				const newCampaign = await db.campaigns.create({
					name: interaction.options.getString('name', true),
					system: getGameSystem(systemName),
					textChannelId: interaction.options.getString('text-channel', true),
					voiceChannelId,
					gmId: interaction.options.getString('gm', true),
					guildId: interaction.guildId!,
					isActive: true
				});

				await interaction.reply(`Campaign "${newCampaign.name}" created successfully!`);
				break;
			}
			case 'toggle': {
				if (!interaction.guildId) {
					await interaction.reply('This command can only be used in a server.');
					return;
				}

				const existingCampaign = await getCampaignFromChannel(interaction.channelId, interaction.guildId);
				if (!existingCampaign) {
					await interaction.reply('No active campaign found in this channel.');
					return;
				}

				if (existingCampaign.gmId !== interaction.user.id) {
					await interaction.reply('You must be the GM to toggle the campaign state.');
					return;
				}

				const updatedCampaign = await db.campaigns.update(existingCampaign.id, {
					isActive: !existingCampaign.isActive
				});

				await interaction.reply(`Campaign "${updatedCampaign.name}" is now ${updatedCampaign.isActive ? 'active' : 'inactive'}.`);
				break;
			}
		}
	},

	async handleCharacterCommand(interaction: ChatInputCommandInteraction): Promise<void> {
		const subcommand = interaction.options.getSubcommand();

		switch (subcommand) {
			case 'create': {
				if (!interaction.guildId) {
					await interaction.reply('This command can only be used in a server.');
					return;
				}

				const existingCampaign = await getCampaignFromChannel(interaction.channelId, interaction.guildId);
				if (!existingCampaign) {
					await interaction.reply('No active campaign found in this channel.');
					return;
				}

				const newCharacter = await db.characters.create({
					name: interaction.options.getString('name', true),
					playerId: interaction.user.id,
					campaignId: existingCampaign.id,
					avatarUrl: interaction.options.getString('avatar-url') || undefined
				});

				await interaction.reply(`Character "${newCharacter.name}" created successfully!`);
				break;
			}

			case 'view': {
				const name = interaction.options.getString('name', true);

				if (!interaction.guildId) {
					await interaction.reply('This command can only be used in a server.');
					return;
				}

				const campaign = await getCampaignFromChannel(interaction.channelId, interaction.guildId);
				if (!campaign) {
					await interaction.reply('No active campaign found in this channel.');
					return;
				}

				try {
					const character = await db.characters.findOne({
						name,
						campaignId: campaign.id
					});

					if (!character) {
						await interaction.reply({
							content: 'Character not found',
							ephemeral: true
						});
						return;
					}

					await interaction.reply({
						embeds: [{
							title: character.name,
							description: `Created by <@${character.playerId}>`,
							thumbnail: character.avatarUrl ? { url: character.avatarUrl } : undefined,
							fields: [
								{ name: 'Campaign', value: campaign.name, inline: true },
								{ name: 'Created', value: character.createdAt.toLocaleDateString(), inline: true }
							]
						}],
						ephemeral: false
					});
				} catch (error) {
					logger.error('Character view error:', error instanceof Error ? error : new Error(String(error)));
					await interaction.reply({
						content: 'Failed to view character. Please try again.',
						ephemeral: true
					});
				}
				break;
			}

			case 'list': {
				if (!interaction.guildId) {
					await interaction.reply('This command can only be used in a server.');
					return;
				}

				const campaign = await getCampaignFromChannel(interaction.channelId, interaction.guildId);
				if (!campaign) {
					await interaction.reply('No active campaign found in this channel.');
					return;
				}

				try {
					const characters = await db.characters.findMany({
						campaignId: campaign.id
					});

					if (characters.length === 0) {
						await interaction.reply({
							content: 'No characters found in this campaign',
							ephemeral: true
						});
						return;
					}

					const charactersByPlayer = new Map<string, string[]>();
					characters.forEach((char: { playerId: string; name: string }) => {
						const playerChars = charactersByPlayer.get(char.playerId) || [];
						playerChars.push(char.name);
						charactersByPlayer.set(char.playerId, playerChars);
					});

					const fields = Array.from(charactersByPlayer.entries()).map(([playerId, chars]) => ({
						name: `<@${playerId}>`,
						value: chars.join('\n'),
						inline: true
					}));

					await interaction.reply({
						embeds: [{
							title: `Characters in ${campaign.name}`,
							fields
						}],
						ephemeral: false
					});
				} catch (error) {
					logger.error('Character list error:', error instanceof Error ? error : new Error(String(error)));
					await interaction.reply({
						content: 'Failed to list characters. Please try again.',
						ephemeral: true
					});
				}
				break;
			}

			case 'delete': {
				const name = interaction.options.getString('name', true);

				if (!interaction.guildId) {
					await interaction.reply('This command can only be used in a server.');
					return;
				}

				const campaign = await getCampaignFromChannel(interaction.channelId, interaction.guildId);
				if (!campaign) {
					await interaction.reply('No active campaign found in this channel.');
					return;
				}

				try {
					const character = await db.characters.findOne({
						name,
						campaignId: campaign.id
					});

					if (!character) {
						await interaction.reply({
							content: 'Character not found',
							ephemeral: true
						});
						return;
					}

					if (character.playerId !== interaction.user.id && campaign.gmId !== interaction.user.id) {
						await interaction.reply({
							content: 'You can only delete your own characters',
							ephemeral: true
						});
						return;
					}

					await db.characters.delete(character.id);

					await interaction.reply({
						content: `Character "${character.name}" has been deleted`,
						ephemeral: false
					});
				} catch (error) {
					logger.error('Character deletion error:', error instanceof Error ? error : new Error(String(error)));
					await interaction.reply({
						content: 'Failed to delete character. Please try again.',
						ephemeral: true
					});
				}
				break;
			}
		}
	},

	async autocomplete(_interaction: AutocompleteInteraction): Promise<void> {
		// Handle autocomplete if needed
	},

	isValidImageUrl(url: string): boolean {
		try {
			const parsed = new URL(url);
			return /\.(jpg|jpeg|png|webp|gif)$/i.test(parsed.pathname);
		} catch {
			return false;
		}
	}
};
