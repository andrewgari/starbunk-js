import { logger, ensureError, isProduction } from '@starbunk/shared';
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

			const discoveries = await Promise.allSettled(directories.map((dir) => this.loadBotFromDirectory(dir)));

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

		return fs
			.readdirSync(this.botsDirectory, { withFileTypes: true })
			.filter((dirent) => this.isValidBotDirectory(dirent))
			.map((dirent) => dirent.name);
	}

	private isValidBotDirectory(dirent: fs.Dirent): boolean {
		// Security: Prevent path traversal and invalid directory names
		if (dirent.name.includes('..') || dirent.name.includes('/') || dirent.name.includes('\\')) {
			return false;
		}

		return (
			dirent.isDirectory() &&
			!dirent.name.startsWith('.') &&
			!['dist', 'node_modules', 'test', 'tests', '__tests__'].includes(dirent.name)
		);
	}

	private async loadBotFromDirectory(directory: string): Promise<ReplyBotImpl> {
		// Security: Validate directory name to prevent path traversal
		if (directory.includes('..') || directory.includes('/') || directory.includes('\\')) {
			throw new Error(`Invalid bot directory name: ${directory}`);
		}

		const botPath = path.join(this.botsDirectory, directory);
		const resolvedPath = path.resolve(botPath);

		// Security: Ensure resolved path is within allowed bounds
		if (!resolvedPath.startsWith(path.resolve(this.botsDirectory))) {
			throw new Error(`Security violation: Bot path outside allowed directory: ${directory}`);
		}

		const indexPath = this.findIndexFile(botPath);
		if (!indexPath) {
			throw new Error(`No index file found in ${directory}`);
		}

		const absolutePath = path.resolve(indexPath);

		try {
			// Production safety: Add timeout protection for bot loading
			const loadTimeout = 10000; // 10 second timeout
			const botModule = await Promise.race([
				import(absolutePath),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error(`Bot loading timeout: ${directory}`)), loadTimeout),
				),
			]);

			const bot = botModule.default;

			if (!this.validateBot(bot)) {
				throw new Error(`Invalid bot implementation in ${directory}`);
			}

			// Production safety: Check bot resource usage
			if (bot.triggers && bot.triggers.length > 100) {
				logger.warn(`Bot ${directory} has ${bot.triggers.length} triggers - may impact performance`);
			}

			logger.debug(`Successfully loaded bot: ${bot.name}`);
			return bot;
		} catch (error) {
			// Clean up failed imports to prevent memory leaks
			if (require.cache[absolutePath]) {
				delete require.cache[absolutePath];
			}
			throw error;
		}
	}

	private findIndexFile(botPath: string): string | null {
		// In production, look for .js files first, then .ts for development
		const candidates = isProduction() ? ['index.js', 'index.ts'] : ['index.ts', 'index.js'];

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

		const requiredProps = ['name', 'description', 'processMessage', 'shouldRespond'];
		const isValid = requiredProps.every((prop) => {
			const value = (bot as Record<string, unknown>)[prop];
			if (prop === 'name' || prop === 'description') {
				return typeof value === 'string' && value.length > 0 && value.length < 100;
			}
			return typeof value === 'function';
		});

		if (!isValid) return false;

		// Additional security validations
		const botObj = bot as ReplyBotImpl;

		// Validate name contains only safe characters
		if (!/^[a-zA-Z0-9\s\-_]{1,50}$/.test(botObj.name)) {
			logger.warn(`Bot name contains invalid characters: ${botObj.name}`);
			return false;
		}

		// Check for reasonable number of triggers (prevent resource exhaustion)
		if (botObj.triggers && botObj.triggers.length > 200) {
			logger.warn(`Bot has excessive triggers (${botObj.triggers.length}): ${botObj.name}`);
			return false;
		}

		return true;
	}

	private processDiscoveryResults(
		discoveries: PromiseSettledResult<ReplyBotImpl>[],
		result: BotDiscoveryResult,
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
			result.bots.forEach((bot) => logger.info(`  - ${bot.name}`));
		} else {
			logger.warn('No reply bots discovered');
		}

		if (result.errors.length > 0) {
			logger.warn(`Failed to load ${result.errors.length} bots`);
		}
	}
}
