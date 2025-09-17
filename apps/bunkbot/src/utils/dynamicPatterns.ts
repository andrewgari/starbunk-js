import { ConfigurationService } from '../services/configurationService';
import { Message } from 'discord.js';

/**
 * Utility functions for creating dynamic patterns and responses
 * that use database configuration instead of hardcoded IDs
 */

/**
 * Create a dynamic mention pattern for a user
 * @param configService Configuration service instance
 * @param username Username to look up
 * @returns Function that returns the mention pattern
 */
export function createDynamicMentionPattern(
	configService: ConfigurationService,
	username: string,
): () => Promise<RegExp | null> {
	return async () => {
		const userId = await configService.getUserIdByUsername(username);
		if (!userId) {
			return null;
		}
		return new RegExp(`<@!?${userId}>`, 'g');
	};
}

/**
 * Create a dynamic response that mentions a user
 * @param configService Configuration service instance
 * @param username Username to look up
 * @param responseTemplate Template string with {USER_ID} placeholder
 * @returns Function that returns the response with user mention
 */
export function createDynamicMentionResponse(
	configService: ConfigurationService,
	username: string,
	responseTemplate: string,
): () => Promise<string> {
	return async () => {
		const userId = await configService.getUserIdByUsername(username);
		if (!userId) {
			// Fallback to username if ID not found
			return responseTemplate.replace('{USER_ID}', `@${username}`);
		}
		return responseTemplate.replace('{USER_ID}', userId);
	};
}

/**
 * Create a condition function that checks if message is from a specific user
 * @param configService Configuration service instance
 * @param username Username to check against
 * @returns Function that checks if message is from the user
 */
export function createDynamicUserCondition(
	configService: ConfigurationService,
	username: string,
): (message: Message) => Promise<boolean> {
	return async (message: Message) => {
		const userId = await configService.getUserIdByUsername(username);
		if (!userId) {
			return false;
		}
		return message.author?.id === userId;
	};
}

/**
 * Create a condition function that checks if message is NOT from a specific user
 * @param configService Configuration service instance
 * @param username Username to check against
 * @returns Function that checks if message is NOT from the user
 */
export function createDynamicNotUserCondition(
	configService: ConfigurationService,
	username: string,
): (message: Message) => Promise<boolean> {
	return async (message: Message) => {
		const userId = await configService.getUserIdByUsername(username);
		if (!userId) {
			return true; // If user not found, consider it as "not from user"
		}
		return message.author?.id !== userId;
	};
}

/**
 * Utility to replace placeholders in text with actual user IDs
 * @param configService Configuration service instance
 * @param text Text with placeholders like {CHAD_USER_ID}, {VENN_USER_ID}, etc.
 * @returns Promise<string> Text with placeholders replaced
 */
export async function replacePlaceholdersWithUserIds(
	configService: ConfigurationService,
	text: string,
): Promise<string> {
	let result = text;

	// Common user placeholders
	const userPlaceholders = [
		{ placeholder: '{CHAD_USER_ID}', username: 'Chad' },
		{ placeholder: '{VENN_USER_ID}', username: 'Venn' },
		{ placeholder: '{GUY_USER_ID}', username: 'Guy' },
		{ placeholder: '{COVA_USER_ID}', username: 'Cova' },
		{ placeholder: '{BENDER_USER_ID}', username: 'Bender' },
		{ placeholder: '{SIG_USER_ID}', username: 'Sig' },
		{ placeholder: '{GUILDUS_USER_ID}', username: 'Guildus' },
		{ placeholder: '{DEAF_USER_ID}', username: 'Deaf' },
		{ placeholder: '{FELI_USER_ID}', username: 'Feli' },
		{ placeholder: '{GOOSE_USER_ID}', username: 'Goose' },
		{ placeholder: '{IAN_USER_ID}', username: 'Ian' },
	];

	for (const { placeholder, username } of userPlaceholders) {
		if (result.includes(placeholder)) {
			const userId = await configService.getUserIdByUsername(username);
			if (userId) {
				result = result.replace(new RegExp(placeholder, 'g'), userId);
			} else {
				// Keep placeholder if user not found
				console.warn(`User '${username}' not found for placeholder '${placeholder}'`);
			}
		}
	}

	return result;
}

/**
 * Create a dynamic pattern that can be used with the existing pattern matching system
 * @param configService Configuration service instance
 * @param patternTemplate Pattern template with user ID placeholders
 * @returns Function that returns the pattern with user IDs resolved
 */
export function createDynamicPattern(
	configService: ConfigurationService,
	patternTemplate: string,
	flags?: string,
): () => Promise<RegExp | null> {
	return async () => {
		try {
			const resolvedPattern = await replacePlaceholdersWithUserIds(configService, patternTemplate);
			return new RegExp(resolvedPattern, flags);
		} catch (error) {
			console.error('Failed to create dynamic pattern:', error);
			return null;
		}
	};
}

/**
 * Cache for resolved patterns to avoid repeated database lookups
 */
const patternCache = new Map<string, { pattern: RegExp | null; timestamp: number }>();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * Create a cached dynamic pattern for better performance
 * @param configService Configuration service instance
 * @param patternTemplate Pattern template with user ID placeholders
 * @param flags Regex flags
 * @returns Function that returns cached pattern or creates new one
 */
export function createCachedDynamicPattern(
	configService: ConfigurationService,
	patternTemplate: string,
	flags?: string,
): () => Promise<RegExp | null> {
	const cacheKey = `${patternTemplate}:${flags || ''}`;

	return async () => {
		const _now = Date.now();
		const cached = patternCache.get(cacheKey);

		if (cached && now - cached.timestamp < CACHE_EXPIRY) {
			return cached.pattern;
		}

		try {
			const resolvedPattern = await replacePlaceholdersWithUserIds(configService, patternTemplate);
			const pattern = new RegExp(resolvedPattern, flags);

			patternCache.set(cacheKey, { pattern, timestamp: now });
			return pattern;
		} catch (error) {
			console.error('Failed to create cached dynamic pattern:', error);
			return null;
		}
	};
}
