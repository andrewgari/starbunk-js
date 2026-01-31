import { DJCovaService } from '@/services/dj-cova-service';
import { DJCova } from '@/core/dj-cova';
import { container, ServiceId } from '@/utils';

// Singleton instance shared across all commands
let serviceInstance: DJCovaService | null = null;

/**
 * Get the shared DJCovaService singleton instance.
 * This ensures all music commands operate on the same player state.
 *
 * For testing: If a service is registered in the container, it will be used
 * instead of creating a new one. This allows tests to inject mocks.
 * Returns null if service is not available in the container (test scenario).
 */
export function getDJCovaService(): DJCovaService | null {
  // Check if a service is registered in the container (for testing)
  if (container.has(ServiceId.DJCovaService)) {
    return container.get<DJCovaService | null>(ServiceId.DJCovaService) ?? null;
  }

  // Create or return the singleton instance
  if (!serviceInstance) {
    const djCova = new DJCova();
    serviceInstance = new DJCovaService(djCova);
  }
  return serviceInstance;
}
