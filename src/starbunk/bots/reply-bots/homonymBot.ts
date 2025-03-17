import { Message, TextChannel } from 'discord.js';
import { BotIdentity } from '../botIdentity';
import { HomonymBotConfig } from '../config/homonymBotConfig';
import ReplyBot from '../replyBot';

// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class HomonymBot extends ReplyBot {
	// Cache compiled regex patterns for better performance
	private readonly wordPatterns: Map<string, RegExp> = new Map();

	constructor() {
		super();
		this.initializeWordPatterns();
	}

	private initializeWordPatterns(): void {
		// Pre-compile all regex patterns for better performance
		HomonymBotConfig.HomonymPairs.forEach(pair => {
			pair.words.forEach(word => {
				this.wordPatterns.set(word, new RegExp(`\\b${word}\\b`, "i"));
			});
		});
	}

	protected get botIdentity(): BotIdentity {
		return {
			userId: '',
			avatarUrl: HomonymBotConfig.Avatars.Default,
			botName: HomonymBotConfig.Name
		};
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const matchedPair = this.findMatchingHomonymPair(content);

		if (matchedPair) {
			await this.sendReply(message.channel as TextChannel, `*${matchedPair.correction}`);
		}
	}

	private findMatchingHomonymPair(content: string): { word: string; correction: string } | null {
		for (const pair of HomonymBotConfig.HomonymPairs) {
			for (const word of pair.words) {
				const pattern = this.wordPatterns.get(word);
				if (pattern && pattern.test(content)) {
					return {
						word,
						correction: pair.corrections[word]
					};
				}
			}
		}
		return null;
	}
}
