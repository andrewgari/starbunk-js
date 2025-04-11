import { PrismaClient } from '@prisma/client';
import { Campaign } from '../../../domain/models';
import { CampaignMetadata, CampaignRepository as ICampaignRepository } from '../../../domain/repositories';
import { GameSystem, SUPPORTED_SYSTEMS } from '../../types/game';
import { CreateCampaignDto, UpdateCampaignDto } from '../dto/campaign.dto';

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
	webhookId?: string | null;
	roleId?: string | null;
};

type PrismaWhereInput = {
	id?: string;
	name?: string;
	system?: string;
	textChannelId?: string;
	voiceChannelId?: string | null;
	gmId?: string;
	guildId?: string;
	adventureId?: string | null;
	isActive?: boolean;
};

type PrismaUpdateInput = {
	name?: string;
	system?: string;
	textChannelId?: string;
	voiceChannelId?: string | null;
	gmId?: string;
	guildId?: string;
	adventureId?: string | null;
	isActive?: boolean;
	metadata?: string | null;
};

export class CampaignRepository implements ICampaignRepository {
	constructor(private prisma: PrismaClient) { }

	private mapSystemToPersistence(system: GameSystem): string {
		return system.id;
	}

	private mapSystemFromPersistence(systemId: string): GameSystem {
		const system = SUPPORTED_SYSTEMS[systemId];
		if (!system) {
			throw new Error(`Unsupported game system: ${systemId}`);
		}
		return system;
	}

	private mapToPersistence(data: CreateCampaignDto): Omit<PrismaCampaign, 'createdAt' | 'updatedAt' | 'webhookId' | 'metadata'> {
		const { id, ...rest } = data;
		return {
			id: id || crypto.randomUUID(),
			name: rest.name,
			system: this.mapSystemToPersistence(rest.system),
			textChannelId: rest.textChannelId,
			voiceChannelId: rest.voiceChannelId ?? null,
			gmId: rest.gmId,
			guildId: rest.guildId,
			adventureId: rest.adventureId ?? null,
			roleId: rest.roleId ?? null,
			isActive: rest.isActive
		};
	}

	private mapWhereClause(where: Partial<CreateCampaignDto>): PrismaWhereInput {
		const { system, ...rest } = where;
		const mapped = { ...rest } as PrismaWhereInput;
		if (system) {
			mapped.system = this.mapSystemToPersistence(system);
		}
		return mapped;
	}

	private mapUpdateData(data: UpdateCampaignDto): PrismaUpdateInput {
		const { system, ...rest } = data;
		const mapped = { ...rest } as PrismaUpdateInput;
		if (system) {
			mapped.system = this.mapSystemToPersistence(system);
		}
		return mapped;
	}

	private mapFromPersistence(result: PrismaCampaign): Campaign {
		return {
			id: result.id,
			name: result.name,
			system: this.mapSystemFromPersistence(result.system),
			textChannelId: result.textChannelId,
			voiceChannelId: result.voiceChannelId ?? undefined,
			gmId: result.gmId,
			guildId: result.guildId,
			adventureId: result.adventureId ?? undefined,
			isActive: result.isActive,
			createdAt: result.createdAt,
			updatedAt: result.updatedAt
		};
	}

	async create(data: CreateCampaignDto): Promise<Campaign> {
		const persistenceData = this.mapToPersistence(data);
		const result = await this.prisma.campaign.create({
			data: persistenceData,
			include: {
				characters: true
			}
		});
		return this.mapFromPersistence(result);
	}

	async findById(id: string): Promise<Campaign | null> {
		const result = await this.prisma.campaign.findUnique({
			where: { id }
		});
		return result ? this.mapFromPersistence(result) : null;
	}

	async findAll(): Promise<Campaign[]> {
		const results = await this.prisma.campaign.findMany();
		return results.map((result: PrismaCampaign) => this.mapFromPersistence(result));
	}

	async update(id: string, data: Partial<Campaign>): Promise<Campaign> {
		const persistenceData = this.mapUpdateData(data as UpdateCampaignDto);
		const result = await this.prisma.campaign.update({
			where: { id },
			data: persistenceData,
			include: {
				characters: true
			}
		});
		return this.mapFromPersistence(result);
	}

	async delete(id: string): Promise<void> {
		await this.prisma.campaign.delete({
			where: { id }
		});
	}

	async updateMetadata(id: string, metadata: CampaignMetadata): Promise<void> {
		await this.prisma.campaign.update({
			where: { id },
			data: {
				metadata: JSON.stringify(metadata)
			}
		});
	}

	async getMetadata(id: string): Promise<CampaignMetadata | null> {
		const campaign = await this.prisma.campaign.findUnique({
			where: { id },
			select: { metadata: true }
		});

		if (!campaign?.metadata) {
			return null;
		}

		return JSON.parse(campaign.metadata) as CampaignMetadata;
	}
}
