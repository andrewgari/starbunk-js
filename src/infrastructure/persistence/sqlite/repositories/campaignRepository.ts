import { PrismaClient } from '@prisma/client';
import { Campaign } from '../../../../domain/models';
import { CampaignMetadata, CampaignRepository, CreateCampaignData } from '../../../../domain/repositories';
import { GameSystem } from '../../../../starbunk/types/game';

export class SQLiteCampaignRepository implements CampaignRepository {
	constructor(private prisma: PrismaClient) { }

	public async create(data: CreateCampaignData): Promise<Campaign> {
		const campaign = await this.prisma.campaign.create({
			data: {
				name: data.name,
				system: JSON.stringify(data.system),
				textChannelId: data.textChannelId,
				voiceChannelId: data.voiceChannelId,
				gmId: data.gmId,
				adventureId: data.adventureId,
				isActive: data.isActive
			}
		});

		return {
			id: campaign.id,
			name: campaign.name,
			system: JSON.parse(campaign.system) as GameSystem,
			textChannelId: campaign.textChannelId,
			voiceChannelId: campaign.voiceChannelId,
			gmId: campaign.gmId,
			adventureId: campaign.adventureId || 'default',
			isActive: campaign.isActive,
			createdAt: campaign.createdAt,
			updatedAt: campaign.updatedAt
		};
	}

	public async findById(id: string): Promise<Campaign | null> {
		const campaign = await this.prisma.campaign.findUnique({
			where: { id }
		});

		if (!campaign) {
			return null;
		}

		return {
			id: campaign.id,
			name: campaign.name,
			system: JSON.parse(campaign.system) as GameSystem,
			textChannelId: campaign.textChannelId,
			voiceChannelId: campaign.voiceChannelId,
			gmId: campaign.gmId,
			adventureId: campaign.adventureId || 'default',
			isActive: campaign.isActive,
			createdAt: campaign.createdAt,
			updatedAt: campaign.updatedAt
		};
	}

	public async findAll(): Promise<Campaign[]> {
		const campaigns = await this.prisma.campaign.findMany();
		return campaigns.map(campaign => ({
			id: campaign.id,
			name: campaign.name,
			system: JSON.parse(campaign.system) as GameSystem,
			textChannelId: campaign.textChannelId,
			voiceChannelId: campaign.voiceChannelId,
			gmId: campaign.gmId,
			adventureId: campaign.adventureId || 'default',
			isActive: campaign.isActive,
			createdAt: campaign.createdAt,
			updatedAt: campaign.updatedAt
		}));
	}

	public async update(id: string, data: Partial<Campaign>): Promise<Campaign> {
		const campaign = await this.prisma.campaign.update({
			where: { id },
			data: {
				name: data.name,
				system: data.system ? JSON.stringify(data.system) : undefined,
				textChannelId: data.textChannelId,
				voiceChannelId: data.voiceChannelId,
				gmId: data.gmId,
				adventureId: data.adventureId,
				isActive: data.isActive
			}
		});

		return {
			id: campaign.id,
			name: campaign.name,
			system: JSON.parse(campaign.system) as GameSystem,
			textChannelId: campaign.textChannelId,
			voiceChannelId: campaign.voiceChannelId,
			gmId: campaign.gmId,
			adventureId: campaign.adventureId || 'default',
			isActive: campaign.isActive,
			createdAt: campaign.createdAt,
			updatedAt: campaign.updatedAt
		};
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
			where: { id }
		});

		if (!campaign || !campaign.metadata) {
			return null;
		}

		return JSON.parse(campaign.metadata) as CampaignMetadata;
	}
}
