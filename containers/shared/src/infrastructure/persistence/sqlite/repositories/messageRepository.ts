import { PrismaClient } from '@prisma/client';
import { Message } from '../../../../domain/models';
import { MessageRepository } from '../../../../domain/repositories';

export class SQLiteMessageRepository implements MessageRepository {
	constructor(private prisma: PrismaClient) { }

	async create(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
		return this.prisma.message.create({
			data: message
		});
	}

	async findByCampaign(campaignId: string, limit?: number): Promise<Message[]> {
		return this.prisma.message.findMany({
			where: { campaignId },
			orderBy: { timestamp: 'desc' },
			take: limit
		});
	}

	async findByTimeRange(campaignId: string, start: Date, end: Date): Promise<Message[]> {
		return this.prisma.message.findMany({
			where: {
				campaignId,
				timestamp: {
					gte: start,
					lte: end
				}
			},
			orderBy: { timestamp: 'asc' }
		});
	}
}
