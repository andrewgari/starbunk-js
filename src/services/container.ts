/**
 * Simple service container implementation
 */
import { Message, TextChannel, WebhookClient } from 'discord.js';
import { MessageInfo } from '../webhooks/types';

// Forward declarations of service interfaces
export interface Logger {
	debug(message: string): void;
	info(message: string): void;
	warn(message: string): void;
	error(message: string, error?: Error): void;
	success(message: string): void;
	formatMessage(message: string, icon?: string): string;
	// getCallerInfo is private in the implementation
}

export interface WebhookService {
	writeMessage(channel: TextChannel, messageInfo: MessageInfo): Promise<void>;
	sendMessage(messageInfo: MessageInfo): Promise<void>;
	webhookClient: WebhookClient | null;
	logger: Logger;
}

// Base interface for all bots
export interface BaseBot {
	botName: string;
	handleMessage(message: Message): Promise<void>;
}

// Service identifier symbols
export const ServiceId = {
	// Core services
	Logger: Symbol.for('Logger'),
	WebhookService: Symbol.for('WebhookService'),
	DiscordClient: Symbol.for('DiscordClient'),
	DiscordService: Symbol.for('DiscordService'),
	LLMManager: Symbol.for('LLMManager'),
	
	// Bots
	BlueBot: Symbol.for('BlueBot'),
	BananaBot: Symbol.for('BananaBot'),
	AttitudeBot: Symbol.for('AttitudeBot'),
	BabyBot: Symbol.for('BabyBot'),
	CatBot: Symbol.for('CatBot'),
	DadBot: Symbol.for('DadBot'),
	DogBot: Symbol.for('DogBot'),
	FoodBot: Symbol.for('FoodBot'),
	GoodBot: Symbol.for('GoodBot'),
	HugBot: Symbol.for('HugBot'),
	MomBot: Symbol.for('MomBot'),
	SpiderBot: Symbol.for('SpiderBot'),
	VennBot: Symbol.for('VennBot'),
	MusicCorrectBot: Symbol.for('MusicCorrectBot')
};

// Type for service lookup by ID

// Simple container implementation
class SimpleContainer {
	private services = new Map<symbol, unknown>();

	register<T>(id: symbol, instance: T): void {
		this.services.set(id, instance);
	}

	get<T>(id: symbol): T {
		const service = this.services.get(id);
		if (!service) {
			throw new Error(`Service not registered: ${String(id)}`);
		}
		return service as T;
	}

	has(id: symbol): boolean {
		return this.services.has(id);
	}
	
	clear(): void {
		this.services.clear();
	}
}

// Export the container instance
export const container = new SimpleContainer();

// Helper function to get a service
export function getService<T>(serviceId: symbol): T {
	return container.get<T>(serviceId);
}
