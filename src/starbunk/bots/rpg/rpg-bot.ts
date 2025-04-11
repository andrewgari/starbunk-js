import { Database } from '@/starbunk/database';
import { CreateCampaignDto } from '@/starbunk/database/dto/campaign.dto';
import { CreateCharacterDto } from '@/starbunk/database/dto/character.dto';
import { EmbedBuilder, Message } from 'discord.js';
import { CampaignRepository } from '../../../domain/repositories';
import { CharacterRepository } from '../../database/repositories/character-repository';
import { GameSystem, SUPPORTED_SYSTEMS } from '../../types/game';
import { ReplyBotImpl } from '../core/bot-builder';

function getGameSystem(name: string): GameSystem {
	const system = SUPPORTED_SYSTEMS[name];
	if (!system) {
		throw new Error(`Unsupported game system: ${name}`);
	}
	return system;
}

export class RPGBot implements ReplyBotImpl {
	name = 'RPGBot';
	description = 'A bot for managing RPG campaigns and characters';

	private db: Database;
	private campaignRepository: CampaignRepository;
	private characterRepository: CharacterRepository;

	constructor(
		campaignRepository: CampaignRepository,
		characterRepository: CharacterRepository
	) {
		this.db = Database.getInstance();
		this.campaignRepository = campaignRepository;
		this.characterRepository = characterRepository;
	}

	async processMessage(message: Message): Promise<void> {
		if (!message.content.startsWith('/')) return;

		const [command, ...args] = message.content.slice(1).split(' ');

		switch (command.toLowerCase()) {
			case 'campaign':
				await this.handleCampaignCommand(message, args);
				break;
			case 'char':
			case 'character':
				await this.handleCharacterCommand(message, args);
				break;
			default:
				return;
		}
	}

	private async handleCampaignCommand(message: Message, args: string[]) {
		const subCommand = args[0]?.toLowerCase();

		switch (subCommand) {
			case 'create':
				await this.handleCampaignCreate(message, args.slice(1));
				break;
			case 'toggle':
				await this.handleCampaignToggle(message, args.slice(1));
				break;
			default:
				await message.reply('Available commands: create, toggle');
		}
	}

	private async handleCampaignCreate(message: Message, args: string[]) {
		if (!message.guild) {
			await message.reply('This command can only be used in a server.');
			return;
		}

		const name = args.join(' ');
		if (!name) {
			await message.reply('Please provide a campaign name.');
			return;
		}

		try {
			// Create role
			const role = await message.guild.roles.create({
				name: `Campaign: ${name}`,
				reason: 'Campaign Role Creation'
			});

			// Create campaign
			const campaignData: CreateCampaignDto = {
				name,
				gmId: message.author.id,
				textChannelId: message.channel.id,
				guildId: message.guild.id,
				roleId: role.id,
				system: getGameSystem('dnd5e'),
				isActive: true
			};

			const campaign = await this.db.campaigns.create(campaignData);

			// Assign role to GM
			if (message.member) {
				await message.member.roles.add(role);
			}

			const embed = new EmbedBuilder()
				.setTitle('Campaign Created!')
				.setDescription(`Campaign "${campaign.name}" has been created.`)
				.setColor('#00FF00')
				.addFields(
					{ name: 'GM', value: `<@${campaign.gmId}>`, inline: true },
					{ name: 'Channel', value: `<#${campaign.textChannelId}>`, inline: true }
				);

			await message.reply({ embeds: [embed] });
		} catch (error) {
			console.error('Campaign creation error:', error);
			await message.reply('Failed to create campaign. Please try again.');
		}
	}

	private async handleCampaignToggle(message: Message, _args: string[]) {
		const campaign = await this.getCampaignFromMessage(message);
		if (!campaign) {
			await message.reply('No campaign found in this channel.');
			return;
		}

		if (campaign.gmId !== message.author.id) {
			await message.reply('You are not the GM of this campaign.');
			return;
		}

		try {
			const updatedCampaign = await this.db.campaigns.update(campaign.id!, {
				isActive: !campaign.isActive
			});

			const embed = new EmbedBuilder()
				.setTitle('Campaign State Updated')
				.setDescription(`Campaign "${campaign.name}" is now ${updatedCampaign.isActive ? 'active' : 'inactive'}.`)
				.setColor(updatedCampaign.isActive ? '#00FF00' : '#FF0000');

			await message.reply({ embeds: [embed] });
		} catch (error) {
			console.error('Campaign toggle error:', error);
			await message.reply('Failed to toggle campaign state. Please try again.');
		}
	}

	private async handleCharacterCommand(message: Message, args: string[]) {
		const subCommand = args[0]?.toLowerCase();

		switch (subCommand) {
			case 'create':
				await this.handleCharacterCreate(message, args.slice(1));
				break;
			case 'view':
				await this.handleCharacterView(message, args.slice(1));
				break;
			case 'list':
				await this.handleCharacterList(message);
				break;
			case 'delete':
				await this.handleCharacterDelete(message, args.slice(1));
				break;
			default:
				await message.reply('Available commands: create, view, list, delete');
		}
	}

