import { ChannelType, GuildChannel, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel } from 'discord.js';
import fs from 'fs/promises';
import type { Campaign, GameSystem } from '../types/game';

// Minimal in-memory repository to satisfy types during refactor away from domain/infrastructure layers
export type CampaignMetadata = {
	name: string;
	system: GameSystem;
	textChannelId: string;
	voiceChannelId: string;
	gmId: string;
	isActive: boolean;
	adventureId: string;
	sessions: Array<{
		date: string;
		title: string;
		description?: string;
		discordEventId?: string;
		isRecurring?: boolean;
		recurringInterval?: 'weekly' | 'biweekly' | 'monthly';
		skippedDates?: string[];
	}>;
	characters: Array<{ name: string; class: string }>;
	reminders: Array<{ message: string; time: string }>;
};

export type CreateCampaignData = {
	name: string;
	system: GameSystem;
	textChannelId: string;
	voiceChannelId: string;
	gmId: string;
	isActive: boolean;
	adventureId: string;
};

interface CampaignRepository {
	create(data: CreateCampaignData): Promise<Campaign>;
	findById(id: string): Promise<Campaign | null>;
	findAll(): Promise<Campaign[]>;
	update(id: string, updates: Partial<Campaign>): Promise<Campaign>;
	updateMetadata(id: string, metadata: CampaignMetadata): Promise<void>;
	getMetadata(id: string): Promise<CampaignMetadata | null>;
}

class InMemoryCampaignRepository implements CampaignRepository {
	private static instance: InMemoryCampaignRepository;
	private campaigns = new Map<string, Campaign>();
	private metadata = new Map<string, CampaignMetadata>();

	static getInstance(): InMemoryCampaignRepository {
		if (!this.instance) this.instance = new InMemoryCampaignRepository();
		return this.instance;
	}

	async create(data: CreateCampaignData): Promise<Campaign> {
		const id = data.textChannelId; // stable unique id per text channel
		const _now = new Date();
		const campaign: Campaign = {
			id,
			name: data.name,
			system: data.system,
			gmId: data.gmId,
			textChannelId: data.textChannelId,
			voiceChannelId: data.voiceChannelId,
			adventureId: data.adventureId,
			isActive: data.isActive,
			createdAt: now,
			updatedAt: now,
		};
		this.campaigns.set(id, campaign);
		// initialize empty metadata if not set later by updateMetadata
		if (!this.metadata.has(id)) {
			this.metadata.set(id, {
				name: data.name,
				system: data.system,
				textChannelId: data.textChannelId,
				voiceChannelId: data.voiceChannelId,
				gmId: data.gmId,
				isActive: data.isActive,
				adventureId: data.adventureId,
				sessions: [],
				characters: [],
				reminders: [],
			});
		}
		return campaign;
	}

	async findById(id: string): Promise<Campaign | null> {
		return this.campaigns.get(id) ?? null;
	}

	async findAll(): Promise<Campaign[]> {
		return Array.from(this.campaigns.values());
	}

	async update(id: string, updates: Partial<Campaign>): Promise<Campaign> {
		const existing = this.campaigns.get(id);
		if (!existing) throw new Error(`Campaign ${id} not found`);
		const updated: Campaign = { ...existing, ...updates, updatedAt: new Date() };
		this.campaigns.set(id, updated);
		return updated;
	}

	async updateMetadata(id: string, metadata: CampaignMetadata): Promise<void> {
		if (!this.campaigns.has(id)) throw new Error(`Campaign ${id} not found`);
		this.metadata.set(id, metadata);
	}

	async getMetadata(id: string): Promise<CampaignMetadata | null> {
		return this.metadata.get(id) ?? null;
	}
}
import { getDiscordService } from '@starbunk/shared';
import { logger } from '@starbunk/shared';
import { SUPPORTED_SYSTEMS } from '../types/game';
import { CampaignFileService } from './campaignFileService';

export class CampaignService {
	private static instance: CampaignService;
	private campaignRepository: CampaignRepository;
	private fileService: CampaignFileService;

	private constructor() {
		this.campaignRepository = InMemoryCampaignRepository.getInstance();
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
		existingVoiceChannel?: GuildChannel,
	): Promise<Campaign> {
		const guild = channel.guild;

		// Use existing voice channel or create a new one
		const voiceChannel =
			existingVoiceChannel ||
			(await guild.channels.create({
				name: `${name}-voice`,
				type: ChannelType.GuildVoice,
				parent: channel.parent,
			}));

		// Create campaign with both channel IDs
		const campaignData: CreateCampaignData = {
			name,
			system,
			textChannelId: channel.id,
			voiceChannelId: voiceChannel.id,
			gmId,
			isActive: true,
			adventureId: 'default',
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
			reminders: [],
		};

		await this.campaignRepository.updateMetadata(campaign.id, metadata);
		logger.info(
			`Created new campaign ${name} with text channel ${channel.id} and voice channel ${voiceChannel.id}`,
		);

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
		recurringInterval?: 'weekly' | 'biweekly' | 'monthly',
	): Promise<void> {
		const campaign = await this.campaignRepository.findById(campaignId);
		if (!campaign) {
			throw new Error(`Campaign ${campaignId} not found`);
		}

		const metadata = await this.getCampaignMetadata(campaignId);
		const eventDate = new Date(date);

		// Create Discord event
		const discordService = getDiscordService();
		// Default Guild ID from environment variable (fallback to Starbunk Crusaders)
		const guild = discordService.getGuild(process.env.GUILD_ID || '753251582719688714');
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
			channel: channel,
		});

		// Update campaign metadata
		metadata.sessions = [
			...metadata.sessions,
			{
				date,
				title,
				description,
				discordEventId: event.id,
				isRecurring,
				recurringInterval,
				skippedDates: [],
			},
		];

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
		const session = metadata.sessions.find((s) => s.isRecurring && this.isSessionOnDate(s, date));
		if (!session) {
			throw new Error('No recurring session found for this date');
		}

		// Add date to skipped dates
		session.skippedDates = [...(session.skippedDates || []), date];

		// If there's a Discord event for this date, delete it
		if (session.discordEventId) {
			const discordService = getDiscordService();
			// Default Guild ID from environment variable (fallback to Starbunk Crusaders)
			const guild = discordService.getGuild(process.env.GUILD_ID || '753251582719688714');
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
					logger.error(
						`Error loading campaign from directory ${dir}:`,
						error instanceof Error ? error : new Error(String(error)),
					);
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
			adventureId: 'default',
		};

		await this.campaignRepository.create(campaignData);
		logger.info(`Linked channels: text ${textChannel.id} and voice ${voiceChannel.id}`);
	}
}
