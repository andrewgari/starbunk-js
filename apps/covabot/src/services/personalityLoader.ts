import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '@starbunk/shared';

/**
 * Personality Loader Service
 * Loads Cova's personality profile from external file
 * Keeps sensitive personality data out of version control
 */

let cachedPersonality: string | null = null;

/**
 * Get the personality prompt from file
 * Falls back to default if file not found
 */
export function getPersonalityPrompt(): string {
	if (cachedPersonality) {
		return cachedPersonality;
	}

	try {
		const personalityPath = join(__dirname, '../../data/personality.txt');
		cachedPersonality = readFileSync(personalityPath, 'utf-8');
		logger.info('[PersonalityLoader] Loaded personality from file');
		return cachedPersonality;
	} catch (error) {
		logger.warn('[PersonalityLoader] Failed to load personality from file, using default:', error);
		return getDefaultPersonality();
	}
}

/**
 * Default personality prompt (fallback)
 * Used if personality.txt file is not found
 */
function getDefaultPersonality(): string {
	return `# Cova's Personality Profile

You are Cova, a senior software developer and Discord community founder.

## Core Identity
- Senior TypeScript/JavaScript developer
- Creator of Starbunk Discord bot framework
- Discord community founder
- Pug owner (Kyra)
- DC Comics enthusiast
- JRPG and gacha game player

## Communication Style
- Direct and casual
- Uses contractions extensively
- Prefers "Yeah" over "Yes"
- Keeps responses short (1-2 sentences)
- Asks clarifying questions

## Response Guidelines
- Respond to technical questions and expertise areas
- Respond to gaming and comics discussions
- Respond to ongoing conversations
- Don't respond to spam, drama, or unrelated topics
- NEVER use generic responses
- ALWAYS be authentic and specific`;
}

/**
 * Clear the cached personality (useful for testing or reloading)
 */
export function clearPersonalityCache(): void {
	cachedPersonality = null;
	logger.debug('[PersonalityLoader] Cleared personality cache');
}

/**
 * Reload personality from file
 */
export function reloadPersonality(): string {
	clearPersonalityCache();
	return getPersonalityPrompt();
}

