import { ChannelType, GuildChannel, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel } from 'discord.js';
import fs from 'fs/promises';
import guildIds from '../../discord/guildIds';
import { Campaign } from '../../domain/models';
import { CampaignMetadata, CampaignRepository, CreateCampaignData } from '../../domain/repositories';
import { RepositoryFactory } from '../../infrastructure/persistence/repositoryFactory';
import { getDiscordService } from '@starbunk/shared';
import { logger } from '@starbunk/shared';
import { GameSystem, SUPPORTED_SYSTEMS } from '../types/game';
import { CampaignFileService } from './campaignFileService';

export class CampaignService {
	private static instance: CampaignService;
	private campaignRepository: CampaignRepository;
	private fileService: CampaignFileService;

	private constructor() {
		const factory = RepositoryFactory.getInstance();
		this.campaignRepository = factory.getCampaignRepository();
		this.fileService = CampaignFileService.getInstance();
	}

	public static getInstance(): CampaignService {
		if (!CampaignService.instance) {
			CampaignService.instance = new CampaignService();
		}
		return CampaignService.instance;
	}

	public async createCampaign(
		channel: GuildChannel,
		name: string,
		system: GameSystem,
		gmId: string,
		existingVoiceChannel?: GuildChannel
	): Promise<Campaign> {
		const guild = channel.guild;

		// Use existing voice channel or create a new one
		const voiceChannel = existingVoiceChannel || await guild.channels.create({
			name: `${name}-voice`,
			type: ChannelType.GuildVoice,
			parent: channel.parent
		});

		// Create campaign with both channel IDs
		const campaignData: CreateCampaignData = {
			name,
			system,
			textChannelId: channel.id,
			voiceChannelId: voiceChannel.id,
			gmId,
			isActive: true,
			adventureId: 'default'
		};

		// Create campaign
		const campaign = await this.campaignRepository.create(campaignData);

		// Initialize metadata with empty arrays
		const metadata: CampaignMetadata = {
			name,
			system,
			textChannelId: channel.id,
			voiceChannelId: voiceChannel.id,
			gmId,
			isActive: true,
			adventureId: 'default',
			sessions: [],
			characters: [],
			reminders: []
		};

		await this.campaignRepository.updateMetadata(campaign.id, metadata);
		logger.info(`Created new campaign ${name} with text channel ${channel.id} and voice channel ${voiceChannel.id}`);

		return campaign;
	}

	public async getCampaign(id: string): Promise<Campaign | null> {
		return this.campaignRepository.findById(id);
	}

	public async getCampaignByChannel(channelId: string): Promise<Campaign | null> {
		const campaigns = await this.campaignRepository.findAll();
		return campaigns.find((campaign: Campaign) => campaign.textChannelId === channelId) || null;
	}

	public async listCampaigns(): Promise<Campaign[]> {
		return this.campaignRepository.findAll();
	}

	public async getActiveCampaigns(): Promise<Campaign[]> {
		const campaigns = await this.campaignRepository.findAll();
		return campaigns.filter((campaign: Campaign) => campaign.isActive);
	}

	public async getCampaignsBySystem(systemId: string): Promise<Campaign[]> {
		const campaigns = await this.campaignRepository.findAll();
		return campaigns.filter((campaign: Campaign) => campaign.system.id === systemId);
	}

