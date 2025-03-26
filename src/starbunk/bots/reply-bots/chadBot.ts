import { Message, TextChannel } from 'discord.js';
import { randomElement } from '../../../utils/random';
import { BotIdentity } from '../../types/botIdentity';
import { ChadBotConfig } from '../config/chadBotConfig';
import ReplyBot from '../replyBot';
import { logger } from '../../../services/logger';

export default class ChadBot extends ReplyBot {
	private readonly botIdentityValue: BotIdentity = {
		botName: ChadBotConfig.Name,
		avatarUrl: ChadBotConfig.Avatars.Default
	};

	constructor() {
		super();
		this.responseRate = ChadBotConfig.ResponseRate;
		logger.debug(`[${this.defaultBotName}] Initialized with response rate ${this.responseRate}%`);
	}

	public get botIdentity(): BotIdentity {
		return this.botIdentityValue;
	}

	public get description(): string {
		return "Responds with gym bro / sigma male comments";
	}

	public async processMessage(message: Message): Promise<void> {
		try {
			if (!this.shouldTriggerResponse()) {
				logger.debug(`[${this.defaultBotName}] Skipping due to response rate check`);
				return;
			}

			if (this.containsTriggerWord(message.content)) {
				logger.info(`[${this.defaultBotName}] Triggered by message: "${message.content.substring(0, 100)}..."`);
				const response = this.getRandomResponse();
				await this.sendReply(message.channel as TextChannel, response);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
		}
	}

	private containsTriggerWord(content: string): boolean {
		const lowerContent = content.toLowerCase();
		
		// Check regex pattern
		if (ChadBotConfig.Patterns.Trigger.test(lowerContent)) {
			return true;
		}
		
		// Check specific phrases
		for (const phrase of ChadBotConfig.Patterns.SpecificTriggers) {
			if (lowerContent.includes(phrase.toLowerCase())) {
				return true;
			}
		}
		
		return false;
	}

	private getRandomResponse(): string {
		return randomElement(ChadBotConfig.Responses);
	}
}