import { logger, ensureError } from '@starbunk/shared';
import { DiscordService } from '@starbunk/shared/dist/services/discordService';
import { Message } from 'discord.js';
import { BotIdentity } from '../types/botIdentity';
import { TriggerResponse } from './trigger-response';
import { ValidatedReplyBotConfig } from './bot-builder';

export class BotProcessor {
	private discordService?: DiscordService;
	private sortedTriggers?: TriggerResponse[];

	constructor(private config: ValidatedReplyBotConfig) {
		this.initializeServices();
	}

	async shouldRespond(message: Message): Promise<boolean> {
		if (this.config.disabled) return false;
		if (!this.passesResponseRate()) return false;
		if (await this.shouldSkipMessage(message)) return false;

		return this.hasTriggerMatch(message);
	}

	async processMessage(message: Message): Promise<void> {
		if (!(await this.shouldRespond(message))) return;
		if (this.isBlacklisted(message)) return;

		const trigger = await this.findMatchingTrigger(message);
		if (!trigger) return;

		try {
			const response = await this.generateResponse(trigger, message);
			if (response) {
				await this.sendResponse(response, message);
			}
		} catch (error) {
			logger.error(`[${this.config.name}] Error processing message:`, ensureError(error));
		}
	}

	private passesResponseRate(): boolean {
		if (this.config.defaultResponseRate <= 0) return false;
		return Math.random() * 100 <= this.config.defaultResponseRate;
	}

	private async shouldSkipMessage(message: Message): Promise<boolean> {
		return await this.config.messageFilter(message);
	}

	private async hasTriggerMatch(message: Message): Promise<boolean> {
		const triggers = this.getSortedTriggers();

		for (const trigger of triggers) {
			try {
				if (await trigger.condition(message)) {
					return true;
				}
			} catch (error) {
				logger.debug(`[${this.config.name}] Error in trigger "${trigger.name}":`, error);
			}
		}

		return false;
	}

	private isBlacklisted(message: Message): boolean {
		const guildId = message.guild?.id;
		const userId = message.author.id;

		if (!guildId) return false;

		const blacklistKey = `blacklist:${guildId}:${userId}`;
		return !!getBotData(this.config.name, blacklistKey);
	}

	private async findMatchingTrigger(message: Message): Promise<TriggerResponse | null> {
		const triggers = this.getSortedTriggers();

		for (const trigger of triggers) {
			try {
				if (await trigger.condition(message)) {
					return trigger;
				}
			} catch (error) {
				logger.debug(`[${this.config.name}] Trigger error "${trigger.name}":`, error);
			}
		}

		return null;
	}

	private async generateResponse(
		trigger: TriggerResponse,
		message: Message,
	): Promise<{
		text: string;
		identity: BotIdentity;
	} | null> {
		const responseText = await trigger.response(message);
		if (!responseText) return null;

		const identity = await this.resolveIdentity(trigger, message);
		if (!identity) return null;

		return { text: responseText, identity };
	}

	private async resolveIdentity(trigger: TriggerResponse, message: Message): Promise<BotIdentity | null> {
		try {
			const identity =
				typeof trigger.identity === 'function'
					? await trigger.identity(message)
					: trigger.identity || this.config.defaultIdentity;

			if (!identity) {
				logger.debug(`[${this.config.name}] No identity resolved for trigger "${trigger.name}"`);
				return null;
			}

			return identity;
		} catch (error) {
			logger.error(`[${this.config.name}] Identity resolution failed:`, ensureError(error));
			return null;
		}
	}

	private async sendResponse(response: { text: string; identity: BotIdentity }, message: Message): Promise<void> {
		try {
			const discordService = this.getDiscordService();

			if (discordService) {
				await discordService.sendMessageWithBotIdentity(message.channel.id, response.identity, response.text);
				logger.debug(`[${this.config.name}] Sent message as ${response.identity.botName}`);
			} else {
				await this.sendFallbackMessage(message, response.text);
			}
		} catch (error) {
			logger.error(`[${this.config.name}] Failed to send response:`, ensureError(error));
			await this.sendFallbackMessage(message, response.text);
		}
	}

	private async initializeServices(): Promise<void> {
		if (this.config.discordService) {
			this.discordService = this.config.discordService;
			return;
		}

		try {
			const { container, ServiceId } = await import('@starbunk/shared');
			this.discordService = container.get(ServiceId.DiscordService);
		} catch (error) {
			logger.debug('Could not get DiscordService from container:', error);
			this.discordService = undefined;
		}
	}

