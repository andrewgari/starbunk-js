import { Message, TextChannel } from 'discord.js';
import userID from '../../../discord/userID';
import random from '../../../utils/random';
import { WebhookService } from '../../../webhooks/webhookService';
import { BotIdentity, TriggerCondition } from '../botTypes';
import ReplyBot from '../replyBot';

// Remove debug logging
const VENN_RESPONSES = [
	'Sorry, but that was über cringe...',
	'Geez, that was hella cringe...',
	'That was cringe to the max...',
	'What a cringe thing to say...',
	'Mondo cringe, man...',
	"Yo that was the cringiest thing I've ever heard...",
	'Your daily serving of cringe, milord...',
	'On a scale of one to cringe, that was pretty cringe...',
	'That was pretty cringe :airplane:',
	'Wow, like....cringe much?',
	'Excuse me, I seem to have dropped my cringe. Do you have it perchance?',
	'Like I always say, that was pretty cringe...',
	'C.R.I.N.G.E',
];

// Custom VennBot implementation that extends ReplyBot directly
class VennBot extends ReplyBot {
	// Expose these properties for the patchReplyBot helper
	botName = 'VennBot';
	avatarUrl = '';

	constructor(webhookService: WebhookService) {
		// Create a simple identity
		const identity: BotIdentity = {
			name: 'VennBot',
			avatarUrl: ''
		};

		// Create a trigger that only responds to Venn
		const trigger: TriggerCondition = {
			async shouldTrigger(message: Message): Promise<boolean> {
				if (message.author.bot) return false;

				// Only trigger for Venn
				if (message.author.id !== userID.Venn) return false;

				// Trigger on "cringe" or random chance
				return /\bcringe\b/i.test(message.content) || random.percentChance(5);
			}
		};

		// Create a response generator
		const responseGenerator = {
			async generateResponse(): Promise<string> {
				return VENN_RESPONSES[random.roll(VENN_RESPONSES.length)];
			}
		};

		super(identity, trigger, responseGenerator, webhookService);
	}

	// Override handleMessage to update identity before sending reply
	async handleMessage(message: Message): Promise<void> {
		if (message.author.bot || this.isSelf(message)) return;

		// Only process messages from Venn
		if (message.author.id !== userID.Venn) return;

		// Check if we should trigger
		const shouldTrigger = /\bcringe\b/i.test(message.content) || random.percentChance(5);
		if (!shouldTrigger) return;

		// Update identity to match Venn
		const identity = this.getIdentity();
		identity.name = message.author.displayName || message.author.username;
		identity.avatarUrl = message.author.displayAvatarURL?.() ?? message.author.defaultAvatarURL;

		// Also update the properties for the patchReplyBot helper
		this.botName = identity.name;
		this.avatarUrl = identity.avatarUrl;

		// Generate response and send reply
		const response = VENN_RESPONSES[random.roll(VENN_RESPONSES.length)];
		await this.sendReply(message.channel as TextChannel, response);
	}
}

export default function createVennBot(webhookService: WebhookService): ReplyBot {
	return new VennBot(webhookService);
}

// Export static method for testing
export function getRandomResponse(): string {
	return VENN_RESPONSES[random.roll(VENN_RESPONSES.length)];
}
