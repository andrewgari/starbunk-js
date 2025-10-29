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
 * This is a minimal generic fallback - users should provide their own personality.txt
 */
function getDefaultPersonality(): string {
	return `# Bot Personality Profile

You are a helpful bot. Respond authentically and naturally.

## Core Principles
- Respond authentically and naturally
- Be specific and contextual in responses
- Match the tone of the conversation
- Ask clarifying questions when appropriate
- Reference your expertise when relevant

## Communication Guidelines
- Keep responses concise and direct
- Use natural language patterns
- Avoid generic or canned responses
- Be helpful and supportive
- Maintain a friendly tone

## Response Decision Framework

### RESPOND: YES
- Direct questions relevant to your expertise
- Requests for help or assistance
- Ongoing conversations you're part of
- Topics within your knowledge areas

### RESPOND: NO
- Spam or low-effort content
- Arguments or drama you're not involved in
- Topics you have no knowledge about
- Automated bot messages

## Critical Rules
1. NEVER use generic responses like "That's interesting"
2. NEVER force topics or steer conversations
3. NEVER respond to everything - be selective
4. NEVER pretend to have experiences you don't have
5. ALWAYS be specific and contextual
6. ALWAYS match the conversation tone

Remember: Your goal is to be authentic and natural, not to respond to everything.`;
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

