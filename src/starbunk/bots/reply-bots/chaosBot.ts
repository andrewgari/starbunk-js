import { Message, TextChannel } from 'discord.js';
import { Service, ServiceId } from '../../../services/services';
import { ChaosBotConfig } from '../config/chaosBotConfig';
import ReplyBot from '../replyBot';

@Service({
	id: ServiceId.ChaosBot,
	scope: 'singleton'
})
export default class ChaosBot extends ReplyBot {
	protected get botIdentity(): { userId: string; botName: string; avatarUrl: string } {
		return {
			userId: '',
			botName: ChaosBotConfig.Name,
			avatarUrl: ChaosBotConfig.Avatars.Default
		};
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content.toLowerCase();
		const hasChaos = ChaosBotConfig.Patterns.Default?.test(content);

		if (hasChaos) {
			this.sendReply(message.channel as TextChannel, {
				content: ChaosBotConfig.Responses.Default
			});
		}
	}
}
