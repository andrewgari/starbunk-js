import { Message, TextChannel } from 'discord.js';
import Random from '../../../utils/random';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { TriggerCondition } from '../botTypes';
import ReplyBot from '../replyBot';

// Custom trigger for bot messages with random chance
class BotMessageTrigger implements TriggerCondition {
	constructor(private chance: number) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		return message.author.bot && !message.author.username?.includes('BotBot') && Random.percentChance(this.chance);
	}
}

// Create a custom bot factory that handles bot messages
export default function createBotBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	// Create a bot with the builder
	const bot = new BotBuilder('BotBot', webhookServiceParam)
		.withAvatar('https://cdn-icons-png.flaticon.com/512/4944/4944377.png')
		.withCustomTrigger(new BotMessageTrigger(5))
		.respondsWithStatic('Hello fellow bot!')
		.build();

	// Override the handleMessage method to allow bot messages
	const originalHandleMessage = bot.handleMessage.bind(bot);

	bot.handleMessage = async (message: Message): Promise<void> => {
		// Skip our own messages, but allow other bot messages
		if (message.author.bot && message.author.username === 'BotBot') return;

		// For bot messages, use our custom trigger
		if (message.author.bot) {
			if (await new BotMessageTrigger(5).shouldTrigger(message)) {
				const channel = message.channel as TextChannel;
				await webhookServiceParam.writeMessage(channel, {
					username: 'BotBot',
					avatarURL: 'https://cdn-icons-png.flaticon.com/512/4944/4944377.png',
					content: 'Hello fellow bot!',
					embeds: []
				});
			}
			return;
		}

		// For non-bot messages, use the original handler
		await originalHandleMessage(message);
	};

	return bot;
}
