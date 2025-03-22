import { Message, TextChannel } from 'discord.js';
import { BotIdentity } from '../../types/botIdentity';
import { CheckBotConfig } from '../config/checkBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class CheckBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		return {
			botName: CheckBotConfig.Name,
			avatarUrl: CheckBotConfig.Avatars.Default
		};
	}

	public async processMessage(message: Message): Promise<void> {
		if (CheckBotConfig.Patterns.Default?.test(message.content)) {
			await this.sendReply(message.channel as TextChannel, CheckBotConfig.Responses.Default(message.content));
		}
	}
}
