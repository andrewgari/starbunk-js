import { Client } from 'discord.js';
import { DiscordChannelManager, DiscordEventManager, DiscordMessageSender } from './DiscordImplementations';
import { FileStorage } from './FileStorage';
import { RatmasService } from './RatmasService';

export class RatmasFactory {
	static create(client: Client): RatmasService {
		const storage = new FileStorage();
		const channelManager = new DiscordChannelManager();
		const eventManager = new DiscordEventManager();
		const messageSender = new DiscordMessageSender();

		return new RatmasService(
			client,
			storage,
			channelManager,
			eventManager,
			messageSender
		);
	}
}
