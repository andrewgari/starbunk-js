import { PrismaClient } from '@prisma/client';
import { Campaign } from '../../../../domain/models';
import { CampaignMetadata, CampaignRepository, CreateCampaignData } from '../../../../domain/repositories';
import { GameSystem } from '../../../../starbunk/types/game';

type PrismaCampaign = {
	id: string;
	name: string;
	system: string;
	textChannelId: string;
	voiceChannelId: string | null;
	gmId: string;
	guildId: string;
	adventureId: string | null;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
	metadata?: string | null;
};

export class SQLiteCampaignRepository implements CampaignRepository {
	constructor(private prisma: PrismaClient) { }

	private mapToGameSystem(systemName: string): GameSystem {
		return {
			id: systemName,
			name: systemName,
			version: '1.0.0',
			description: 'Game System'
		};
	}

	private mapToCampaign(campaign: PrismaCampaign): Campaign {
		return {
			id: campaign.id,
			name: campaign.name,
			system: this.mapToGameSystem(campaign.system),
			textChannelId: campaign.textChannelId,
			voiceChannelId: campaign.voiceChannelId || undefined,
			gmId: campaign.gmId,
			guildId: campaign.guildId,
			adventureId: campaign.adventureId || undefined,
			isActive: campaign.isActive,
			createdAt: campaign.createdAt,
			updatedAt: campaign.updatedAt
		};
	}

	public async create(data: CreateCampaignData): Promise<Campaign> {
		const campaign = await this.prisma.campaign.create({
			data: {
				name: data.name,
				system: data.system.name,
				textChannelId: data.textChannelId,
				voiceChannelId: data.voiceChannelId || null,
				gmId: data.gmId,
				guildId: data.guildId,
				adventureId: data.adventureId || null,
				isActive: data.isActive
			}
		});

		return this.mapToCampaign(campaign);
	}

	public async findById(id: string): Promise<Campaign | null> {
		const campaign = await this.prisma.campaign.findUnique({
			where: { id }
		});

		if (!campaign) {
			return null;
		}

		return this.mapToCampaign(campaign);
	}

	public async findAll(): Promise<Campaign[]> {
		const campaigns = await this.prisma.campaign.findMany();
		return campaigns.map((campaign: PrismaCampaign) => this.mapToCampaign(campaign));
	}

	public async findOne(where: Partial<Campaign>): Promise<Campaign | null> {
		const campaign = await this.prisma.campaign.findFirst({
			where: {
				...where,
				system: where.system?.name
			}
		});

		if (!campaign) {
			return null;
		}

		return this.mapToCampaign(campaign);
	}

	public async findMany(where: Partial<Campaign>): Promise<Campaign[]> {
		const campaigns = await this.prisma.campaign.findMany({
			where: {
				...where,
				system: where.system?.name
			}
		});

		return campaigns.map((campaign: PrismaCampaign) => this.mapToCampaign(campaign));
	}

	public async update(id: string, data: Partial<Campaign>): Promise<Campaign> {
		const campaign = await this.prisma.campaign.update({
			where: { id },
			data: {
				...data,
				system: data.system?.name,
				voiceChannelId: data.voiceChannelId || null,
				adventureId: data.adventureId || null
			}
		});

		return this.mapToCampaign(campaign);
	}

	public async delete(id: string): Promise<void> {
		await this.prisma.campaign.delete({
			where: { id }
		});
	}

	public async updateMetadata(id: string, metadata: CampaignMetadata): Promise<void> {
		await this.prisma.campaign.update({
			where: { id },
			data: {
				metadata: JSON.stringify(metadata)
			}
		});
	}

	public async getMetadata(id: string): Promise<CampaignMetadata | null> {
		const campaign = await this.prisma.campaign.findUnique({
			where: { id },
			select: { metadata: true }
		});

		if (!campaign?.metadata) {
			return null;
		}

		return JSON.parse(campaign.metadata) as CampaignMetadata;
	}

	public async findByGuildId(guildId: string): Promise<Campaign[]> {
		const campaigns = await this.prisma.campaign.findMany({
			where: { guildId }
		});

		return campaigns.map((campaign: PrismaCampaign) => this.mapToCampaign(campaign));
	}

	public async findByGmId(gmId: string): Promise<Campaign[]> {
		const campaigns = await this.prisma.campaign.findMany({
			where: { gmId }
		});

		return campaigns.map((campaign: PrismaCampaign) => this.mapToCampaign(campaign));
	}

	public async findByChannelId(channelId: string): Promise<Campaign | null> {
		const campaign = await this.prisma.campaign.findFirst({
			where: { textChannelId: channelId }
		});

		if (!campaign) {
			return null;
		}

		return this.mapToCampaign(campaign);
	}

	public async findActiveByGuildId(guildId: string): Promise<Campaign[]> {
		const result = await this.prisma.$queryRaw<PrismaCampaign[]>`
			SELECT * FROM "Campaign"
			WHERE "guildId" = ${guildId}
			AND "isActive" = true
		`;

		return result.map((campaign: PrismaCampaign) => this.mapToCampaign(campaign));
	}
}
