import { getCurrentMemberIdentity } from '@/discord/discordGuildMemberHelper';
import userId from '@/discord/userId';
import { Guild, Message, TextChannel } from 'discord.js';
import { Logger } from '../../../services/logger';
import { Service, ServiceId } from '../../../services/services';
import { BotIdentity } from '../botIdentity';
import { SheeshBotConfig } from '../config/sheeshBotConfig';
import ReplyBot from '../replyBot';

@Service({
	id: ServiceId.SheeshBot,
	dependencies: [ServiceId.Logger],
	scope: 'singleton'
})
export default class SheeshBot extends ReplyBot {
	protected get botIdentity(): BotIdentity {
		return {
			userId: '',
			avatarUrl: SheeshBotConfig.Avatars.Default,
			botName: SheeshBotConfig.Name,
		};
	}

	constructor(private readonly logger: Logger) {
		super();
	}

	async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasSheesh = SheeshBotConfig.Patterns.Default?.test(content);

		if (hasSheesh && message.channel instanceof TextChannel) {
			this.logger.debug(`😤 User ${message.author.username} said sheesh in: "${content}"`);
			const identity = await getCurrentMemberIdentity(userId.Guy, message.guild as Guild);
			await this.sendReply(message.channel, {
				botIdentity: identity,
				content: SheeshBotConfig.Responses.Default()
			});
		}
	}
}
