import { PrismaClient } from '@prisma/client';
import { Client } from 'discord.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '@starbunk/shared';
import { ServiceId, container } from '@starbunk/shared';
import { DiscordGMService } from './discord-gm-service';
import { DiscordService } from './discord-service';

/**
 * Bootstraps the entire application, registering all services
 * @param client The Discord client instance
 */
export async function bootstrapApplication(client: Client): Promise<void> {
	try {
		// Register the logger (using shared logger instance)
		container.register(ServiceId.Logger, logger);

		// Ensure data directory exists
		const dataDir = path.join(process.cwd(), 'data');
		await fs.mkdir(dataDir, { recursive: true });

		// Initialize Prisma and ensure database exists
		const prisma = new PrismaClient();
		try {
			// Test database connection and create if not exists
			await prisma.$connect();
			logger.info('Database connection established');
		} catch (error) {
			logger.error(
				'Database connection failed, attempting to create:',
				error instanceof Error ? error : new Error(String(error)),
			);
			// Ensure the database file exists
			const dbPath = path.join(dataDir, 'starbunk.db');
			await fs.writeFile(dbPath, '');
			logger.info('Created empty database file');

			// Run migrations
			const { execSync } = require('child_process');
			try {
				execSync('npx prisma migrate deploy', { stdio: 'inherit' });
				logger.info('Database migrations applied successfully');
			} catch (migrationError) {
				logger.error(
					'Failed to apply migrations:',
					migrationError instanceof Error ? migrationError : new Error(String(migrationError)),
				);
				throw migrationError;
			}
		} finally {
			await prisma.$disconnect();
		}

		// Register the Discord client
		container.register(ServiceId.DiscordClient, client);

		// Initialize and register DiscordService singleton
		const discordService = new DiscordService(client);
		container.register(ServiceId.DiscordService, discordService);

		// Initialize and register DiscordGMService
		container.register(ServiceId.DiscordGMService, DiscordGMService.initialize(client, discordService));

		// Note: WebhookService should be registered by the app itself
		// container.register(ServiceId.WebhookService, new WebhookService(logger));

		logger.info('🚀 Core services bootstrapped successfully');
	} catch (error) {
		console.error('Failed to bootstrap services', error);
		throw error;
	}
}

/**
 * Bootstraps only the basic services needed for Snowbunk
 * @param client The Discord client instance
 */
export async function bootstrapSnowbunkApplication(client: Client): Promise<void> {
	try {
		// Register minimal services needed for Snowbunk
		container.register(ServiceId.Logger, logger);
		container.register(ServiceId.DiscordClient, client);

		// Initialize Discord service
		const discordService = new DiscordService(client);
		container.register(ServiceId.DiscordService, discordService);

		// Note: WebhookService should be registered by the app itself

		logger.info('Snowbunk services bootstrapped successfully');
	} catch (error) {
		console.error(
			'Failed to bootstrap Snowbunk services:',
			error instanceof Error ? error : new Error(String(error)),
		);
		throw error;
	}
}

// Helper functions to get services (type-safe)
export function getLogger(): typeof logger {
	return container.get<typeof logger>(ServiceId.Logger);
}

export function getDiscordClient(): Client {
	return container.get<Client>(ServiceId.DiscordClient);
}

export function getDiscordService(): DiscordService {
	return container.get<DiscordService>(ServiceId.DiscordService);
}

export function getDiscordGMService(): DiscordGMService {
	return container.get<DiscordGMService>(ServiceId.DiscordGMService);
}

// Note: WebhookService getter removed - should be managed by the app itself
