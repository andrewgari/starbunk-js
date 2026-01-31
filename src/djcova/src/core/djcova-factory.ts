import { DJCovaService } from '@/services/dj-cova-service';
import { DJCova } from '@/core/dj-cova';

// Singleton instance shared across all commands
let serviceInstance: DJCovaService | null = null;

/**
 * Get the shared DJCovaService singleton instance.
 * This ensures all music commands operate on the same player state.
 */
export function getDJCovaService(): DJCovaService | null {
  // Create or return the singleton instance
  if (!serviceInstance) {
    const djCova = new DJCova();
    serviceInstance = new DJCovaService(djCova);
  }
  return serviceInstance;
}