	private async handleCharacterCreate(message: Message, args: string[]) {
		const campaign = await this.getCampaignFromMessage(message);
		if (!campaign) {
			await message.reply('This command must be used in an active campaign channel.');
			return;
		}

		const [name, avatarUrl] = args;

		if (!name) {
			await message.reply('Please provide a character name: `/char create "Character Name" [avatar URL]`');
			return;
		}

		try {
			if (avatarUrl && !this.isValidImageUrl(avatarUrl)) {
				await message.reply('Please provide a valid image URL for the avatar.');
				return;
			}

			const characterData: CreateCharacterDto = {
				name,
				avatarUrl,
				playerId: message.author.id,
				campaignId: campaign.id!
			};

			const character = await this.db.characters.create(characterData);

			const embed = new EmbedBuilder()
				.setTitle('Character Created!')
				.setDescription(`Character "${character.name}" has been created.`)
				.setColor('#00FF00')
				.addFields(
					{ name: 'Player', value: `<@${character.playerId}>`, inline: true },
					{ name: 'Campaign', value: campaign.name, inline: true }
				);

			if (character.avatarUrl) {
				embed.setThumbnail(character.avatarUrl);
			}

			await message.reply({ embeds: [embed] });
		} catch (error) {
			console.error('Character creation error:', error);
			await message.reply('Failed to create character. Please try again.');
		}
	}

	private async handleCharacterView(message: Message, args: string[]) {
		const campaign = await this.getCampaignFromMessage(message);
		if (!campaign) {
			await message.reply('This command must be used in an active campaign channel.');
			return;
		}

		const name = args.join(' ');
		if (!name) {
			await message.reply('Please provide a character name to view.');
			return;
		}

		try {
			const character = await this.db.characters.findOne({
				name,
				campaignId: campaign.id
			});

			if (!character) {
				await message.reply('Character not found.');
				return;
			}

			const embed = new EmbedBuilder()
				.setTitle(character.name)
				.setDescription(`Created by <@${character.playerId}>`)
				.setColor('#0099FF')
				.addFields(
					{ name: 'Campaign', value: campaign.name, inline: true },
					{ name: 'Created', value: character.createdAt.toLocaleDateString(), inline: true }
				);

			if (character.avatarUrl) {
				embed.setThumbnail(character.avatarUrl);
			}

			await message.reply({ embeds: [embed] });
		} catch (error) {
			console.error('Character view error:', error);
			await message.reply('Failed to view character. Please try again.');
		}
	}

	private async handleCharacterList(message: Message) {
		const campaign = await this.getCampaignFromMessage(message);
		if (!campaign) {
			await message.reply('This command must be used in an active campaign channel.');
			return;
		}

		try {
			const characters = await this.db.characters.findMany({
				campaignId: campaign.id
			});

			if (characters.length === 0) {
				await message.reply('No characters found in this campaign.');
				return;
			}

			const embed = new EmbedBuilder()
				.setTitle(`Characters in ${campaign.name}`)
				.setColor('#0099FF');

			const charactersByPlayer = new Map<string, string[]>();
			characters.forEach((char: { playerId: string; name: string }) => {
				const playerChars = charactersByPlayer.get(char.playerId) || [];
				playerChars.push(char.name);
				charactersByPlayer.set(char.playerId, playerChars);
			});

			charactersByPlayer.forEach((chars, playerId) => {
				embed.addFields({
					name: `<@${playerId}>`,
					value: chars.join('\n'),
					inline: true
				});
			});

			await message.reply({ embeds: [embed] });
		} catch (error) {
			console.error('Character list error:', error);
			await message.reply('Failed to list characters. Please try again.');
		}
	}

	private async handleCharacterDelete(message: Message, args: string[]) {
		const campaign = await this.getCampaignFromMessage(message);
		if (!campaign) {
			await message.reply('This command must be used in an active campaign channel.');
			return;
		}

		const name = args.join(' ');
		if (!name) {
			await message.reply('Please provide a character name to delete.');
			return;
		}

		try {
			const character = await this.db.characters.findOne({
				name,
				campaignId: campaign.id
			});

			if (!character) {
				await message.reply('Character not found.');
				return;
			}

			if (character.playerId !== message.author.id && campaign.gmId !== message.author.id) {
				await message.reply('You can only delete your own characters or characters in campaigns where you are the GM.');
				return;
			}

			await this.db.characters.delete(character.id);

			const embed = new EmbedBuilder()
				.setTitle('Character Deleted')
				.setDescription(`Character "${character.name}" has been deleted.`)
				.setColor('#FF0000');

			await message.reply({ embeds: [embed] });
		} catch (error) {
			console.error('Character deletion error:', error);
			await message.reply('Failed to delete character. Please try again.');
		}
	}

	private async getCampaignFromMessage(message: Message) {
		if (!message.guild) return null;

		const campaigns = await this.db.campaigns.findAll();
		return campaigns.find(campaign =>
			campaign.textChannelId === message.channel.id &&
			campaign.guildId === message.guild!.id &&
			campaign.isActive
		) || null;
	}

	private isValidImageUrl(url: string): boolean {
		try {
			const parsed = new URL(url);
			return /\.(jpg|jpeg|png|webp|gif)$/i.test(parsed.pathname);
		} catch {
			return false;
		}
	}

	private createGameSystem(name: string): GameSystem {
		return {
			id: name,
			name,
			version: '1.0.0',
			description: 'Game System'
		};
	}
}
