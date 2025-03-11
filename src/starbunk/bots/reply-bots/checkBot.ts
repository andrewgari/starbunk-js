import { Message, TextChannel } from 'discord.js';
import { Service, ServiceId } from '../../../services/services';
import { CheckBotConfig } from '../config/checkBotConfig';
import ReplyBot from '../replyBot';

@Service({
	id: ServiceId.BlueBot,
	dependencies: [ServiceId.Logger, ServiceId.WebhookService],
	scope: 'singleton'
})
export default class CheckBot extends ReplyBot {
	protected readonly config = CheckBotConfig;
	
	protected get botIdentity(): { userId: string; botName: string; avatarUrl: string } {
		return {
			userId: '',
			botName: CheckBotConfig.Name,
			avatarUrl: CheckBotConfig.Avatars.Default
		};
	}

	defaultBotName(): string {
		return 'CheckBot';
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const match = content.match(CheckBotConfig.Patterns.Default);

		if (match && match.length > 0) {
			await this.sendReply(message.channel as TextChannel, CheckBotConfig.Responses.Default(content));
		}
	}
}
