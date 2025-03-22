import { Message, TextChannel } from 'discord.js';
import { DiscordService } from '../../../services/discordService';
import Random from '../../../utils/random';
import { BotIdentity } from '../../types/botIdentity';
import { InterruptBotConfig } from '../config/interruptBotConfig';
import ReplyBot from '../replyBot';

export default class InterruptBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		return DiscordService.getInstance().getRandomMemberAsBotIdentity();
	}

	public async processMessage(message: Message): Promise<void> {
		const percentChance = process.env.DEBUG_MODE === 'true' ? 100 : 1;
		const shouldInterrupt = Random.percentChance(percentChance);
		if (!shouldInterrupt) return;


		if (shouldInterrupt) {
			const interruptedMessage = InterruptBotConfig.Responses.createInterruptedMessage(message.content);
			this.sendReply(message.channel as TextChannel, interruptedMessage);
		}
	}
}
