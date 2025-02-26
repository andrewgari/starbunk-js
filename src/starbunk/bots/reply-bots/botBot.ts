import { Message, TextChannel } from 'discord.js';
import Random from '../../../utils/random';
import { WebhookService } from '../../../webhooks/webhookService';
import { BotIdentity, StaticResponse, TriggerCondition } from '../botTypes';
import ReplyBot from '../replyBot';

// Custom trigger for bot messages with random chance
class BotMessageTrigger implements TriggerCondition {
	constructor(private chance: number) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		return message.author.bot && Random.percentChance(this.chance);
	}
}

export default class BotBot extends ReplyBot {
	botName = 'BotBot';
	avatarUrl = 'https://cdn-icons-png.flaticon.com/512/4944/4944377.png';
	private readonly response: string = 'Hello fellow bot!';

	constructor(webhookService: WebhookService | unknown) {
		const identity: BotIdentity = {
			name: 'BotBot',
			avatarUrl: 'https://cdn-icons-png.flaticon.com/512/4944/4944377.png'
		};

		const trigger = new BotMessageTrigger(5);
		const responseGenerator = new StaticResponse('Hello fellow bot!');

		super(identity, trigger, responseGenerator, webhookService);
	}

	// Keep these methods for backward compatibility
	getBotName(): string {
		return this.botName;
	}

	getAvatarUrl(): string {
		return this.avatarUrl;
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (!message.author.bot || this.isSelf(message)) return;

		if (Random.percentChance(5)) {
			await this.sendReply(message.channel as TextChannel, this.response);
		}
	}
}
