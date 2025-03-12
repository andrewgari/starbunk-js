/**
 * Type-safe dependency injection container
 */

import { Client, Message, TextChannel, WebhookClient } from 'discord.js';
import OpenAI from 'openai';
import { MessageInfo } from '../webhooks/types';

export type OpenAIClient = OpenAI;

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
	Logger: Symbol('Logger'),
	WebhookService: Symbol('WebhookService'),
	DiscordClient: Symbol('DiscordClient'),
	BlueBot: Symbol('BlueBot'),
	OpenAIClient: Symbol('OpenAIClient'),
	BananaBot: Symbol('BananaBot'),
	AttitudeBot: Symbol('AttitudeBot'),
	BabyBot: Symbol('BabyBot'),
	ChaosBot: Symbol('ChaosBot'),
	CheckBot: Symbol('CheckBot'),
	EzioBot: Symbol('EzioBot'),
	GundamBot: Symbol('GundamBot'),
	HoldBot: Symbol('HoldBot'),
	MacaroniBot: Symbol('MacaroniBot'),
	NiceBot: Symbol('NiceBot'),
	SheeshBot: Symbol('SheeshBot'),
	SpiderBot: Symbol('SpiderBot'),
	VennBot: Symbol('VennBot'),
	MusicCorrectBot: Symbol('MusicCorrectBot')
} as const;

// Service type registry
export interface ServiceTypes {
	[ServiceId.Logger]: Logger;
	[ServiceId.WebhookService]: WebhookService;
	[ServiceId.DiscordClient]: Client;
	[ServiceId.BlueBot]: BaseBot;
	[ServiceId.OpenAIClient]: OpenAI;
	[ServiceId.BananaBot]: BaseBot;
	[ServiceId.AttitudeBot]: BaseBot;
	[ServiceId.BabyBot]: BaseBot;
	[ServiceId.ChaosBot]: BaseBot;
	[ServiceId.CheckBot]: BaseBot;
	[ServiceId.EzioBot]: BaseBot;
	[ServiceId.GundamBot]: BaseBot;
	[ServiceId.HoldBot]: BaseBot;
	[ServiceId.MacaroniBot]: BaseBot;
	[ServiceId.NiceBot]: BaseBot;
	[ServiceId.SheeshBot]: BaseBot;
	[ServiceId.SpiderBot]: BaseBot;
}

type ServiceScope = 'singleton' | 'transient';

interface ServiceDescriptor<K extends keyof ServiceTypes> {
	factory: () => ServiceTypes[K];
	scope: ServiceScope;
	instance?: ServiceTypes[K];
	dependencies: Array<keyof ServiceTypes>;
}

class Container {
	private static instance: Container;
	private services = new Map<keyof ServiceTypes, ServiceDescriptor<keyof ServiceTypes>>();

	private constructor() {
		// Private constructor for singleton pattern
	}

	static getInstance(): Container {
		if (!Container.instance) {
			Container.instance = new Container();
		}
		return Container.instance;
	}

	/**
	 * Register a service with its dependencies
	 */
	register<K extends keyof ServiceTypes>(
		id: K,
		factory: (...deps: ServiceTypes[keyof ServiceTypes][]) => ServiceTypes[K],
		options: {
			scope?: ServiceScope;
			dependencies?: Array<keyof ServiceTypes>;
		} = {}
	): void {
		this.services.set(id, {
			factory: () => {
				const deps = (options.dependencies ?? []).map(depId => this.get(depId));
				return factory(...deps);
			},
			scope: options.scope ?? 'singleton',
			dependencies: options.dependencies ?? [],
		});
	}

	/**
	 * Get a service by its identifier
	 */
	get<K extends keyof ServiceTypes>(id: K): ServiceTypes[K] {
		const descriptor = this.services.get(id);
		if (!descriptor) {
			throw new Error(`Service not registered: ${id.toString()}`);
		}

		if (descriptor.scope === 'singleton' && descriptor.instance) {
			return descriptor.instance;
		}

		const instance = this.resolve(id, new Set());

		if (descriptor.scope === 'singleton') {
			descriptor.instance = instance;
		}

		return instance;
	}

	private resolve<K extends keyof ServiceTypes>(
		id: K,
		resolving: Set<keyof ServiceTypes>
	): ServiceTypes[K] {
		if (resolving.has(id)) {
			throw new Error(`Circular dependency detected: ${id.toString()}`);
		}

		const descriptor = this.services.get(id);
		if (!descriptor) {
			throw new Error(`Service not registered: ${id.toString()}`);
		}

		resolving.add(id);

		const instance = descriptor.factory();

		resolving.delete(id);

		return instance;
	}

	/**
	 * Clear all services (useful for testing)
	 */
	clear(): void {
		this.services.clear();
	}
}

// Export the container instance
export const container = Container.getInstance();

// Decorator for registering services
export type ServiceConstructor<T> = new (...args: ServiceTypes[keyof ServiceTypes][]) => T;

export interface ServiceConfig {
	id: keyof ServiceTypes;
	dependencies?: Array<keyof ServiceTypes>;
	scope?: 'singleton' | 'transient';
}

export function Service<K extends keyof ServiceTypes>({ id, dependencies = [], scope = 'transient' }: ServiceConfig & { id: K }) {
	return function <T extends { prototype: ServiceTypes[K] }>(target: T): T {
		const Constructor = target as unknown as ServiceConstructor<ServiceTypes[K]>;

		container.register(id, () => {
			// Resolve dependencies at instantiation time
			const deps = dependencies.map(depId => container.get(depId));
			return new Constructor(...deps);
		}, { scope, dependencies });

		return target;
	};
}

// Example usage:
/*
@Service({
  id: ServiceId.Logger,
  scope: 'singleton'
})
export class Logger {
  log(message: string) {
	console.log(message);
  }
}

@Service({
  id: ServiceId.WebhookService,
  dependencies: [ServiceId.Logger]
})
export class WebhookService {
  constructor(private logger: Logger) {}

  async sendWebhook(data: any) {
	this.logger.log('Sending webhook...');
	// Implementation
  }
}

// Get a service
const logger = container.get(ServiceId.Logger);
const webhookService = container.get(ServiceId.WebhookService);
*/
