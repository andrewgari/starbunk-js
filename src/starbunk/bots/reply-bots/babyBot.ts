import { WebhookService } from '../../../webhooks/webhookService';
import { createSimpleBot } from '../botFactory';
import ReplyBot from '../replyBot';

// Interface for bot with properties needed by patchReplyBot
interface BotWithProperties extends ReplyBot {
	botName: string;
	avatarUrl: string;
}

export default function createBabyBot(webhookService: WebhookService): ReplyBot {
	const bot = createSimpleBot({
		name: 'BabyBot',
		avatarUrl: 'https://i.redd.it/qc9qus78dc581.jpg',
		pattern: /\b(baby)\b/i,
		response: 'https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif'
	}, webhookService);

	// Add the properties to the bot instance for the patchReplyBot helper
	const botWithProps = bot as unknown as BotWithProperties;
	botWithProps.botName = 'BabyBot';
	botWithProps.avatarUrl = 'https://i.redd.it/qc9qus78dc581.jpg';

	return bot;
}
