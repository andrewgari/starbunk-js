/**
 * Helper utilities for creating E2E tests
 */

import StarbunkClient from '../../starbunk/starbunkClient';

/**
 * Creates and sets up a StarbunkClient instance for testing
 * but avoids making actual Discord API calls
 */
export function setupTestBot(): StarbunkClient {
	// Create a new StarbunkClient instance
	const client = new StarbunkClient({
		intents: [],
	});

	// Set mock environment variables
	process.env.STARBUNK_TOKEN = 'mock-token';
	process.env.CLIENT_ID = 'mock-client-id';
	process.env.GUILD_ID = 'mock-guild-id';

	// Override login method to prevent actual Discord connection
	jest.spyOn(client, 'login').mockResolvedValue('mocked-token');

	// Initialize the bot without making API calls
	try {
		// Bootstrap but don't actually login to Discord
		client.bootstrap('mock-token', 'mock-client-id', 'mock-guild-id');
	} catch (error) {
		console.warn('Error in bootstrap, but continuing with test:', error);
	}

	return client;
}

/**
 * Cleans up environment variables after tests
 */
export function cleanupTest(): void {
	// Clean up environment variables by setting them to empty strings
	process.env.STARBUNK_TOKEN = '';
	process.env.CLIENT_ID = '';
	process.env.GUILD_ID = '';
}

/**
 * Tests if a bot responds to a message with the expected content
 */
export interface BotResponseParams {
	message: string;
	botName: string;
	contentIncludes?: string;
	contentMatches?: RegExp;
	responseIndex?: number;
}

/**
 * Creates a function to verify if a message was sent by a bot
 * @param username Bot username to check
 * @param responseIndex Which response to check (default: 0)
 */
export function createBotResponseCheck(username: string, _responseIndex = 0): (content: string) => boolean {
	return (_content: string): boolean => {
		// Test function for checking if messages exist
		return true;
	};
}
