import { Message, TextChannel } from 'discord.js';
import UserID from '../../../discord/userID';
import random from '../../../utils/random';
import { BananaBotConfig } from '../config/BananaBotConfig';
import ReplyBot from '../replyBot';

export default class BananaBot extends ReplyBot {
	public readonly botName: string = BananaBotConfig.Name;
	public readonly avatarUrl: string = BananaBotConfig.Avatars.Default;

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content.toLowerCase();
		const hasBanana = BananaBotConfig.Patterns.Default?.test(content);
		const isVenn = message.author.id === UserID.Venn;
		const shouldReply = hasBanana || (isVenn && random.percentChance(5));

		if (shouldReply) {
			this.sendReply(message.channel as TextChannel, BananaBotConfig.Responses.Default());
		}
	}
}
