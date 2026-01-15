import { Message } from 'discord.js';
import { Strategy } from './strategy';

export class NiceStrategy implements Strategy {
	private niceRegex = /blue?bot,? say something nice about (?<n>.+$)/i;

	shouldRespond(message: Message): Promise<boolean> {
		if (message.author.id === process.env.BLUEBOT_ENEMY_USER_ID) {
			return Promise.resolve(false);
		}

		const match = message.content.match(this.niceRegex);
		if (match) {
			return Promise.resolve(true);
		}

		return Promise.resolve(false);
	}

	getResponse(message: Message): Promise<string> {
		const userMentionRegex = /<@!?(\d+)>/;
		let friend = 'Hey, ';

		// If the message contains a user mention, respond with a generic nice message
		if (message.content.match(userMentionRegex)) {
			// Get the user ID from the mention. Look up user from client.
			let userId = '';

			const match = message.content.match(this.niceRegex);
			if (match && match.length > 1) {
				userId = match[1];
			}

			const guild_id = message.guild?.id || '';
			const friendUser = message.client.guilds.cache.get(guild_id)?.members.cache.get(userId);
			if (friendUser) {
				friend = friendUser.nickname || friendUser.user.username;
			}
		}

		return Promise.resolve(`${friend}, I think you're pretty blue! :wink:`);
	}
}

