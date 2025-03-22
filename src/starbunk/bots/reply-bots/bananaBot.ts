import { Message, TextChannel } from 'discord.js';
import UserID from '../../../discord/userId';
import { logger } from '../../../services/logger';
import random from '../../../utils/random';
import { BotIdentity } from '../../types/botIdentity';
import { BananaBotConfig } from '../config/bananaBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class BananaBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		return {
			botName: this.defaultBotName,
			avatarUrl: BananaBotConfig.Avatars.Default
		};
	}

	public async processMessage(message: Message): Promise<void> {
		const targetUserId = process.env.DEBUG_MODE === 'true' ? UserID.Cova : UserID.Venn;
		const isTargetUser = message.author.id === targetUserId;
		const mentionsBanana = BananaBotConfig.Patterns.Default?.test(message.content);
		const shouldReply = (isTargetUser && random.percentChance(5)) || mentionsBanana;

		if (shouldReply) {
			logger.debug(`BananaBot responding to message: ${message.content}`);
			await this.sendReply(message.channel as TextChannel, BananaBotConfig.Responses.Default());
		}
	}
}

