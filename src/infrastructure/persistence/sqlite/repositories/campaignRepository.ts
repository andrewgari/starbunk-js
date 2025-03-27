import { PrismaClient } from '@prisma/client';
import { Campaign } from '../../../../domain/models';
import { CampaignMetadata, CampaignRepository, CreateCampaignData } from '../../../../domain/repositories';
import { GameSystem } from '../../../../starbunk/types/game';

type PrismaCampaign = {
	id: string;
	name: string;
	system: string;
	channelId: string;
	gmId: string;
	adventureId: string | null;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export class SQLiteCampaignRepository implements CampaignRepository {
	async getMetadata(_campaignId: string): Promise<CampaignMetadata | null> {
		// This method will be implemented later
		return null;
	}

	async updateMetadata(_campaignId: string, _metadata: CampaignMetadata): Promise<void> {
		// This method will be implemented later
	}
	constructor(private prisma: PrismaClient) { }

	private toDomainModel(prismaCampaign: PrismaCampaign): Campaign {
		return {
			...prismaCampaign,
			system: JSON.parse(prismaCampaign.system) as GameSystem,
			adventureId: prismaCampaign.adventureId || 'default'
		};
	}

	private toPrismaData(campaign: Partial<Campaign>): Partial<PrismaCampaign> {
		const { system, ...rest } = campaign;
		return {
			...rest,
			system: system ? JSON.stringify(system) : undefined
		};
	}

	async create(campaign: CreateCampaignData): Promise<Campaign> {
		const result = await this.prisma.campaign.create({
			data: {
				...campaign,
				system: JSON.stringify(campaign.system)
			}
		}) as PrismaCampaign;

		return this.toDomainModel(result);
	}

	async findById(id: string): Promise<Campaign | null> {
		const result = await this.prisma.campaign.findUnique({
			where: { id }
		}) as PrismaCampaign | null;

		if (!result) {
			return null;
		}

		return this.toDomainModel(result);
	}

	async findByChannel(channelId: string): Promise<Campaign | null> {
		const result = await this.prisma.campaign.findFirst({
			where: { channelId }
		}) as PrismaCampaign | null;

		if (!result) {
			return null;
		}

		return this.toDomainModel(result);
	}

	async list(): Promise<Campaign[]> {
		const results = await this.prisma.campaign.findMany() as PrismaCampaign[];
		return results.map(result => this.toDomainModel(result));
	}

	async update(id: string, campaign: Partial<Campaign>): Promise<Campaign> {
		const result = await this.prisma.campaign.update({
			where: { id },
			data: this.toPrismaData(campaign)
		}) as PrismaCampaign;

		return this.toDomainModel(result);
	}

	async delete(id: string): Promise<void> {
		await this.prisma.campaign.delete({
			where: { id }
		});
	}
}
