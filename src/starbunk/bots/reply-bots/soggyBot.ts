import { Message } from 'discord.js';
import roleIDs from '../../../discord/roleIDs';
import { WebhookService } from '../../../webhooks/webhookService';
import { TriggerCondition } from '../botTypes';
import ReplyBot from '../replyBot';

class WetBreadTrigger implements TriggerCondition {
	constructor(private pattern: RegExp) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		if (message.author.bot || !message.member) return false;
		return message.content.match(this.pattern) !== null &&
			message.member.roles.cache.some((role) => role.id === roleIDs.WetBread);
	}
}

class SoggyBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		super(
			{ name: 'SoggyBot', avatarUrl: 'https://imgur.com/OCB6i4x.jpg' },
			new WetBreadTrigger(/wet bread/i),
			{ generateResponse: async () => 'Sounds like somebody enjoys wet bread' },
			webhookService
		);
	}

	getBotName(): string {
		return 'SoggyBot';
	}
}

export default SoggyBot;
