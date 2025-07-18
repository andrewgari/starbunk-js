import { logger, container, ServiceId } from '@starbunk/shared';
import { BotIdentity } from '../types/botIdentity';
import { Message, GuildMember, User } from 'discord.js';

/**
 * Interface for Discord service operations
 */
interface DiscordService {
	getMemberAsync(guildId: string, userId: string): Promise<GuildMember | null>;
	getUserAsync(userId: string): Promise<User | null>;
}

// Cova's Discord user ID with validation
const COVA_USER_ID = (() => {
  const userId = process.env.COVA_USER_ID || '139592376443338752';
  if (!/^\d{17,19}$/.test(userId)) {
    logger.warn(`[CovaIdentityService] Invalid COVA_USER_ID format: ${userId}, using default`);
    return '139592376443338752';
  }
  return userId;
})();

// Cache for identity data with expiration
interface IdentityCache {
  identity: BotIdentity;
  timestamp: number;
  guildId?: string;
}

const identityCache = new Map<string, IdentityCache>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000; // Maximum number of cached entries

// Helper to maintain cache size
function maintainCacheSize() {
  if (identityCache.size > MAX_CACHE_SIZE) {
    // Remove oldest entries
    const entriesToRemove = identityCache.size - MAX_CACHE_SIZE;
    const iterator = identityCache.entries();
    for (let i = 0; i < entriesToRemove; i++) {
      const { value } = iterator.next();
      if (value) {
        identityCache.delete(value[0]);
      }
    }
  }
}

/**
 * Get Cova's current Discord identity with caching and validation
 * @param message - Discord message for server context
 * @param forceRefresh - Force fresh data from Discord API
 * @param guildId - Optional guild ID for direct guild-specific identity resolution
 * @returns Promise<BotIdentity | null> - null if identity cannot be resolved
 */
export async function getCovaIdentityFromService(
  message?: Message,
  forceRefresh: boolean = false,
  guildId?: string
): Promise<BotIdentity | null> {
    try {
      const resolvedGuildId = guildId || message?.guild?.id;
      const cacheKey = resolvedGuildId || 'global';
      
      // Check cache first (unless force refresh)
      if (!forceRefresh && identityCache.has(cacheKey)) {
        const cached = identityCache.get(cacheKey)!;
        const age = Date.now() - cached.timestamp;
        
        if (age < CACHE_DURATION) {
          logger.debug(`[CovaIdentityService] Using cached identity for ${cacheKey} (age: ${Math.round(age / 1000)}s)`);
          return cached.identity;
        } else {
          logger.debug(`[CovaIdentityService] Cache expired for ${cacheKey} (age: ${Math.round(age / 1000)}s)`);
          identityCache.delete(cacheKey);
        }
      }

      logger.debug(`[CovaIdentityService] Fetching fresh identity for user ${COVA_USER_ID} in guild ${resolvedGuildId || 'global'}`);

      // Fetch fresh identity from Discord using DiscordService
      const identity = await fetchDiscordIdentity(COVA_USER_ID, resolvedGuildId, message);

      if (!identity) {
        logger.error(`[CovaIdentityService] Failed to retrieve identity for user ${COVA_USER_ID}`);
        return null;
      }

      // Validate identity data
      if (!validateIdentity(identity)) {
        logger.error(`[CovaIdentityService] Identity validation failed for user ${COVA_USER_ID}: ${JSON.stringify(identity)}`);
        return null;
      }

      // Cache the validated identity
      identityCache.set(cacheKey, {
        identity,
        timestamp: Date.now(),
        guildId: resolvedGuildId
      });

      // Maintain cache size limit
      maintainCacheSize();

      logger.debug(`[CovaIdentityService] Successfully cached identity: "${identity.botName}" with avatar ${identity.avatarUrl}`);
      return identity;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[CovaIdentityService] Error getting Cova identity: ${errorMessage}`);
      return null;
    }
}

/**
 * Fetch Discord identity using DiscordService
 */
async function fetchDiscordIdentity(
  userId: string,
  guildId?: string,
  message?: Message
): Promise<BotIdentity | null> {
    try {
      // Get DiscordService from container
      const discordService = container.get(ServiceId.DiscordService) as DiscordService;

      if (guildId && message) {
        // Get server-specific identity
        const member = await discordService.getMemberAsync(guildId, userId);

        if (!member) {
          throw new Error(`Member ${userId} not found in guild ${guildId}`);
        }

        // Get server-specific nickname (falls back to username)
        const botName = member.nickname ||
                       member.user.globalName ||
                       member.user.username ||
                       'CovaBot';

        // Get server-specific avatar (falls back to global avatar)
        const avatarUrl = member.displayAvatarURL({ size: 256, extension: 'png' }) ||
                         member.user.displayAvatarURL({ size: 256, extension: 'png' });

        if (!avatarUrl) {
          throw new Error(`No valid avatar URL found for user ${userId} in guild ${guildId}`);
        }

        logger.debug(`[CovaIdentityService] Server-specific identity: "${botName}" with avatar ${avatarUrl}`);

        return {
          botName,
          avatarUrl
        };
      } else {
        // Fallback to global identity
        const user = await discordService.getUserAsync(userId);

        if (!user) {
          throw new Error(`User ${userId} not found`);
        }

        const botName = user.globalName || user.username || 'CovaBot';
        const avatarUrl = user.displayAvatarURL({ size: 256, extension: 'png' });

        if (!avatarUrl) {
          throw new Error(`No valid avatar URL found for user ${userId}`);
        }

        logger.debug(`[CovaIdentityService] Global identity: "${botName}" with avatar ${avatarUrl}`);

        return {
          botName,
          avatarUrl
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[CovaIdentityService] Failed to fetch Discord identity for ${userId}: ${errorMessage}`);
      return null;
    }
  }

