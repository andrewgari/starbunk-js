import { Message } from 'discord.js';
import { BlueStrategy } from '@/strategy/blue-strategy';
import { matchesAnyName } from '@/utils/string-similarity';

export class NiceStrategy implements BlueStrategy {
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

	async getResponse(message: Message): Promise<string> {
		const friend = this.getFriendFromMessage(message);
		return Promise.resolve(`${friend}, I think you're pretty blue! :wink:`);
	}

	public getFriendFromMessage(message: Message): string {
		// get a baseline, we can at least repeat what they said.
		let friend = this.getRequestedName(message) || '';
		let userId = '';

		// if the request is for the requester, then get their user name and mention them
		if (friend.toLowerCase() === 'me') {
			userId = message.author.id;
		}

    // if the request is a user mention, take the id from the mention and retrieve the member and mention them
		const userMentionRegex = /<@!?(\d+)>/;
		// Get the user ID from the mention. Look up user from client.
		const match = friend.match(userMentionRegex);
		if (match && match.length > 1) {
			userId = match[1];
		}

    // if the request was for a user by name, then try to find the user and get their id
    const member = message.guild?.members?.cache.find(member => {
			return matchesAnyName(friend, [member.nickname, member.user.username]);
		});

    if (member) {
			userId = member.id;
		}

    if (userId) {
			friend = `<@${userId}>`;
		}

		return friend;
	}
}
