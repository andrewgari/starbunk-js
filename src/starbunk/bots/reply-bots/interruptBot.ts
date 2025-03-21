import { DiscordService } from '@/services/discordService';
import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import Random from '../../../utils/random';
import { InterruptBotConfig } from '../config/interruptBotConfig';
import ReplyBot from '../replyBot';

export default class InterruptBot extends ReplyBot {
	protected get defaultBotName(): string {
		return 'InterruptBot';
	}

	protected get botIdentity(): BotIdentity {
		return DiscordService.getInstance().getRandomMemberAsBotIdentity();
	}

	async processMessage(message: Message): Promise<void> {
		const percentChance = process.env.DEBUG_MODE === 'true' ? 100 : 1;
		const shouldInterrupt = Random.percentChance(percentChance);
		if (!shouldInterrupt) return;


		if (shouldInterrupt) {
			const interruptedMessage = InterruptBotConfig.Responses.createInterruptedMessage(message.content);
			this.sendReply(message.channel as TextChannel, interruptedMessage);
		}
	}
}
