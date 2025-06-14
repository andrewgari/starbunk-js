import { Interaction } from 'discord.js';
import StarbunkClient from '../starbunk/starbunkClient';

let clientInstance: StarbunkClient | null = null;

export function setStarbunkClient(client: StarbunkClient): void {
	clientInstance = client;
}

export function getStarbunkClient(interaction?: Interaction): StarbunkClient {
	if (interaction) {
		return interaction.client as StarbunkClient;
	}

	if (!clientInstance) {
		throw new Error('StarbunkClient instance not set. Call setStarbunkClient first.');
	}

	return clientInstance;
}
