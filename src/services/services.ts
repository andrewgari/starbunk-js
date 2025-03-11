/**
 * Type-safe dependency injection container
 */

import { Client, Message, TextChannel, WebhookClient } from 'discord.js';
import OpenAI from 'openai';
import { MessageInfo } from '../webhooks/types';

// Service interfaces
export interface Logger {
	debug(message: string): void;
	info(message: string): void;
	warn(message: string): void;
	error(message: string, error?: Error): void;
	success(message: string): void;
	formatMessage(message: string): string;
	getCallerInfo(): string;
}

export interface WebhookService {
	writeMessage(channel: TextChannel, messageInfo: MessageInfo): Promise<void>;
	sendMessage(message: MessageInfo): Promise<void>;
	webhookClient: WebhookClient | null;
	logger: Logger;
}

export interface DiscordClient extends Client {
	// Add any additional Discord client methods
}

export interface BlueBot {
	handleMessage(message: Message): Promise<void>;
}

export type OpenAIClient = OpenAI;

// Service identifier symbols
export const ServiceId = {
	Logger: Symbol('Logger'),
	WebhookService: Symbol('WebhookService'),
	DiscordClient: Symbol('DiscordClient'),
	BlueBot: Symbol('BlueBot'),
	OpenAIClient: Symbol('OpenAIClient'),
} as const;

// Service type registry
export interface ServiceTypes {
	[ServiceId.Logger]: Logger;
	[ServiceId.WebhookService]: WebhookService;
	[ServiceId.DiscordClient]: DiscordClient;
	[ServiceId.BlueBot]: BlueBot;
	[ServiceId.OpenAIClient]: OpenAIClient;
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
		const deps = dependencies.map(depId => container.get(depId));
		const Constructor = target as unknown as ServiceConstructor<ServiceTypes[K]>;

		if (scope === 'singleton') {
			const instance = new Constructor(...deps);
			container.register(id, () => instance);
			return target;
		}

		container.register(id, (...args) => new Constructor(...args));
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
