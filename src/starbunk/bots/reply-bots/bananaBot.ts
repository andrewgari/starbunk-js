import { Message, TextChannel } from 'discord.js';
import UserID from '../../../discord/userId';
import { Logger } from '../../../services/logger';
import random from '../../../utils/random';
import { BotIdentity } from '../botIdentity';
import { BananaBotConfig } from '../config/bananaBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class BananaBot extends ReplyBot {
	protected get botIdentity(): BotIdentity {
		return {
			userId: '',
			avatarUrl: BananaBotConfig.Avatars.Default,
			botName: BananaBotConfig.Name
		};
	}

	private readonly logger = new Logger();

	constructor() {
		super();
	}

	public async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const match = content.match(BananaBotConfig.Patterns.Default);
		const targetUserId = process.env.DEBUG_MODE === 'true' ? UserID.Cova : UserID.Venn;
		const isTargetUser = message.author.id === targetUserId;
		const shouldReply = (match && match.length > 0) || (isTargetUser && random.percentChance(5));

		if (shouldReply) {
			this.logger.debug(`BananaBot responding to message: ${content}`);
			await this.sendReply(message.channel as TextChannel, BananaBotConfig.Responses.Default());
		}
	}
}
