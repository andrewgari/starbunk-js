import { Message, TextChannel } from 'discord.js';
import UserID from '../../../discord/userId';
import { Service, ServiceId } from '../../../services/services';
import random from '../../../utils/random';
import { BananaBotConfig } from '../config/bananaBotConfig';
import ReplyBot from '../replyBot';

@Service({
	id: ServiceId.BlueBot,
	dependencies: [ServiceId.Logger, ServiceId.WebhookService],
	scope: 'singleton'
})
export default class BananaBot extends ReplyBot {
	public readonly botName: string = BananaBotConfig.Name;
	public readonly avatarUrl: string = BananaBotConfig.Avatars.Default;

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const match = content.match(BananaBotConfig.Patterns.Default);
		const targetUserId = process.env.DEBUG_MODE === 'true' ? UserID.Cova : UserID.Venn;
		const isTargetUser = message.author.id === targetUserId;
		const shouldReply = (match && match.length > 0) || (isTargetUser && random.percentChance(5));

		if (shouldReply) {
			await this.sendReply(message.channel as TextChannel, BananaBotConfig.getRandomCheekyResponse());
		}
	}
}
