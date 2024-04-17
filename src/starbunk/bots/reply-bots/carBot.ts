import { GuildMember, Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import random from '../../../utils/random';
import userID from '../../../discord/userID';

export default class CarBot extends ReplyBot {
	private botName = 'Guy';
	private avatarUrl = '';
	private readonly response = 'Here in my car! Du-nuh na-nuh-nuh-na \n https://www.youtube.com/watch?v=99fRdfVIOr4';

	getBotName(): string {
		return this.botName;
	}

	getAvatarUrl(): string {
		return this.avatarUrl;
	}

	getResponse(): string {
		return this.response;
	}

	getGuyFromMessage(message: Message): Promise<GuildMember> {
		const guy = message.guild?.members.fetch(userID.Guy);
		if (guy) {
			return Promise.resolve(guy);
		}
		return Promise.reject(new Error('Guy was not found on the server'));
	}

	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (random.percentChance(5)) {
			this.getGuyFromMessage(message)
				.then((guy) => {
					this.botName = guy.nickname ?? guy.displayName;
					this.avatarUrl = guy.avatarURL() ?? guy.displayAvatarURL();
					this.sendReply(message.channel as TextChannel, this.getResponse());
				})
				.catch((error) => {
					console.error(error);
					return;
				});
		}
	}
}
