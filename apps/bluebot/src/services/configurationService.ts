import { PrismaClient } from '@prisma/client';
import { logger } from '@starbunk/shared';

export class ConfigurationService {
	private prisma: PrismaClient;

	constructor() {
		this.prisma = new PrismaClient();
	}

	async getUserIdByUsername(username: string): Promise<string | null> {
		try {
			const user = await this.prisma.user.findFirst({
				where: {
					username: {
						equals: username,
						mode: 'insensitive',
					},
				},
			});

			return user?.discordId ?? null;
		} catch (error) {
			logger.error(`Failed to get user ID for username ${username}:`, error);
			return null;
		}
	}

	async disconnect(): Promise<void> {
		await this.prisma.$disconnect();
	}
}
