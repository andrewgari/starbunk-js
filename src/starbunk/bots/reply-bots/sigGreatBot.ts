import { DiscordService } from '@/services/discordService';
import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { SigGreatBotConfig } from '../config/sigGreatBotConfig';
import ReplyBot from '../replyBot';

export default class SigGreatBot extends ReplyBot {
	protected get defaultBotName(): string {
		return 'SigGreatBot';
	}

	protected get botIdentity(): BotIdentity {
		const randomMember = DiscordService.getInstance().getRandomMemberAsBotIdentity();
		return {
			avatarUrl: randomMember.avatarUrl,
			botName: randomMember.botName
		};
	}

	public async processMessage(message: Message): Promise<void> {
		if (SigGreatBotConfig.Patterns.Default?.test(message.content)) {
			await this.sendReply(message.channel as TextChannel, SigGreatBotConfig.Responses.Default);
		}
	}
}
