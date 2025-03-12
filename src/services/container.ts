/**
 * Simple service container implementation
 */

// Service identifier symbols
export const ServiceId = {
	Logger: Symbol.for('Logger'),
	WebhookService: Symbol.for('WebhookService'),
	DiscordClient: Symbol.for('DiscordClient')
};

// Type for service constructor
export type ServiceConstructor<T> = new (...args: unknown[]) => T;

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
}

// Export the container instance
export const container = new SimpleContainer();

// Helper function to get a service
export function getService<T>(serviceId: symbol): T {
	return container.get<T>(serviceId);
}
