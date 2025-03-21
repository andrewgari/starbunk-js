import { DiscordService } from '@/services/discordService';
import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { SigGreatBotConfig } from '../config/sigGreatBotConfig';
import ReplyBot from '../replyBot';

export default class SigGreatBot extends ReplyBot {
	public get defaultBotName(): string {
		return 'SigGreatBot';
	}

	public get botIdentity(): BotIdentity {
		const randomMember = DiscordService.getInstance().getRandomMemberAsBotIdentity();
		return {
			avatarUrl: randomMember.avatarUrl,
			botName: randomMember.botName
		};
	}

	public async handleMessage(message: Message, skipBotMessages = true): Promise<void> {
		// Skip bot messages if skipBotMessages is true
		if (skipBotMessages && this.isBot(message)) {
			return;
		}

		if (SigGreatBotConfig.Patterns.Default?.test(message.content)) {
			await this.sendReply(message.channel as TextChannel, SigGreatBotConfig.Responses.Default);
		}
	}
}
