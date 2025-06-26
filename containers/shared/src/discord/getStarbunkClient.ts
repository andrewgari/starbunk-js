import { Client, Interaction } from 'discord.js';

let clientInstance: Client | null = null;

export function setStarbunkClient(client: Client): void {
	clientInstance = client;
}

export function getStarbunkClient(interaction?: Interaction): Client {
	if (interaction) {
		return interaction.client;
	}

	if (!clientInstance) {
		throw new Error('Discord client instance not set. Call setStarbunkClient first.');
	}

	return clientInstance;
}
