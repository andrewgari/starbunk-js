import { Guild, Message, TextChannel } from 'discord.js';
import { getCurrentMemberIdentity } from '../../../discord/discordGuildMemberHelper';
import { BotIdentity } from '../botIdentity';
import { SigGreatBotConfig } from '../config/sigGreatBotConfig';
import ReplyBot from '../replyBot';

export default class SigGreatBot extends ReplyBot {

	protected get botIdentity(): BotIdentity {
		return {
			userId: '',
			avatarUrl: SigGreatBotConfig.Avatars.Default,
			botName: SigGreatBotConfig.Name
		};
	}

	defaultBotName(): string {
		return 'SigGreatBot';
	}

	public async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasSigGreat = SigGreatBotConfig.Patterns.Default?.test(content);

		if (hasSigGreat) {
			const identity = await getCurrentMemberIdentity(message.author.id, message.guild as Guild);

			await this.sendReply(message.channel as TextChannel, {
				botIdentity: identity,
				content: SigGreatBotConfig.Responses.Default
			});
		}
	}
}
