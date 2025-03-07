import { Message, TextChannel } from 'discord.js';
import userID from '../../../discord/userId';
import Random from '../../../utils/random';
import { PickleBotConfig } from '../config/pickleBotConfig';
import ReplyBot from '../replyBot';

export default class PickleBot extends ReplyBot {
	public readonly botName: string = PickleBotConfig.Name;
	public readonly avatarUrl: string = PickleBotConfig.Avatars.Default;

	defaultBotName(): string {
		return 'PickleBot';
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasPickle = PickleBotConfig.Patterns.Default?.test(content);
		const isSig = message.author.id === userID.Sig;
		const shouldReply = hasPickle || (isSig && Random.percentChance(15));

		if (shouldReply) {
			this.sendReply(message.channel as TextChannel, PickleBotConfig.Responses.Default);
		}
	}
}
