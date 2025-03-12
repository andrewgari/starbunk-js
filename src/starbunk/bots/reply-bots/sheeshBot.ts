import { getCurrentMemberIdentity } from '@/discord/discordGuildMemberHelper';
import userId from '@/discord/userId';
import { Guild, Message, TextChannel } from 'discord.js';
import { Logger } from '../../../services/logger';
import { BotIdentity } from '../botIdentity';
import { SheeshBotConfig } from '../config/sheeshBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class SheeshBot extends ReplyBot {
	protected get botIdentity(): BotIdentity {
		return {
			userId: '',
			avatarUrl: SheeshBotConfig.Avatars.Default,
			botName: SheeshBotConfig.Name,
		};
	}

	private readonly logger = new Logger();

	constructor() {
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
