/**
 * Utility for managing BlueBot's enemy/rival users
 * 
 * Enemy users are those on BlueBot's "naughty list" - BlueBot treats them
 * with indignation and contempt rather than its usual friendly enthusiasm.
 */

import { logger } from '../observability/logger';

/**
 * Get the list of enemy user IDs from environment variables
 * Reads from BLUEBOT_ENEMY_USER_IDS as a comma-separated list
 * 
 * @returns Set of enemy user IDs for efficient lookup
 */
export function getEnemyUserIds(): Set<string> {
	const envValue = process.env.BLUEBOT_ENEMY_USER_IDS;
	
	if (!envValue || envValue.trim() === '') {
		return new Set();
	}
	
	const userIds = envValue
		.split(',')
		.map(id => id.trim())
		.filter(id => id.length > 0);
	
	if (userIds.length > 0) {
		logger.debug(`Loaded ${userIds.length} enemy user ID(s) from environment`);
	}
	
	return new Set(userIds);
}

/**
 * Check if a user ID is on BlueBot's enemy list
 * 
 * @param userId - Discord user ID to check
 * @returns true if the user is an enemy, false otherwise
 */
export function isEnemyUser(userId: string): boolean {
	const enemies = getEnemyUserIds();
	return enemies.has(userId);
}

/**
 * Cached enemy user IDs to avoid re-parsing environment on every message
 * Call refreshEnemyCache() to reload from environment if needed
 */
let cachedEnemyIds: Set<string> | null = null;

/**
 * Get cached enemy user IDs (loads from environment on first call)
 * 
 * @returns Set of enemy user IDs
 */
export function getCachedEnemyUserIds(): Set<string> {
	if (cachedEnemyIds === null) {
		cachedEnemyIds = getEnemyUserIds();
	}
	return cachedEnemyIds;
}

/**
 * Check if a user is an enemy using cached IDs
 * 
 * @param userId - Discord user ID to check
 * @returns true if the user is an enemy, false otherwise
 */
export function isEnemyUserCached(userId: string): boolean {
	return getCachedEnemyUserIds().has(userId);
}

/**
 * Refresh the enemy user cache from environment variables
 * Useful if environment changes at runtime
 */
export function refreshEnemyCache(): void {
	cachedEnemyIds = getEnemyUserIds();
	logger.info(`Enemy user cache refreshed: ${cachedEnemyIds.size} enemy user(s)`);
}

