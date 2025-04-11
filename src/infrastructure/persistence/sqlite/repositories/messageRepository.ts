import { PrismaClient } from '@prisma/client';
import { Message } from '../../../../domain/models';
import { MessageRepository } from '../../../../domain/repositories';

interface PrismaMessage {
	id: string;
	content: string;
	authorId: string;
	campaignId: string;
	createdAt: Date;
	updatedAt: Date;
}

export class SQLiteMessageRepository implements MessageRepository {
	constructor(private prisma: PrismaClient) { }

	async create(message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>): Promise<Message> {
		const created = await this.prisma.message.create({
			data: {
				content: message.content,
				authorId: message.authorId,
				userId: message.authorId,
				messageId: message.content.slice(0, 100),
				timestamp: new Date(),
				campaignId: message.campaignId
			}
		});

		return {
			id: created.id,
			content: created.content,
			authorId: created.authorId,
			campaignId: created.campaignId,
			createdAt: created.createdAt,
			updatedAt: created.updatedAt
		};
	}

	async findByCampaign(campaignId: string, limit?: number): Promise<Message[]> {
		const messages = await this.prisma.message.findMany({
			where: { campaignId },
			orderBy: { createdAt: 'desc' },
			take: limit
		});

		return messages.map((msg: PrismaMessage) => ({
			id: msg.id,
			content: msg.content,
			authorId: msg.authorId,
			campaignId: msg.campaignId,
			createdAt: msg.createdAt,
			updatedAt: msg.updatedAt
		}));
	}

	async findByTimeRange(campaignId: string, start: Date, end: Date): Promise<Message[]> {
		const messages = await this.prisma.message.findMany({
			where: {
				campaignId,
				createdAt: {
					gte: start,
					lte: end
				}
			},
			orderBy: { createdAt: 'desc' }
		});

		return messages.map((msg: PrismaMessage) => ({
			id: msg.id,
			content: msg.content,
			authorId: msg.authorId,
			campaignId: msg.campaignId,
			createdAt: msg.createdAt,
			updatedAt: msg.updatedAt
		}));
	}
}
