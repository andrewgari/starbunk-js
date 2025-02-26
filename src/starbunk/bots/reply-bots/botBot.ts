import { Message, TextChannel } from 'discord.js';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { BotMessagePatternCondition } from '../conditions';
import ReplyBot from '../replyBot';

/**
 * BotBot - A bot that responds to messages from other bots
 */
export default function createBotBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	// Create a bot message condition
	const botMessageCondition = new BotMessagePatternCondition(5);

	// Create a bot with the builder
	const bot = new BotBuilder('BotBot', webhookServiceParam)
		.withAvatar('https://cdn-icons-png.flaticon.com/512/4944/4944377.png')
		.withCustomTrigger(botMessageCondition)
		.respondsWithStatic('Hello fellow bot!')
		.build();

	// Override the handleMessage method to allow bot messages
	const originalHandleMessage = bot.handleMessage.bind(bot);

	bot.handleMessage = async (message: Message): Promise<void> => {
		// Skip our own messages, but allow other bot messages
		if (message.author.bot && message.author.username === 'BotBot') return;

		// For bot messages, use our custom trigger
		if (message.author.bot) {
			if (await botMessageCondition.shouldTrigger(message)) {
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
