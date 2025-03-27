import { Channel } from 'discord.js';
import { Campaign } from '../../domain/models';
import { CampaignRepository, CreateCampaignData } from '../../domain/repositories';
import { RepositoryFactory } from '../../infrastructure/persistence/repositoryFactory';
import { logger } from '../../services/logger';
import { GameSystem, SUPPORTED_SYSTEMS } from '../types/game';

export class CampaignService {
	private static instance: CampaignService;
	private campaignRepository: CampaignRepository;

	private constructor() {
		const factory = RepositoryFactory.getInstance();
		this.campaignRepository = factory.getCampaignRepository();
	}

	public static getInstance(): CampaignService {
		if (!CampaignService.instance) {
			CampaignService.instance = new CampaignService();
		}
		return CampaignService.instance;
	}

	public async createCampaign(
		name: string,
		systemId: string,
		channel: Channel,
		gmId: string
	): Promise<Campaign> {
		// 1. Verify system is supported
		const system = Object.values(SUPPORTED_SYSTEMS).find(sys => sys.id === systemId);
		if (!system) {
			throw new Error(`Unsupported game system: ${systemId}`);
		}

		// 2. Check if a campaign with the same name already exists
		const allCampaigns = await this.campaignRepository.list();
		const existingCampaign = allCampaigns.find(
			campaign => campaign.name.toLowerCase() === name.toLowerCase()
		);

		if (existingCampaign) {
			throw new Error(`Campaign with name "${name}" already exists`);
		}

		// 3. Check if there's an active campaign in this channel
		const existingChannelCampaign = await this.campaignRepository.findByChannel(channel.id);
		if (existingChannelCampaign) {
			// Deactivate the existing campaign in this channel
			await this.campaignRepository.update(existingChannelCampaign.id, { isActive: false });
			logger.info(`Deactivated existing campaign ${existingChannelCampaign.name} in channel ${channel.id}`);
		}

		// 4. Create the new campaign
		const campaignData: CreateCampaignData = {
			name,
			system,
			channelId: channel.id,
			gmId,
			isActive: true,
			adventureId: 'default'
		};

		const newCampaign = await this.campaignRepository.create(campaignData);
		logger.info(`Created new campaign ${name} in channel ${channel.id}`);

		return newCampaign;
	}

	public async getCampaign(id: string): Promise<Campaign | null> {
		return this.campaignRepository.findById(id);
	}

	public async getCampaignByChannel(channelId: string): Promise<Campaign | null> {
		return this.campaignRepository.findByChannel(channelId);
	}

	public async listCampaigns(): Promise<Campaign[]> {
		return this.campaignRepository.list();
	}

	public async getActiveCampaigns(): Promise<Campaign[]> {
		const campaigns = await this.campaignRepository.list();
		return campaigns.filter(campaign => campaign.isActive);
	}

	public async getCampaignsBySystem(systemId: string): Promise<Campaign[]> {
		const campaigns = await this.campaignRepository.list();
		return campaigns.filter(campaign => campaign.system.id === systemId);
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
}