/**
 * Validate that identity data is complete and usable
 */
function validateIdentity(identity: BotIdentity): boolean {
  // Check that required fields are present and non-empty
  if (!identity.botName || identity.botName.trim().length === 0) {
    logger.warn(`[CovaIdentityService] Invalid botName: "${identity.botName}"`);
    return false;
  }

  if (!identity.avatarUrl || identity.avatarUrl.trim().length === 0) {
    logger.warn(`[CovaIdentityService] Invalid avatarUrl: "${identity.avatarUrl}"`);
    return false;
  }

  // Check that avatar URL is a valid Discord CDN URL (including newer domains)
  const validUrlPattern = /^https:\/\/(cdn\.discordapp\.com|media\.discordapp\.net|cdn\.discord\.com)\//;
  if (!validUrlPattern.test(identity.avatarUrl)) {
    logger.warn(`[CovaIdentityService] Avatar URL is not a valid Discord CDN URL: "${identity.avatarUrl}"`);
    return false;
  }

  return true;
}

/**
 * Clear the identity cache (useful for testing or manual refresh)
 */
export function clearIdentityCache(): void {
  const cacheSize = identityCache.size;
  identityCache.clear();
  logger.debug(`[CovaIdentityService] Cleared identity cache (${cacheSize} entries)`);
}

/**
 * Get cache statistics for debugging
 */
export function getIdentityCacheStats(): { entries: number; keys: string[] } {
  const keys = Array.from(identityCache.keys());
  return {
    entries: identityCache.size,
    keys,
  };
}

/**
 * Pre-warm the cache with identity data for common guilds
 */
export async function preWarmIdentityCache(
  guildIds: string[]
): Promise<void> {
  logger.debug(
    `[CovaIdentityService] Pre-warming cache for ${guildIds.length} guilds`
  );

  const promises = guildIds.map(async (guildId) => {
    try {
      // Use the guildId parameter directly instead of creating a mock message
      await getCovaIdentityFromService(undefined, true, guildId);
    } catch (error) {
      logger.warn(
        `[CovaIdentityService] Failed to pre-warm cache for guild ${guildId}:`,
        error
      );
    }
  });

  await Promise.allSettled(promises);
  logger.debug(`[CovaIdentityService] Cache pre-warming complete`);
}

/**
 * Convenience function that maintains backward compatibility
 */
export async function getCovaIdentity(message?: Message): Promise<BotIdentity | null> {
  return getCovaIdentityFromService(message);
}