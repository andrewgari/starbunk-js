import { Message, TextChannel } from 'discord.js';
import { BotIdentity } from '../../types/botIdentity';
import { MacaroniBotConfig } from '../config/macaroniBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class MacaroniBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		return {
			avatarUrl: MacaroniBotConfig.Avatars.Default,
			botName: MacaroniBotConfig.Name
		};
	}

	public async processMessage(message: Message): Promise<void> {
		const mentionsMacaroni = MacaroniBotConfig.Patterns.Macaroni?.test(message.content);
		const mentionsVenn = MacaroniBotConfig.Patterns.Venn?.test(message.content);
		if (mentionsMacaroni) {
			await this.sendReply(message.channel as TextChannel, MacaroniBotConfig.Responses.Macaroni);
		}
		if (mentionsVenn) {
			await this.sendReply(message.channel as TextChannel, MacaroniBotConfig.Responses.Venn);
		}
	}
}
