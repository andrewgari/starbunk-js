import { Message, TextChannel } from 'discord.js';
import { WebhookService } from '../../../webhooks/webhookService';
import { BotIdentity, CompositeTrigger, PatternTrigger, ResponseGenerator, TriggerCondition } from '../botTypes';
import ReplyBot from '../replyBot';

// Avatar URLs
const DEFAULT_AVATAR = 'https://imgur.com/WcBRCWn.png';
const CHEEKY_AVATAR = 'https://i.imgur.com/dO4a59n.png';
const MURDER_AVATAR = 'https://imgur.com/Tpo8Ywd.jpg';

// Custom implementation for BlueBot
class BlueBot extends ReplyBot {
	// Expose these properties for the patchReplyBot helper
	botName = 'BluBot';
	avatarUrl = DEFAULT_AVATAR;

	private niceTrigger = new NiceMessageTrigger();

	constructor(webhookService: WebhookService) {
		const identity: BotIdentity = {
			name: 'BluBot',
			avatarUrl: DEFAULT_AVATAR
		};

		const trigger = new CompositeTrigger([
			new PatternTrigger(/\bblue?\b/i),
			new NiceMessageTrigger()
		]);

		// We'll override handleMessage, so this doesn't matter
		const responseGenerator: ResponseGenerator = {
			async generateResponse(): Promise<string> {
				return 'Did somebody say Blu?';
			}
		};

		super(identity, trigger, responseGenerator, webhookService);
	}

	async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		// Check for mean words
		if (message.content.match(/\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i)) {
			this.avatarUrl = MURDER_AVATAR;
			await this.sendReply(message.channel as TextChannel, 'No way, Venn can suck my blu cane. :unamused:');
			return;
		}

		// Check for nice message
		if (await this.niceTrigger.shouldTrigger(message)) {
			this.avatarUrl = CHEEKY_AVATAR;
			const name = this.niceTrigger.getNameFromMessage(message);
			await this.sendReply(message.channel as TextChannel, `${name}, I think you're pretty Blu! :wink:`);
			return;
		}

		// Check for confirmation - only if we've seen a blue message first
		if (message.content.match(/\b(yes|no|yep|yeah|(i did)|(you got it)|(sure did))\b/i)) {
			this.avatarUrl = CHEEKY_AVATAR;
			await this.sendReply(message.channel as TextChannel, 'Lol, Somebody definitely said Blu! :smile:');
			return;
		}

		// Check for blue mention - this needs to be last
		if (message.content.match(/\bblue?\b/i)) {
			this.avatarUrl = DEFAULT_AVATAR;
			await this.sendReply(message.channel as TextChannel, 'Did somebody say Blu?');
			return;
		}
	}

	getBotName(): string {
		return this.botName;
	}
}

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

export default BlueBot;
