/**
 * Type-safe dependency injection container
 *
 * NOTE: This file is being replaced by container.ts
 * It's kept for backward compatibility but will be removed in the future
 */

import { Client, TextChannel, WebhookClient } from 'discord.js';
import { MessageInfo } from '../webhooks/types';
import { DiscordService } from './discord-service';
// import { LLMManager } from './llm/llm-manager'; // TODO: Missing - commented out to fix build

// Define a basic ReplyBot interface since the actual implementation is not available in shared
export interface ReplyBot {
	name: string;
	trigger: (message: string) => boolean;
	respond: (message: string) => string | Promise<string>;
}

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

// Service identifier symbols
export const ServiceId = {
	Logger: 'Logger',
	WebhookService: 'WebhookService',
	DiscordClient: 'DiscordClient',
	DiscordService: 'DiscordService',
	// LLMManager: 'LLMManager', // TODO: Missing - commented out to fix build
	BlueBot: 'BlueBot',
	BananaBot: 'BananaBot',
	AttitudeBot: 'AttitudeBot',
	BabyBot: 'BabyBot',
	CatBot: 'CatBot',
	DadBot: 'DadBot',
	DogBot: 'DogBot',
	FoodBot: 'FoodBot',
	GoodBot: 'GoodBot',
	HugBot: 'HugBot',
	MomBot: 'MomBot',
	SpiderBot: 'SpiderBot',
	VennBot: 'VennBot',
	MusicCorrectBot: 'MusicCorrectBot',
} as const;

export type ServiceId = (typeof ServiceId)[keyof typeof ServiceId];

// Service type registry
interface ServiceMap {
	[ServiceId.Logger]: Logger;
	[ServiceId.WebhookService]: WebhookService;
	[ServiceId.DiscordClient]: Client;
	[ServiceId.DiscordService]: DiscordService;
	// [ServiceId.LLMManager]: LLMManager; // TODO: Missing - commented out to fix build
	[ServiceId.BlueBot]: ReplyBot;
	[ServiceId.BananaBot]: ReplyBot;
	[ServiceId.AttitudeBot]: ReplyBot;
	[ServiceId.BabyBot]: ReplyBot;
	[ServiceId.CatBot]: ReplyBot;
	[ServiceId.DadBot]: ReplyBot;
	[ServiceId.DogBot]: ReplyBot;
	[ServiceId.FoodBot]: ReplyBot;
	[ServiceId.GoodBot]: ReplyBot;
	[ServiceId.HugBot]: ReplyBot;
	[ServiceId.MomBot]: ReplyBot;
	[ServiceId.SpiderBot]: ReplyBot;
	[ServiceId.VennBot]: ReplyBot;
	[ServiceId.MusicCorrectBot]: ReplyBot;
}

// Simple container implementation
class ServiceContainer {
	private services: Partial<ServiceMap> = {};

	public register<K extends keyof ServiceMap>(serviceId: K, factory: () => ServiceMap[K]): void {
		this.services[serviceId] = factory();
	}

	public get<K extends keyof ServiceMap>(serviceId: K): ServiceMap[K] {
		const service = this.services[serviceId];
		if (!service) {
			throw new Error(`Service ${serviceId} not registered`);
		}
		return service as ServiceMap[K];
	}

	public clear(): void {
		this.services = {};
	}
}

// Export the container instance
export const container = new ServiceContainer();

// Helper function to get a service
export function getService<K extends keyof ServiceMap>(serviceId: K): ServiceMap[K] {
	return container.get(serviceId);
}
