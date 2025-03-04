/**
 * Simple dependency injection container for services
 */
export class ServiceContainer {
	private static instance: ServiceContainer;
	private services: Map<string, unknown> = new Map();

	private constructor() {
		// Private constructor for singleton pattern
	}

	static getInstance(): ServiceContainer {
		if (!ServiceContainer.instance) {
			ServiceContainer.instance = new ServiceContainer();
		}
		return ServiceContainer.instance;
	}

	/**
	 * Register a service with the container
	 * @param key The service identifier
	 * @param implementation The service implementation
	 */
	register<T>(key: string, implementation: T): void {
		this.services.set(key, implementation);
	}

	/**
	 * Get a service from the container
	 * @param key The service identifier
	 * @returns The service implementation or undefined if not found
	 */
	get<T>(key: string): T | undefined {
		return this.services.get(key) as T;
	}

	/**
	 * Checks if a service exists in the container
	 * @param key The service identifier
	 * @returns True if the service exists
	 */
	has(key: string): boolean {
		return this.services.has(key);
	}

	/**
	 * For testing: reset all services
	 */
	clear(): void {
		this.services.clear();
	}
}

export default ServiceContainer.getInstance();