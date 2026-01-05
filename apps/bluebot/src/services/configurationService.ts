import { PrismaClient } from '@prisma/client';
import { logger, ensureError } from '@starbunk/shared';

const prismaClientSingleton = new PrismaClient();

process.on('beforeExit', async () => {
	await prismaClientSingleton.$disconnect();
});

export class ConfigurationService {
	private prisma: PrismaClient;

	constructor() {
		this.prisma = prismaClientSingleton;
	}

	async getUserIdByUsername(username: string): Promise<string | null> {
		try {
			const userConfig = await this.prisma.userConfiguration.findFirst({
				where: {
					username: {
						equals: username,
						mode: 'insensitive',
					},
				},
			});

			return userConfig?.userId ?? null;
		} catch (error) {
			logger.error(`Failed to get user ID for username ${username}:`, ensureError(error));
			return null;
		}
	}

	async disconnect(): Promise<void> {
		await this.prisma.$disconnect();
	}
}
