import { logger } from '@starbunk/shared';
import { Message } from 'discord.js';
import { BotIdentity } from '../types/botIdentity';
import { getCovaIdentityFromService } from './identity';

/**
 * Fresh Identity Service
 * Ensures Cova's identity (username, avatar) is always current
 * Fetches fresh data from Discord on each message with intelligent caching
 */

interface FreshIdentityCache {
	identity: BotIdentity;
	timestamp: number;
	guildId: string;
}

// Cache for fresh identities - per guild
const freshIdentityCache = new Map<string, FreshIdentityCache>();
const FRESH_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get fresh identity for Cova
 * Always attempts to fetch current data from Discord, with fallback to cache
 * @param message - Discord message for guild context
 * @returns Fresh BotIdentity or null if unable to fetch
 */
export async function getFreshCovaIdentity(message?: Message): Promise<BotIdentity | null> {
	try {
		const guildId = message?.guild?.id || 'global';

		logger.debug(`[FreshIdentityService] Fetching fresh identity for guild: ${guildId}`);

		// Always try to get fresh data from Discord
		const freshIdentity = await getCovaIdentityFromService(message, true); // forceRefresh = true

		if (!freshIdentity) {
			logger.warn(`[FreshIdentityService] Failed to fetch fresh identity, checking cache`);

			// Fallback to cache if fresh fetch fails
			const cached = freshIdentityCache.get(guildId);
			if (cached) {
				const age = Date.now() - cached.timestamp;
				logger.debug(`[FreshIdentityService] Using cached identity (age: ${Math.round(age / 1000)}s)`);
				return cached.identity;
			}

			return null;
		}

		// Update cache with fresh data
		freshIdentityCache.set(guildId, {
			identity: freshIdentity,
			timestamp: Date.now(),
			guildId,
		});

		logger.debug(
			`[FreshIdentityService] Fresh identity cached: "${freshIdentity.botName}" with avatar ${freshIdentity.avatarUrl.substring(0, 50)}...`,
		);

		return freshIdentity;
	} catch (error) {
		logger.error(`[FreshIdentityService] Error getting fresh identity:`, error as Error);
		return null;
	}
}

/**
 * Get identity with smart caching
 * Tries fresh fetch first, falls back to cache if needed
 * @param message - Discord message for context
 * @returns BotIdentity or null
 */
export async function getSmartCachedIdentity(message?: Message): Promise<BotIdentity | null> {
	try {
		const guildId = message?.guild?.id || 'global';

		// Check if we have a recent cache entry
		const cached = freshIdentityCache.get(guildId);
		if (cached) {
			const age = Date.now() - cached.timestamp;
			if (age < FRESH_CACHE_DURATION) {
				logger.debug(
					`[FreshIdentityService] Using smart cached identity (age: ${Math.round(age / 1000)}s)`,
				);
				return cached.identity;
			}
		}

		// Cache is stale or missing, fetch fresh
		return await getFreshCovaIdentity(message);
	} catch (error) {
		logger.error(`[FreshIdentityService] Error in smart cached identity:`, error as Error);
		return null;
	}
}

/**
 * Clear the fresh identity cache
 */
export function clearFreshIdentityCache(): void {
	const size = freshIdentityCache.size;
	freshIdentityCache.clear();
	logger.debug(`[FreshIdentityService] Cleared fresh identity cache (${size} entries)`);
}

/**
 * Get cache statistics
 */
export function getFreshIdentityCacheStats(): {
	entries: number;
	guilds: string[];
	ages: Record<string, number>;
} {
	const now = Date.now();
	const ages: Record<string, number> = {};

	for (const [guildId, cached] of freshIdentityCache.entries()) {
		ages[guildId] = Math.round((now - cached.timestamp) / 1000);
	}

	return {
		entries: freshIdentityCache.size,
		guilds: Array.from(freshIdentityCache.keys()),
		ages,
	};
}

