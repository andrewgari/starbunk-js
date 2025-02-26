import { Message } from 'discord.js';
import UserID from '../../../discord/userID';
import random from '../../../utils/random';
import { WebhookService } from '../../../webhooks/webhookService';
import { BotIdentity, CompositeTrigger, RandomResponse, TriggerCondition } from '../botTypes';
import ReplyBot from '../replyBot';

// Define the responses as a constant outside the class
export const BANANA_RESPONSES = [
	"Always bring a :banana: to a party, banana's are good!",
	"Don't drop the :banana:, they're a good source of potassium!",
	"If you gave a monkey control over it's environment, it would fill the world with :banana:s...",
	'Banana. :banana:',
	"Don't judge a :banana: by it's skin.",
	'Life is full of :banana: skins.',
	'OOOOOOOOOOOOOOOOOOOOOH BA NA NA :banana:',
	':banana: Slamma!',
	'A :banana: per day keeps the Macaroni away...',
	"const bestFruit = ('b' + 'a' + + 'a').toLowerCase(); :banana:",
	"Did you know that the :banana:s we have today aren't even the same species of :banana:s we had 50 years ago. The fruit has gone extinct over time and it's actually a giant eugenics experimet to produce new species of :banana:...",
	"Monkeys always ask ''Wher :banana:', but none of them ask 'How :banana:?'",
	':banana: https://www.tiktok.com/@tracey_dintino_charles/video/7197753358143278378?_r=1&_t=8bFpt5cfIbG',
];

// Custom trigger for Venn with random chance
class VennRandomTrigger implements TriggerCondition {
	constructor(private chance: number) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		return message.author.id === UserID.Venn && random.percentChance(this.chance);
	}
}

// Custom trigger for banana pattern
class BananaPatternTrigger implements TriggerCondition {
	private pattern = /banana/i;

	async shouldTrigger(message: Message): Promise<boolean> {
		return this.pattern.test(message.content);
	}
}

// Custom BananaBot class that extends ReplyBot
class BananaBot extends ReplyBot {
	// Properties needed for the patchReplyBot helper
	botName: string;
	avatarUrl: string;

	constructor(webhookService: WebhookService) {
		// Create the identity
		const identity: BotIdentity = {
			name: 'BananaBot',
			avatarUrl: ''
		};

		// Create the triggers
		const bananaPattern = new BananaPatternTrigger();
		const vennRandom = new VennRandomTrigger(5);
		const trigger = new CompositeTrigger([bananaPattern, vennRandom]);

		// Create the response generator
		const responseGenerator = new RandomResponse(BANANA_RESPONSES);

		super(identity, trigger, responseGenerator, webhookService);

		// Initialize properties for the patchReplyBot helper
		this.botName = identity.name;
		this.avatarUrl = identity.avatarUrl;
	}

	// Override handleMessage to update the identity before processing
	async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		// Update the identity properties
		this.botName = message.author.displayName ?? message.author.username;
		this.avatarUrl = message.author.displayAvatarURL?.() ?? '';

		// Also update the identity object
		const identity = this.getIdentity();
		identity.name = this.botName;
		identity.avatarUrl = this.avatarUrl;

		// Call the parent handleMessage method to use the trigger and response generator
		return super.handleMessage(message);
	}
}

// Factory function to create a BananaBot instance
export default function createBananaBot(webhookService: WebhookService): BananaBot {
	return new BananaBot(webhookService);
}
