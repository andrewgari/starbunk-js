import { Message } from 'discord.js';
import roleIDs from '../../../discord/roleIDs';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { TriggerCondition } from '../botTypes';
import ReplyBot from '../replyBot';

/**
 * SoggyBot - A bot that responds to wet bread mentions from users with the WetBread role
 */
class WetBreadTrigger implements TriggerCondition {
	constructor(private pattern: RegExp) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		if (message.author.bot || !message.member) return false;
		return message.content.match(this.pattern) !== null &&
			message.member.roles.cache.some((role) => role.id === roleIDs.WetBread);
	}
}

export default function createSoggyBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	return new BotBuilder('SoggyBot', webhookServiceParam)
		.withAvatar('https://imgur.com/OCB6i4x.jpg')
		.withCustomTrigger(new WetBreadTrigger(/wet bread/i))
		.respondsWithStatic('Sounds like somebody enjoys wet bread')
		.build();
}
