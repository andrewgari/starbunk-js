import { Message } from 'discord.js';
import { Strategy } from '@/strategy/strategy';

export class NiceStrategy implements Strategy {
	protected niceRegex = /blue?bot,? say something nice about (?<n>.+$)/i;

  protected isRequest(message: Message): boolean {
    return !!message.content.match(this.niceRegex);
  }

  protected getRequestedName(message: Message): string | null {
    const match = message.content.match(this.niceRegex);
    if (match && match.groups && match.groups.n) {
      return match.groups.n;
    }
    return null;
  }

	shouldRespond(message: Message): Promise<boolean> {
		if (this.isRequest(message)) {
			return Promise.resolve(true);
		}

		return Promise.resolve(false);
	}

	getResponse(message: Message): Promise<string> {
		let friend = this.getRequestedName(message);
    if (!friend) {
			friend = 'Hey, ';
		}

    if (friend.toLowerCase() === 'me') {
      const you = message.member?.nickname || message.author.username;
      return Promise.resolve(`Hey ${you}, I think you're pretty blue! :wink:`)
    }


		const userMentionRegex = /<@!?(\d+)>/;
    if (!message.content.match(userMentionRegex)) {
      return Promise.resolve(`${friend}, I think you're pretty blue! :wink:`);
    } else {
		// If the message contains a user mention, respond with a generic nice message
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

