import { Message, TextChannel } from 'discord.js';
import Random from '../../../utils/random';
import { BotBotConfig } from '../config/BotBotConfig';
import ReplyBot from '../replyBot';

export default class BotBot extends ReplyBot {
	public readonly botName: string = BotBotConfig.Name;
	public readonly avatarUrl: string = BotBotConfig.Avatars.Default;

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (this.isSelf(message)) return;

		const isBot = message.author.bot;
		const shouldReply = isBot && Random.percentChance(10);

		if (shouldReply) {
			this.sendReply(message.channel as TextChannel, BotBotConfig.Responses.Default);
		}
	}
}
