import { logger } from '@starbunk/shared/observability/logger';

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

export function isEnemyUser(userId: string): boolean {
	const enemies = getEnemyUserIds();
	return enemies.has(userId);
}

/**
 * Cached enemy user IDs to avoid re-parsing environment on every message
 * Call refreshEnemyCache() to reload from environment if needed
 */
let cachedEnemyIds: Set<string> | null = null;

export function getCachedEnemyUserIds(): Set<string> {
	if (cachedEnemyIds === null) {
		cachedEnemyIds = getEnemyUserIds();
	}
	return cachedEnemyIds;
}

export function isEnemyUserCached(userId: string): boolean {
	return getCachedEnemyUserIds().has(userId);
}

export function refreshEnemyCache(): void {
	cachedEnemyIds = getEnemyUserIds();
	logger.info(`Enemy user cache refreshed: ${cachedEnemyIds.size} enemy user(s)`);
}

