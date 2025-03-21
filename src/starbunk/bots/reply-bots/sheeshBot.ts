import userId from '@/discord/userId';
import { DiscordService } from '@/services/discordService';
import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { SheeshBotConfig } from '../config/sheeshBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class SheeshBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		const guy = DiscordService.getInstance().getMemberAsBotIdentity(userId.Guy);
		return {
			avatarUrl: guy.avatarUrl,
			botName: guy.botName,
		};
	}

	public async handleMessage(message: Message, skipBotMessages = true): Promise<void> {
		// Skip bot messages if skipBotMessages is true
		if (skipBotMessages && this.isBot(message)) {
			return;
		}

		if (SheeshBotConfig.Patterns.Default?.test(message.content)) {
			await this.sendReply(message.channel as TextChannel, SheeshBotConfig.Responses.Default());
		}
	}
}
