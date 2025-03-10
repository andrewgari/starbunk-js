import { Message, TextChannel } from 'discord.js';
import UserID from '../../../discord/userId';
import random from '../../../utils/random';
import { BananaBotConfig } from '../config/bananaBotConfig';
import ReplyBot from '../replyBot';

export default class BananaBot extends ReplyBot {
	public readonly botName: string = BananaBotConfig.Name;
	public readonly avatarUrl: string = BananaBotConfig.Avatars.Default;

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content.toLowerCase();
		const hasBanana = BananaBotConfig.Patterns.Default?.test(content);
		const targetUserId = process.env.DEBUG_MODE === 'true' ? UserID.Cova : UserID.Venn;
		const isTargetUser = message.author.id === targetUserId;
		const shouldReply = hasBanana || (isTargetUser && random.percentChance(5));

		if (shouldReply) {
			// Randomly decide between normal and cheeky responses with 50% chance
			this.sendReply(message.channel as TextChannel, BananaBotConfig.getRandomCheekyResponse());
		}
	}
}