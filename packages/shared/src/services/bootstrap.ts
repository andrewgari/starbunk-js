import { PrismaClient } from '@prisma/client';
import { Client } from 'discord.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { WebhookService } from '../webhooks/webhookService';
import { ServiceId, container } from './container';
import { DiscordGMService } from './discordGMService';
import { DiscordService } from './discordService';
import { LLMManager, LLMProviderType } from './llm';
import { registerPrompts } from './llm/prompts';
import { Logger } from './logger';

/**
 * Bootstraps the entire application, registering all services
 * @param client The Discord client instance
 */
export async function bootstrapApplication(client: Client): Promise<void> {
	try {
		// Manually register services instead of relying on decorators
		const logger = new Logger();

		// Register the logger
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

		// Register WebhookService
		container.register(ServiceId.WebhookService, new WebhookService(logger));

		// Register LLM Manager with Ollama as the default provider
		const llmManager = new LLMManager(logger, LLMProviderType.OLLAMA);
		await llmManager.initializeAllProviders();
		// Register all prompts
		registerPrompts();
		container.register(ServiceId.LLMManager, llmManager);

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
		const logger = new Logger();
		container.register(ServiceId.Logger, logger);
		container.register(ServiceId.DiscordClient, client);

		// Initialize Discord service
		const discordService = new DiscordService(client);
		container.register(ServiceId.DiscordService, discordService);

		// Initialize webhook service
		const webhookService = new WebhookService(logger);
		container.register(ServiceId.WebhookService, webhookService);

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
export function getLogger(): Logger {
	return container.get<Logger>(ServiceId.Logger);
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

export function getLLMManager(): LLMManager {
	return container.get<LLMManager>(ServiceId.LLMManager);
}

export function getWebhookService(): any {
	return container.get(ServiceId.WebhookService);
}
