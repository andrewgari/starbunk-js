import { DJCovaService } from '@/services/dj-cova-service';
import { DJCova } from '@/core/dj-cova';
import { disconnectVoiceConnection } from '@/utils/voice-utils';

/**
 * Per-guild service instances to ensure state isolation between servers.
 * Each guild gets its own DJCovaService and DJCova instance with independent
 * player state, idle timers, and voice connections.
 */
const guildServices = new Map<string, DJCovaService>();

/**
 * Get or create a DJCovaService instance for a specific guild.
 * Ensures each guild has isolated state for concurrent multi-server operation.
 *
 * @param guildId - Discord guild (server) ID
 * @returns DJCovaService instance for the guild
 */
export function getDJCovaService(guildId: string): DJCovaService {
  const existing = guildServices.get(guildId);
  if (existing) {
    return existing;
  }

  const djCova = new DJCova();
  const service = new DJCovaService(djCova);
  guildServices.set(guildId, service);
  return service;
}

/**
 * Clean up and remove a guild's service instance.
 * Should be called when the bot leaves a guild or on explicit cleanup.
 *
 * @param guildId - Discord guild (server) ID
 */
export function cleanupGuildService(guildId: string): void {
  const service = guildServices.get(guildId);
  if (service) {
    // Cleanup any active resources
    disconnectVoiceConnection(guildId);
    guildServices.delete(guildId);
  }
}