	public async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
		return this.campaignRepository.update(id, updates);
	}

	public async deactivateCampaign(id: string): Promise<void> {
		await this.updateCampaign(id, { isActive: false });
		logger.info(`Deactivated campaign: ${id}`);
	}

	public getSupportedSystems(): GameSystem[] {
		return Object.values(SUPPORTED_SYSTEMS);
	}

	private async getCampaignMetadata(campaignId: string): Promise<CampaignMetadata> {
		const metadata = await this.campaignRepository.getMetadata(campaignId);
		if (!metadata) {
			throw new Error(`No metadata found for campaign ${campaignId}`);
		}
		return metadata;
	}

	public async scheduleSession(
		campaignId: string,
		date: string,
		title: string,
		description?: string,
		isRecurring?: boolean,
		recurringInterval?: 'weekly' | 'biweekly' | 'monthly'
	): Promise<void> {
		const campaign = await this.campaignRepository.findById(campaignId);
		if (!campaign) {
			throw new Error(`Campaign ${campaignId} not found`);
		}

		const metadata = await this.getCampaignMetadata(campaignId);
		const eventDate = new Date(date);

		// Create Discord event
		const discordService = getDiscordService();
		const guild = discordService.getGuild(guildIds.StarbunkCrusaders);
		const channel = guild.channels.cache.get(campaign.voiceChannelId);

		if (!channel?.isVoiceBased()) {
			throw new Error('Campaign voice channel not found or is not a voice channel');
		}

		const event = await guild.scheduledEvents.create({
			name: title,
			description: description || `${campaign.name} - ${campaign.system.name} Session`,
			scheduledStartTime: eventDate,
			privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
			entityType: GuildScheduledEventEntityType.Voice,
			channel: channel
		});

		// Update campaign metadata
		metadata.sessions = [...metadata.sessions, {
			date,
			title,
			description,
			discordEventId: event.id,
			isRecurring,
			recurringInterval,
			skippedDates: []
		}];

		await this.campaignRepository.updateMetadata(campaignId, metadata);
		logger.info(`Scheduled session for campaign ${campaign.name} on ${date}`);
	}

	public async skipSession(campaignId: string, date: string): Promise<void> {
		const campaign = await this.campaignRepository.findById(campaignId);
		if (!campaign) {
			throw new Error('Campaign not found');
		}

		const metadata = await this.getCampaignMetadata(campaignId);

		// Find the recurring session that would occur on this date
		const session = metadata.sessions.find(s => s.isRecurring && this.isSessionOnDate(s, date));
		if (!session) {
			throw new Error('No recurring session found for this date');
		}

		// Add date to skipped dates
		session.skippedDates = [...(session.skippedDates || []), date];

		// If there's a Discord event for this date, delete it
		if (session.discordEventId) {
			const discordService = getDiscordService();
			const guild = discordService.getGuild(guildIds.StarbunkCrusaders);
			await guild.scheduledEvents.delete(session.discordEventId);
		}

		await this.campaignRepository.updateMetadata(campaignId, metadata);
		logger.info(`Skipped session for campaign ${campaign.name} on ${date}`);
	}

	private isSessionOnDate(session: CampaignMetadata['sessions'][0], targetDate: string): boolean {
		const sessionDate = new Date(session.date);
		const target = new Date(targetDate);

		if (!session.isRecurring) {
			return sessionDate.toISOString().split('T')[0] === target.toISOString().split('T')[0];
		}

		// For recurring sessions, check if the target date falls on the recurring pattern
		const daysDiff = Math.floor((target.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

		switch (session.recurringInterval) {
			case 'weekly':
				return daysDiff % 7 === 0;
			case 'biweekly':
				return daysDiff % 14 === 0;
			case 'monthly':
				// Check if it's the same day of the month
				return target.getDate() === sessionDate.getDate();
			default:
				return false;
		}
	}

	public async addReminder(campaignId: string, message: string, time: string): Promise<void> {
		const campaign = await this.campaignRepository.findById(campaignId);
		if (!campaign) {
			throw new Error('Campaign not found');
		}

		const metadata = await this.getCampaignMetadata(campaignId);
		metadata.reminders = [...metadata.reminders, { message, time }];
		await this.campaignRepository.updateMetadata(campaignId, metadata);
		logger.info(`Added reminder for campaign ${campaignId}: ${message} at ${time}`);
	}

	public async createCharacter(campaignId: string, name: string, characterClass: string): Promise<void> {
		const campaign = await this.campaignRepository.findById(campaignId);
		if (!campaign) {
			throw new Error('Campaign not found');
		}

		const metadata = await this.getCampaignMetadata(campaignId);
		metadata.characters = [...metadata.characters, { name, class: characterClass }];
		await this.campaignRepository.updateMetadata(campaignId, metadata);
		logger.info(`Created character ${name} (${characterClass}) for campaign ${campaignId}`);
	}

	public async getCharacters(campaignId: string): Promise<CampaignMetadata['characters']> {
		const campaign = await this.campaignRepository.findById(campaignId);
		if (!campaign) {
			throw new Error('Campaign not found');
		}

		const metadata = await this.getCampaignMetadata(campaignId);
		return metadata.characters;
	}

	/**
	 * Get all campaigns
	 */
	public async getCampaigns(): Promise<Campaign[]> {
		try {
			const baseDir = this.fileService.getCampaignBasePath();
			const campaignDirs = await fs.readdir(baseDir);

			const campaigns: Campaign[] = [];
			for (const dir of campaignDirs) {
				try {
					const campaign = await this.getCampaign(dir);
					if (campaign) {
						campaigns.push(campaign);
					}
				} catch (error) {
					logger.error(`Error loading campaign from directory ${dir}:`, error instanceof Error ? error : new Error(String(error)));
					// Continue with other campaigns even if one fails
				}
			}

			return campaigns;
		} catch (error) {
			logger.error('Error getting campaigns:', error instanceof Error ? error : new Error(String(error)));
			throw new Error('Failed to get campaigns');
		}
	}

	public async getCampaignByVoiceChannel(voiceChannelId: string): Promise<Campaign | null> {
		const campaigns = await this.campaignRepository.findAll();
		return campaigns.find((campaign: Campaign) => campaign.voiceChannelId === voiceChannelId) || null;
	}

	public async linkChannels(textChannel: GuildChannel, voiceChannel: GuildChannel): Promise<void> {
		// Create a new campaign with default settings
		const campaignData: CreateCampaignData = {
			name: textChannel.name,
			system: SUPPORTED_SYSTEMS.dnd5e, // Default to D&D 5e
			textChannelId: textChannel.id,
			voiceChannelId: voiceChannel.id,
			gmId: textChannel.guild.ownerId, // Default to server owner as GM
			isActive: true,
			adventureId: 'default'
		};

		await this.campaignRepository.create(campaignData);
		logger.info(`Linked channels: text ${textChannel.id} and voice ${voiceChannel.id}`);
	}
}
