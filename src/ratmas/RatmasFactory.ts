import { Client } from 'discord.js';
import { DiscordChannelManager, DiscordEventManager, DiscordMessageSender } from './DiscordImplementations';
import { RatmasService } from './RatmasService';
import { RatmasStorage } from './storage/RatmasStorage';

export class RatmasFactory {
	static create(client: Client): RatmasService {
		const storage = new RatmasStorage();
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
