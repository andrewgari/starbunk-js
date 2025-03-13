import { Message, TextChannel } from 'discord.js';
import userId from '../../../discord/userId';
import Random from '../../../utils/random';
import { BotIdentity } from '../botIdentity';
import { PickleBotConfig } from '../config/pickleBotConfig';
import ReplyBot from '../replyBot';

export default class PickleBot extends ReplyBot {
	protected get botIdentity(): BotIdentity {
		return {
			userId: '',
			avatarUrl: PickleBotConfig.Avatars.Default,
			botName: PickleBotConfig.Name
		};
	}

	defaultBotName(): string {
		return 'PickleBot';
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		let shouldReply = false;
		let targetUserId = userId.Sig;
		if (process.env.DEBUG_MODE === 'true') {
			shouldReply = true;
			targetUserId = userId.Cova;
		} else {
			const hasPickle = PickleBotConfig.Patterns.Default?.test(message.content);
			const isTargetUser = message.author.id === targetUserId;
			shouldReply = hasPickle || (isTargetUser && Random.percentChance(15));
		}

		if (shouldReply) {
			this.sendReply(message.channel as TextChannel, {
				botIdentity: this.botIdentity,
				content: PickleBotConfig.Responses.Default
			});
		}
	}
}
