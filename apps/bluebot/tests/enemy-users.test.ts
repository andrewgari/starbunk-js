import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	getEnemyUserIds,
	isEnemyUser,
	getCachedEnemyUserIds,
	isEnemyUserCached,
	refreshEnemyCache
} from '../src/utils/enemy-users';

describe('Enemy Users Utility', () => {
	const originalEnv = process.env.BLUEBOT_ENEMY_USER_IDS;

	afterEach(() => {
		// Restore original environment
		if (originalEnv !== undefined) {
			process.env.BLUEBOT_ENEMY_USER_IDS = originalEnv;
		} else {
			delete process.env.BLUEBOT_ENEMY_USER_IDS;
		}
		// Clear the cache after each test
		refreshEnemyCache();
	});

	describe('getEnemyUserIds', () => {
		test('returns empty set when environment variable is not set', () => {
			delete process.env.BLUEBOT_ENEMY_USER_IDS;
			const result = getEnemyUserIds();
			expect(result).toBeInstanceOf(Set);
			expect(result.size).toBe(0);
		});

		test('returns empty set when environment variable is empty string', () => {
			process.env.BLUEBOT_ENEMY_USER_IDS = '';
			const result = getEnemyUserIds();
			expect(result.size).toBe(0);
		});

		test('returns empty set when environment variable is only whitespace', () => {
			process.env.BLUEBOT_ENEMY_USER_IDS = '   ';
			const result = getEnemyUserIds();
			expect(result.size).toBe(0);
		});

		test('parses single user ID correctly', () => {
			process.env.BLUEBOT_ENEMY_USER_IDS = '123456789012345678';
			const result = getEnemyUserIds();
			expect(result.size).toBe(1);
			expect(result.has('123456789012345678')).toBe(true);
		});

		test('parses multiple user IDs correctly', () => {
			process.env.BLUEBOT_ENEMY_USER_IDS = '123456789012345678,987654321098765432';
			const result = getEnemyUserIds();
			expect(result.size).toBe(2);
			expect(result.has('123456789012345678')).toBe(true);
			expect(result.has('987654321098765432')).toBe(true);
		});

		test('handles whitespace around user IDs', () => {
			process.env.BLUEBOT_ENEMY_USER_IDS = ' 123456789012345678 , 987654321098765432 ';
			const result = getEnemyUserIds();
			expect(result.size).toBe(2);
			expect(result.has('123456789012345678')).toBe(true);
			expect(result.has('987654321098765432')).toBe(true);
		});

		test('filters out empty entries from comma-separated list', () => {
			process.env.BLUEBOT_ENEMY_USER_IDS = '123456789012345678,,987654321098765432';
			const result = getEnemyUserIds();
			expect(result.size).toBe(2);
			expect(result.has('123456789012345678')).toBe(true);
			expect(result.has('987654321098765432')).toBe(true);
		});
	});

	describe('isEnemyUser', () => {
		test('returns false when no enemies are configured', () => {
			delete process.env.BLUEBOT_ENEMY_USER_IDS;
			expect(isEnemyUser('123456789012345678')).toBe(false);
		});

		test('returns true for user ID in enemy list', () => {
			process.env.BLUEBOT_ENEMY_USER_IDS = '123456789012345678,987654321098765432';
			expect(isEnemyUser('123456789012345678')).toBe(true);
		});

		test('returns false for user ID not in enemy list', () => {
			process.env.BLUEBOT_ENEMY_USER_IDS = '123456789012345678,987654321098765432';
			expect(isEnemyUser('111111111111111111')).toBe(false);
		});
	});

	describe('getCachedEnemyUserIds and isEnemyUserCached', () => {
		test('caches enemy user IDs on first call', () => {
			process.env.BLUEBOT_ENEMY_USER_IDS = '123456789012345678';
			refreshEnemyCache(); // Initialize cache
			const result1 = getCachedEnemyUserIds();
			const result2 = getCachedEnemyUserIds();
			// Should return the same Set instance (cached)
			expect(result1).toBe(result2);
		});

		test('isEnemyUserCached returns correct results', () => {
			process.env.BLUEBOT_ENEMY_USER_IDS = '123456789012345678,987654321098765432';
			refreshEnemyCache(); // Initialize cache with current env
			expect(isEnemyUserCached('123456789012345678')).toBe(true);
			expect(isEnemyUserCached('987654321098765432')).toBe(true);
			expect(isEnemyUserCached('111111111111111111')).toBe(false);
		});

		test('cache persists across multiple calls', () => {
			process.env.BLUEBOT_ENEMY_USER_IDS = '123456789012345678';
			refreshEnemyCache(); // Initialize cache
			expect(isEnemyUserCached('123456789012345678')).toBe(true);

			// Change environment (but cache should still have old value)
			process.env.BLUEBOT_ENEMY_USER_IDS = '987654321098765432';
			expect(isEnemyUserCached('123456789012345678')).toBe(true);
			expect(isEnemyUserCached('987654321098765432')).toBe(false);
		});
	});

	describe('refreshEnemyCache', () => {
		test('reloads enemy IDs from environment', () => {
			process.env.BLUEBOT_ENEMY_USER_IDS = '123456789012345678';
			refreshEnemyCache(); // Initialize cache
			expect(isEnemyUserCached('123456789012345678')).toBe(true);

			// Change environment and refresh cache
			process.env.BLUEBOT_ENEMY_USER_IDS = '987654321098765432';
			refreshEnemyCache();

			expect(isEnemyUserCached('123456789012345678')).toBe(false);
			expect(isEnemyUserCached('987654321098765432')).toBe(true);
		});

		test('clears cache when environment is empty', () => {
			process.env.BLUEBOT_ENEMY_USER_IDS = '123456789012345678';
			refreshEnemyCache(); // Initialize cache
			expect(isEnemyUserCached('123456789012345678')).toBe(true);

			delete process.env.BLUEBOT_ENEMY_USER_IDS;
			refreshEnemyCache();

			expect(isEnemyUserCached('123456789012345678')).toBe(false);
			expect(getCachedEnemyUserIds().size).toBe(0);
		});
	});
});

