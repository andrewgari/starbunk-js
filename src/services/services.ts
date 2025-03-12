/**
 * Type-safe dependency injection container
 *
 * NOTE: This file is being replaced by container.ts
 * It's kept for backward compatibility but will be removed in the future
 */

import { Client, Message, TextChannel, WebhookClient } from 'discord.js';
import { MessageInfo } from '../webhooks/types';

// Forward declarations of service types
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
	Logger: Symbol.for('Logger'),
	WebhookService: Symbol.for('WebhookService'),
	DiscordClient: Symbol('DiscordClient'),
	BlueBot: Symbol('BlueBot'),
	BananaBot: Symbol('BananaBot'),
	AttitudeBot: Symbol('AttitudeBot'),
	BabyBot: Symbol('BabyBot'),
	CatBot: Symbol('CatBot'),
	DadBot: Symbol('DadBot'),
	DogBot: Symbol('DogBot'),
	FoodBot: Symbol('FoodBot'),
	GoodBot: Symbol('GoodBot'),
	HugBot: Symbol('HugBot'),
	MomBot: Symbol('MomBot'),
	SpiderBot: Symbol('SpiderBot'),
	VennBot: Symbol('VennBot'),
	MusicCorrectBot: Symbol('MusicCorrectBot'),
	OpenAIClient: Symbol.for('OpenAIClient')
} as const;

// Import the OpenAIClient interface
import { OpenAIClient } from './openai';

// Service type registry
export interface ServiceTypes {
	[ServiceId.Logger]: Logger;
	[ServiceId.WebhookService]: WebhookService;
	[ServiceId.DiscordClient]: Client;
	[ServiceId.BlueBot]: BaseBot;
	[ServiceId.BananaBot]: BaseBot;
	[ServiceId.AttitudeBot]: BaseBot;
	[ServiceId.BabyBot]: BaseBot;
	[ServiceId.CatBot]: BaseBot;
	[ServiceId.DadBot]: BaseBot;
	[ServiceId.DogBot]: BaseBot;
	[ServiceId.FoodBot]: BaseBot;
	[ServiceId.GoodBot]: BaseBot;
	[ServiceId.HugBot]: BaseBot;
	[ServiceId.MomBot]: BaseBot;
	[ServiceId.SpiderBot]: BaseBot;
	[ServiceId.VennBot]: BaseBot;
	[ServiceId.MusicCorrectBot]: BaseBot;
	[ServiceId.OpenAIClient]: OpenAIClient;
}

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