	private getDiscordService(): DiscordService | null {
		return this.discordService || null;
	}

	private async sendFallbackMessage(message: Message, text: string): Promise<void> {
		try {
			if ('send' in message.channel) {
				await message.channel.send(text);
				logger.debug(`[${this.config.name}] Sent fallback message`);
			}
		} catch (error) {
			logger.error(`[${this.config.name}] Fallback message failed:`, ensureError(error));
		}
	}

	private getSortedTriggers(): TriggerResponse[] {
		if (!this.sortedTriggers) {
			this.sortedTriggers = [...this.config.triggers].sort((a, b) => (b.priority || 0) - (a.priority || 0));
		}
		return this.sortedTriggers;
	}
}

// TTL-based storage for bot data to prevent memory leaks
interface StorageItem {
	value: string | number | boolean;
	expiry: number;
	lastAccessed: number;
}

class TTLBotStorage {
	private storage = new Map<string, StorageItem>();
	private readonly defaultTTL = 24 * 60 * 60 * 1000; // 24 hours
	private readonly maxSize = 10000; // Maximum number of items
	private cleanupInterval?: NodeJS.Timeout;

	constructor() {
		this.startCleanupTimer();
	}

	set(key: string, value: string | number | boolean, ttl = this.defaultTTL): void {
		// Prevent storage from growing too large
		if (this.storage.size >= this.maxSize && !this.storage.has(key)) {
			this.evictOldestItems(Math.floor(this.maxSize * 0.1)); // Remove 10% of items
		}

		const now = Date.now();
		this.storage.set(key, {
			value,
			expiry: now + ttl,
			lastAccessed: now,
		});
	}

	get(key: string): string | number | boolean | undefined {
		const item = this.storage.get(key);
		if (!item) return undefined;

		const now = Date.now();
		if (now > item.expiry) {
			this.storage.delete(key);
			return undefined;
		}

		// Update last accessed time
		item.lastAccessed = now;
		this.storage.set(key, item);

		return item.value;
	}

	has(key: string): boolean {
		const item = this.storage.get(key);
		if (!item) return false;

		if (Date.now() > item.expiry) {
			this.storage.delete(key);
			return false;
		}

		return true;
	}

	delete(key: string): boolean {
		return this.storage.delete(key);
	}

	clear(): void {
		this.storage.clear();
	}

	size(): number {
		return this.storage.size;
	}

	getStats(): { size: number; oldestItem: number; newestItem: number } {
		const now = Date.now();
		let oldest = now;
		let newest = 0;

		for (const item of this.storage.values()) {
			if (item.lastAccessed < oldest) oldest = item.lastAccessed;
			if (item.lastAccessed > newest) newest = item.lastAccessed;
		}

		return {
			size: this.storage.size,
			oldestItem: now - oldest,
			newestItem: now - newest,
		};
	}

	private startCleanupTimer(): void {
		this.cleanupInterval = setInterval(
			() => {
				this.cleanup();
			},
			5 * 60 * 1000,
		); // Cleanup every 5 minutes

		// Cleanup on process exit
		process.on('exit', () => this.destroy());
		process.on('SIGINT', () => this.destroy());
		process.on('SIGTERM', () => this.destroy());
	}

	private cleanup(): void {
		const now = Date.now();
		let removedCount = 0;

		for (const [key, item] of this.storage.entries()) {
			if (now > item.expiry) {
				this.storage.delete(key);
				removedCount++;
			}
		}

		if (removedCount > 0) {
			logger.debug(`Cleaned up ${removedCount} expired bot storage items`);
		}
	}

	private evictOldestItems(count: number): void {
		const items = Array.from(this.storage.entries())
			.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
			.slice(0, count);

		for (const [key] of items) {
			this.storage.delete(key);
		}

		logger.debug(`Evicted ${items.length} oldest storage items to prevent memory exhaustion`);
	}

	destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = undefined;
		}
		this.storage.clear();
	}
}

const botStorage = new TTLBotStorage();

function getBotData(botName: string, key: string): string | number | boolean | undefined {
	return botStorage.get(`${botName}:${key}`);
}

export function setBotData(botName: string, key: string, value: string | number | boolean, ttlMs?: number): void {
	botStorage.set(`${botName}:${key}`, value, ttlMs);
}

export function getBotStorageStats(): { size: number; oldestItem: number; newestItem: number } {
	return botStorage.getStats();
}
