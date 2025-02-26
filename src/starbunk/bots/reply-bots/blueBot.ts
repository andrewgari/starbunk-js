import { Message } from 'discord.js';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { ResponseGenerator, TriggerCondition } from '../botTypes';
import ReplyBot from '../replyBot';

// Avatar URLs
const DEFAULT_AVATAR = 'https://imgur.com/WcBRCWn.png';
const CHEEKY_AVATAR = 'https://i.imgur.com/dO4a59n.png';
const MURDER_AVATAR = 'https://imgur.com/Tpo8Ywd.jpg';

/**
 * BluBot - A bot with complex response logic for messages containing "blue"
 */

// Nice message trigger implementation
class NiceMessageTrigger implements TriggerCondition {
	private pattern = /blue?bot,? say something nice about (?<n>.+$)/i;

	async shouldTrigger(message: Message): Promise<boolean> {
		if (message.author.bot) return false;
		return this.pattern.test(message.content);
	}

	getNameFromMessage(message: Message): string {
		const matches = message.content.match(this.pattern);
		if (!matches?.groups?.n) return 'Hey';
		const name = matches.groups.n;
		if (name === 'me') {
			return message.member?.displayName ?? message.author.displayName;
		}
		return name;
	}
}

// Custom response generator for BlueBot
class BlueBotResponseGenerator implements ResponseGenerator {
	private niceTrigger = new NiceMessageTrigger();
	private avatarUrl = DEFAULT_AVATAR;

	async generateResponse(message: Message): Promise<string> {
		if (message.author.bot) return '';

		// Check for mean words
		if (message.content.match(/\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i)) {
			this.avatarUrl = MURDER_AVATAR;
			return 'No way, Venn can suck my blu cane. :unamused:';
		}

		// Check for nice message
		if (await this.niceTrigger.shouldTrigger(message)) {
			this.avatarUrl = CHEEKY_AVATAR;
			const name = this.niceTrigger.getNameFromMessage(message);
			return `${name}, I think you're pretty Blu! :wink:`;
		}

		// Check for confirmation
		if (message.content.match(/\b(yes|no|yep|yeah|(i did)|(you got it)|(sure did))\b/i)) {
			this.avatarUrl = CHEEKY_AVATAR;
			return 'Lol, Somebody definitely said Blu! :smile:';
		}

		// Check for blue mention
		if (message.content.match(/\bblue?\b/i)) {
			this.avatarUrl = DEFAULT_AVATAR;
			return 'Did somebody say Blu?';
		}

		return '';
	}

	// Method to get current avatar URL
	getAvatarUrl(): string {
		return this.avatarUrl;
	}
}

// Create the triggers
class BluBotTrigger implements TriggerCondition {
	private bluePattern = /\bblue?\b/i;
	private confirmPattern = /\b(yes|no|yep|yeah|(i did)|(you got it)|(sure did))\b/i;
	private meanPattern = /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i;
	private niceTrigger = new NiceMessageTrigger();

	async shouldTrigger(message: Message): Promise<boolean> {
		if (message.author.bot) return false;
		return this.bluePattern.test(message.content) ||
			this.confirmPattern.test(message.content) ||
			this.meanPattern.test(message.content) ||
			await this.niceTrigger.shouldTrigger(message);
	}
}

export default function createBlueBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	const responseGenerator = new BlueBotResponseGenerator();

	// Create and return the bot using the builder pattern
	return new BotBuilder('BluBot', webhookServiceParam)
		.withAvatar(DEFAULT_AVATAR)
		.withCustomTrigger(new BluBotTrigger())
		.respondsWithCustom(responseGenerator)
		.build();
}
