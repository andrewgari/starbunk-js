import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { percentChance } from '../../../utils/random';
import { BotIdentity } from '../../types/botIdentity';
import { HomonymBotConfig } from '../config/homonymBotConfig';
import ReplyBot from '../replyBot';

interface HomonymMatch {
	word: string;
	correction: string;
}

// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class HomonymBot extends ReplyBot {
	// Cache compiled regex patterns for better performance
	private readonly wordPatterns: Map<string, RegExp> = new Map();

	constructor() {
		super();
		logger.debug(`[${this.defaultBotName}] Initializing HomonymBot`);
		this.skipBotMessages = false;
		this.initializeWordPatterns();
		logger.debug(`[${this.defaultBotName}] Initialized ${this.wordPatterns.size} word patterns`);
	}

	private initializeWordPatterns(): void {
		logger.debug(`[${this.defaultBotName}] Initializing word patterns`);
		try {
			// Pre-compile all regex patterns for better performance
			HomonymBotConfig.HomonymPairs.forEach(pair => {
				pair.words.forEach(word => {
					const pattern = new RegExp(`\\b${word}\\b`, "i");
					this.wordPatterns.set(word, pattern);
					logger.debug(`[${this.defaultBotName}] Added pattern for word: ${word}`);
				});
			});
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error initializing word patterns:`, error as Error);
			throw error;
		}
	}

	public get botIdentity(): BotIdentity {
		return {
			avatarUrl: HomonymBotConfig.Avatars.Default,
			botName: HomonymBotConfig.Name
		};
	}

	public async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			const pair = this.findMatchingHomonymPair(message.content);
			if (pair) {
				// Add 15% chance to respond
				const shouldRespond = percentChance(15);
				if (!shouldRespond) {
					logger.debug(`[${this.defaultBotName}] Found match but skipping due to probability check (15% chance)`);
					return;
				}

				logger.info(`[${this.defaultBotName}] Found homonym match: "${pair.word}" -> "${pair.correction}"`);
				await this.sendReply(message.channel as TextChannel, pair.correction);
				logger.debug(`[${this.defaultBotName}] Sent correction successfully`);
			} else {
				logger.debug(`[${this.defaultBotName}] No homonym matches found`);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}

	private findMatchingHomonymPair(content: string): HomonymMatch | null {
		logger.debug(`[${this.defaultBotName}] Looking for homonym matches`);
		try {
			for (const pair of HomonymBotConfig.HomonymPairs) {
				for (const word of pair.words) {
					const pattern = this.wordPatterns.get(word);
					if (!pattern) {
						logger.warn(`[${this.defaultBotName}] Missing pattern for word: ${word}`);
						continue;
					}

					if (pattern.test(content)) {
						logger.debug(`[${this.defaultBotName}] Found match for word: ${word}`);
						return {
							word,
							correction: pair.corrections[word]
						};
					}
				}
			}
			return null;
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error finding homonym match:`, error as Error);
			return null;
		}
	}
}
