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

// Interface for bot with properties needed by patchReplyBot helper
interface BotWithProperties extends ReplyBot {
	botName: string;
	avatarUrl: string;
}

export default function createSoggyBot(webhookService: WebhookService): ReplyBot {
	const bot = new ReplyBot(
		{ name: 'SoggyBot', avatarUrl: 'https://imgur.com/OCB6i4x.jpg' },
		new WetBreadTrigger(/wet bread/i),
		{ generateResponse: async () => 'Sounds like somebody enjoys wet bread' },
		webhookService
	);

	// Add the properties to the bot instance for the patchReplyBot helper
	const botWithProps = bot as unknown as BotWithProperties;
	botWithProps.botName = 'SoggyBot';
	botWithProps.avatarUrl = 'https://imgur.com/OCB6i4x.jpg';

	return bot;
}
