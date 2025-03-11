import { Message, TextChannel } from 'discord.js';
import { Service, ServiceId } from '../../../services/services';
import { BabyBotConfig } from '../config/babyBotConfig';
import ReplyBot from '../replyBot';

@Service({
	id: ServiceId.BabyBot,
	scope: 'singleton'
})
export default class BabyBot extends ReplyBot {
	public readonly botName: string = BabyBotConfig.Name;
	public readonly avatarUrl: string = BabyBotConfig.Avatars.Default;

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content.toLowerCase();
		const hasBaby = BabyBotConfig.Patterns.Default?.test(content);

		if (hasBaby) {
			this.sendReply(message.channel as TextChannel, BabyBotConfig.Responses.Default);
		}
	}
}
