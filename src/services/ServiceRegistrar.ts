import container from './ServiceContainer';
import { ServiceRegistry } from './ServiceRegistry';

/**
 * Decorator options for service registration
 */
export interface ServiceOptions {
  /**
   * The service key in the registry
   */
  key: string;
  
  /**
   * Lifecycle of the service: 'singleton' (default) or 'transient'
   */
  scope?: 'singleton' | 'transient';
  
  /**
   * List of dependencies by key
   */
  dependencies?: string[];
}

/**
 * Type for a service constructor with dependencies
 */
type Constructor<T> = new (...args: any[]) => T;

/**
 * Decorator to mark a class as a registered service
 * @param options Service registration options
 */
export function Service(options: ServiceOptions) {
  return function<T>(target: Constructor<T>): void {
    // Register the service with the container
    container.registerFactory(
      options.key,
      () => {
        // If there are dependencies, resolve them
        if (options.dependencies && options.dependencies.length > 0) {
          const resolvedDeps = options.dependencies.map(depKey => 
            container.get(depKey)
          );
          // Create the service with dependencies injected
          return new target(...resolvedDeps);
        }
        
        // Create service with no dependencies
        return new target();
      },
      options.scope || 'singleton',
      options.dependencies
    );
  };
}

/**
 * Type-safe getter for a service from the container
 * @param key The service key
 * @returns The service instance or throws if not found
 */
export function getService<T>(key: string): T {
  const service = container.get<T>(key);
  if (!service) {
    throw new Error(`Service '${key}' not found in container`);
  }
  return service;
}

/**
 * Utility method to create a typed service wrapper
 * @param key The service registry key
 * @returns A function that returns the service
 */
export function createServiceGetter<T>(key: string): () => T {
  return () => getService<T>(key);
}

// Typed getters for common services
export const getLogger = createServiceGetter(ServiceRegistry.LOGGER);
export const getWebhookService = createServiceGetter(ServiceRegistry.WEBHOOK_SERVICE);
export const getDiscordClient = createServiceGetter(ServiceRegistry.DISCORD_CLIENT);