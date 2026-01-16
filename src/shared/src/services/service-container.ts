/**
 * Type definitions for service lifecycle management
 */
type ServiceScope = 'singleton' | 'transient';

/**
 * Service descriptor including creation factory, scope, and dependencies
 */
interface ServiceDescriptor<T> {
	factory: () => T;
	scope: ServiceScope;
	instance?: T;
	dependencies?: string[];
}

/**
 * Enhanced dependency injection container with lifecycle management and automatic dependency resolution
 */
export class serviceContainer {
	private static instance: serviceContainer;
	private services: Map<string, ServiceDescriptor<unknown>> = new Map();

	private constructor() {
		// Private constructor for singleton pattern
	}

	static getInstance(): serviceContainer {
		if (!serviceContainer.instance) {
			serviceContainer.instance = new serviceContainer();
		}
		return serviceContainer.instance;
	}

	/**
	 * Register a service with the container
	 * @param key The service identifier
	 * @param implementation The service implementation (for singleton direct registration)
	 */
	register<T>(key: string, implementation: T): void {
		this.services.set(key, {
			factory: () => implementation,
			scope: 'singleton',
			instance: implementation,
		});
	}

	/**
	 * Register a service factory with the container
	 * @param key The service identifier
	 * @param factory The factory function that creates the service
	 * @param scope The lifecycle scope of the service (singleton or transient)
	 * @param dependencies Optional array of dependencies required by this service
	 */
	registerFactory<T>(
		key: string,
		factory: () => T,
		scope: ServiceScope = 'singleton',
		dependencies?: string[],
	): void {
		this.services.set(key, {
			factory,
			scope,
			dependencies,
		});
	}

	/**
	 * Get a service from the container, resolving it if necessary
	 * @param key The service identifier
	 * @returns The service implementation or undefined if not found
	 */
	get<T>(key: string): T | undefined {
		const descriptor = this.services.get(key) as ServiceDescriptor<T> | undefined;

		if (!descriptor) {
			return undefined;
		}

		// For singleton services, return the cached instance if available
		if (descriptor.scope === 'singleton' && descriptor.instance) {
			return descriptor.instance;
		}

		// Create a new instance
		const instance = descriptor.factory();

		// Cache the instance for singletons
		if (descriptor.scope === 'singleton') {
			descriptor.instance = instance;
		}

		return instance;
	}

	/**
	 * Resolve all dependencies for a service and return the service
	 * @param key The service identifier
	 * @returns The fully resolved service
	 */
	resolve<T>(key: string): T | undefined {
		if (!this.has(key)) {
			return undefined;
		}

		// Check for circular dependencies during resolution
		const resolvedDependencies = new Set<string>();
		return this.resolveRecursive<T>(key, resolvedDependencies);
	}

	/**
	 * Recursively resolve a service and its dependencies
	 * @param key The service identifier
	 * @param resolvedDependencies Set of already resolved dependencies to detect cycles
	 * @returns The resolved service
	 */
	private resolveRecursive<T>(key: string, resolvedDependencies: Set<string>): T | undefined {
		// Check for circular dependencies
		if (resolvedDependencies.has(key)) {
			throw new Error(`Circular dependency detected when resolving ${key}`);
		}

		resolvedDependencies.add(key);

		const descriptor = this.services.get(key) as ServiceDescriptor<T> | undefined;

		if (!descriptor) {
			return undefined;
		}

		// If this is a singleton and already instantiated, return the instance
		if (descriptor.scope === 'singleton' && descriptor.instance) {
			return descriptor.instance;
		}

		// Resolve all dependencies first if needed
		if (descriptor.dependencies && descriptor.dependencies.length > 0) {
			// First ensure all dependencies can be resolved
			for (const depKey of descriptor.dependencies) {
				if (!this.has(depKey)) {
					throw new Error(`Cannot resolve dependency ${depKey} required by ${key}`);
				}
				this.resolveRecursive(depKey, new Set(resolvedDependencies));
			}
		}

		// Now that dependencies are resolved, create the instance
		const instance = descriptor.factory();

		// Cache singleton instances
		if (descriptor.scope === 'singleton') {
			descriptor.instance = instance;
		}

		return instance;
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

export default serviceContainer.getInstance();
