import { Prisma, PrismaClient } from '@prisma/client';
import { logger } from './logger';

export class BotFrequencyService {
	private static instance: BotFrequencyService;
	private prisma: PrismaClient;

	private constructor() {
		this.prisma = new PrismaClient();
	}

	public static getInstance(): BotFrequencyService {
		if (!BotFrequencyService.instance) {
			BotFrequencyService.instance = new BotFrequencyService();
		}
		return BotFrequencyService.instance;
	}

	/**
	 * Get the frequency for a bot. Returns 100 if not set.
	 */
	public async getBotFrequency(botName: string): Promise<number> {
		try {
			const record = await this.prisma.botFrequency.findUnique({
				where: { botName }
			});

			// Return 100 if no record exists
			return record?.frequency ?? 100;
		} catch (error) {
			logger.error(`[BotFrequencyService] Error getting frequency for ${botName}:`, error instanceof Error ? error : new Error(String(error)));
			return 100; // Default to 100 on error
		}
	}

	/**
	 * Set the frequency for a bot
	 */
	public async setBotFrequency(botName: string, frequency: number): Promise<void> {
		try {
			await this.prisma.botFrequency.upsert({
				where: { botName },
				update: { frequency },
				create: { botName, frequency }
			});

			logger.info(`[BotFrequencyService] Set ${botName} frequency to ${frequency}%`);
		} catch (error) {
			logger.error(`[BotFrequencyService] Error setting frequency for ${botName}:`, error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}

	/**
	 * Reset a bot's frequency by removing its record
	 */
	public async resetBotFrequency(botName: string): Promise<void> {
		try {
			await this.prisma.botFrequency.delete({
				where: { botName }
			});

			logger.info(`[BotFrequencyService] Reset ${botName} frequency to default`);
		} catch (error) {
			// If record doesn't exist, that's fine
			if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
				return;
			}
			logger.error(`[BotFrequencyService] Error resetting frequency for ${botName}:`, error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}
}
