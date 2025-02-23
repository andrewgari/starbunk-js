import { TextChannel, User } from 'discord.js';
import { MessageSender } from './interfaces';

export class DiscordMessageSender implements MessageSender {
	async sendDM(user: User, message: string): Promise<void> {
		await user.send(message);
	}

	async announceInChannel(channel: TextChannel, message: string): Promise<void> {
		await channel.send(message);
	}
}
