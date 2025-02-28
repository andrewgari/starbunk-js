import { Client } from 'discord.js';
import DiscordClient from './discordClient';

// This is a placeholder for the actual client instance
// In a real implementation, this would be initialized elsewhere and imported here
let clientInstance: Client | null = null;

/**
 * Get the Discord client instance
 * @returns The Discord client instance
 * @throws Error if the client is not initialized
 */
export function getClient(): Client {
	// In a real implementation, this would return the actual client instance
	// For now, we'll create a mock client for testing purposes
	if (!clientInstance) {
		// This is just for testing - in production, the client would be properly initialized
		clientInstance = new DiscordClient({
			intents: []
		});
	}
	return clientInstance;
}

/**
 * Set the Discord client instance
 * @param client The Discord client instance to set
 */
export function setClient(client: Client): void {
	clientInstance = client;
}
