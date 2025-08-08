import { logger, ensureError } from '@starbunk/shared';
import fs from 'fs';
import path from 'path';
import { ReplyBotImpl } from './bot-builder';

export interface BotDiscoveryResult {
	bots: ReplyBotImpl[];
	errors: Array<{ directory: string; error: Error }>;
}

export class BotDiscovery {
	private readonly botsDirectory: string;

	constructor(botsDirectory?: string) {
		this.botsDirectory = botsDirectory || path.join(__dirname, '../reply-bots');
	}

	async discoverBots(): Promise<BotDiscoveryResult> {
		const result: BotDiscoveryResult = { bots: [], errors: [] };

		try {
			const directories = this.getBotDirectories();
			logger.debug(`Scanning ${directories.length} directories for bots`);

			const discoveries = await Promise.allSettled(
				directories.map(dir => this.loadBotFromDirectory(dir))
			);

			this.processDiscoveryResults(discoveries, result);
			this.logDiscoveryResults(result);

			return result;
		} catch (error) {
			logger.error('Critical error during bot discovery:', ensureError(error));
			return result;
		}
	}

	private getBotDirectories(): string[] {
		if (!fs.existsSync(this.botsDirectory)) {
			logger.warn(`Bots directory not found: ${this.botsDirectory}`);
			return [];
		}

		return fs.readdirSync(this.botsDirectory, { withFileTypes: true })
			.filter(dirent => this.isValidBotDirectory(dirent))
			.map(dirent => dirent.name);
	}

	private isValidBotDirectory(dirent: fs.Dirent): boolean {
		return dirent.isDirectory() &&
			!dirent.name.startsWith('.') &&
			!['dist', 'node_modules'].includes(dirent.name);
	}

	private async loadBotFromDirectory(directory: string): Promise<ReplyBotImpl> {
		const botPath = path.join(this.botsDirectory, directory);
		const indexPath = this.findIndexFile(botPath);

		if (!indexPath) {
			throw new Error(`No index file found in ${directory}`);
		}

		const absolutePath = path.resolve(indexPath);
		const botModule = await import(absolutePath);
		const bot = botModule.default;

		if (!this.validateBot(bot)) {
			throw new Error(`Invalid bot implementation in ${directory}`);
		}

		logger.debug(`Successfully loaded bot: ${bot.name}`);
		return bot;
	}

	private findIndexFile(botPath: string): string | null {
		const candidates = ['index.ts', 'index.js'];
		
		for (const candidate of candidates) {
			const filePath = path.join(botPath, candidate);
			if (fs.existsSync(filePath)) {
				return filePath;
			}
		}

		return null;
	}

	private validateBot(bot: unknown): bot is ReplyBotImpl {
		if (!bot || typeof bot !== 'object') return false;

		const required = ['name', 'description', 'processMessage', 'shouldRespond'];
		return required.every(prop => {
			const value = (bot as Record<string, unknown>)[prop];
			return prop === 'name' || prop === 'description' ? 
				typeof value === 'string' : typeof value === 'function';
		});
	}

	private processDiscoveryResults(
		discoveries: PromiseSettledResult<ReplyBotImpl>[],
		result: BotDiscoveryResult
	): void {
		discoveries.forEach((discovery, index) => {
			const directory = this.getBotDirectories()[index];
			
			if (discovery.status === 'fulfilled') {
				result.bots.push(discovery.value);
			} else {
				const error = ensureError(discovery.reason);
				result.errors.push({ directory, error });
				logger.warn(`Failed to load bot from ${directory}: ${error.message}`);
			}
		});
	}

	private logDiscoveryResults(result: BotDiscoveryResult): void {
		if (result.bots.length > 0) {
			logger.info(`Discovered ${result.bots.length} reply bots:`);
			result.bots.forEach(bot => logger.info(`  - ${bot.name}`));
		} else {
			logger.warn('No reply bots discovered');
		}

		if (result.errors.length > 0) {
			logger.warn(`Failed to load ${result.errors.length} bots`);
		}
	}
}