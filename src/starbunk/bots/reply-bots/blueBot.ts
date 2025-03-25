import { isDebugMode } from '@/environment';
import { Message, TextChannel } from 'discord.js';
import userId from '../../../discord/userId';
import { getLLMManager } from '../../../services/bootstrap';
import { LLMProviderType } from '../../../services/llm';
import { LLMManager } from '../../../services/llm/llmManager';
import { logger } from '../../../services/logger';
import { TimeUnit, isOlderThan, isWithinTimeframe } from '../../../utils/time';
import { BotIdentity } from '../../types/botIdentity';
import { BlueBotConfig } from '../config/blueBotConfig';
import ReplyBot from '../replyBot';

export default class BlueBot extends ReplyBot {
	private readonly llmManager?: LLMManager;
	private readonly botIdentityValue: BotIdentity = {
		botName: BlueBotConfig.Name,
		avatarUrl: BlueBotConfig.Avatars.Default
	};

	private _blueTimestamp: Date = new Date(Number.MIN_SAFE_INTEGER);
	private _blueMurderTimestamp: Date = new Date(Number.MIN_SAFE_INTEGER);
	private _hasLLM: boolean = false;

	constructor() {
		super();
		logger.debug(`[${this.defaultBotName}] Initializing BlueBot`);

		try {
			this.llmManager = getLLMManager();
			this._hasLLM = true;
			logger.debug(`[${this.defaultBotName}] LLM Manager initialized successfully`);
		} catch (error) {
			logger.warn(`[${this.defaultBotName}] LLM Manager not available, will use regex fallback only: ${error instanceof Error ? error.message : String(error)}`);
			this._hasLLM = false;
		}
	}

	public get botIdentity(): BotIdentity {
		return this.botIdentityValue;
	}
	
	public get description(): string {
		return "Responds when someone says 'blu?'";
	}

	public get blueTimestamp(): Date {
		return this._blueTimestamp;
	}

	public get blueMurderTimestamp(): Date {
		return this._blueMurderTimestamp;
	}

	public async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			// Check if someone is asking to be blue
			if (this.isSomeoneAskingToBeBlue(message)) {
				logger.info(`[${this.defaultBotName}] Handling request to be blue from ${message.author.tag}`);
				await this.sendReply(message.channel as TextChannel, BlueBotConfig.Responses.Request(message.content));
				return;
			}

			// Check if Venn is insulting Blu
			if (await this.isVennInsultingBlu(message)) {
				logger.info(`[${this.defaultBotName}] Detected insult from Venn, sending murder response`);
				this._blueMurderTimestamp = new Date();
				await this.sendReply(message.channel as TextChannel, BlueBotConfig.Responses.Murder);
				return;
			}

			// Check if someone is responding to Blue
			const isResponse = await this.isSomeoneRespondingToBlu(message.content);
			logger.debug(`[${this.defaultBotName}] Response check result: ${isResponse}`);

			if (isResponse) {
				logger.info(`[${this.defaultBotName}] Detected response to Blue from ${message.author.tag}`);
				await this.handleBluResponse(message);
				return;
			}

			// Check if Blue is mentioned
			const isBluMentioned = await this.checkIfBlueIsSaid(message.content);
			logger.debug(`[${this.defaultBotName}] Blue mention check result: ${isBluMentioned}`);

			if (isBluMentioned) {
				logger.info(`[${this.defaultBotName}] Detected Blue mention from ${message.author.tag}`);
				this._blueTimestamp = new Date();
				await this.handleBluMention(message);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}

	private async handleBluResponse(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Handling response to Blue from ${message.author.tag}`);
		try {
			await this.sendReply(message.channel as TextChannel, BlueBotConfig.getRandomCheekyResponse());
			logger.debug(`[${this.defaultBotName}] Sent cheeky response`);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error sending response:`, error as Error);
			throw error;
		}
	}

	private async handleBluMention(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Handling Blue mention from ${message.author.tag}`);
		try {
			await this.sendReply(message.channel as TextChannel, BlueBotConfig.Responses.Default);
			logger.debug(`[${this.defaultBotName}] Sent default response`);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error sending response:`, error as Error);
			throw error;
		}
	}

	private async isSomeoneRespondingToBlu(content: string): Promise<boolean> {
		logger.debug(`[${this.defaultBotName}] Checking if message is responding to Blue`);
		try {
			// Check if this is within a recent timeframe of the last blue mention
			const now = new Date();
			const isRecentBlueReference = isWithinTimeframe(this._blueTimestamp, 2, TimeUnit.MINUTE, now);

			if (!isRecentBlueReference) {
				logger.debug(`[${this.defaultBotName}] Not a recent reference to Blue`);
				return false;
			}

			// Try regex first for quick response
			const regexResult = BlueBotConfig.Patterns.Confirm?.test(content) ?? false;
			if (regexResult) {
				logger.debug(`[${this.defaultBotName}] Regex detected response to Blue`);
				return true;
			}

			// // Use LLM for more complex analysis if available
			// if (this._hasLLM && this.llmManager) {
			// 	try {
			// 		const response = await this.llmManager.createSimpleCompletion(
			// 			LLMProviderType.OLLAMA,
			// 			`Is this message responding to a previous "blu?" message? Message: "${content}"`,
			// 			undefined,
			// 			true
			// 		);

			// 		const result = response.toLowerCase().includes('yes');
			// 		logger.debug(`[${this.defaultBotName}] LLM response check result: ${result}`);
			// 		return result;
			// 	} catch (error) {
			// 		logger.warn(`[${this.defaultBotName}] LLM failed for response check, falling back to regex: ${error instanceof Error ? error.message : String(error)}`);
			// 		return regexResult;
			// 	}
			// }

			// Fall back to regex result if LLM not available
			return regexResult;
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error checking response:`, error as Error);
			// Fall back to regex result
			return BlueBotConfig.Patterns.Confirm?.test(content) ?? false;
		}
	}

	private async checkIfBlueIsSaid(content: string): Promise<boolean> {
		logger.debug(`[${this.defaultBotName}] Checking if Blue is mentioned`);
		try {
			// Try regex first for quick response
			const regexResult = BlueBotConfig.Patterns.Default?.test(content) ?? false;
			if (regexResult) {
				logger.debug(`[${this.defaultBotName}] Regex detected Blue mention`);
				return true;
			}

			// Use LLM for more complex analysis if available
			if (this._hasLLM && this.llmManager) {
				try {
					const response = await this.llmManager.createSimpleCompletion(
						LLMProviderType.OLLAMA,
						`Does this message mention or refer to "blu"? Message: "${content}"`,
						undefined,
						true
					);

					const result = response.toLowerCase().includes('yes');
					logger.debug(`[${this.defaultBotName}] LLM mention check result: ${result}`);
					return result;
				} catch (error) {
					logger.warn(`[${this.defaultBotName}] LLM failed for mention check, falling back to regex: ${error instanceof Error ? error.message : String(error)}`);
					return regexResult;
				}
			}

			// Fall back to regex result if LLM not available
			return regexResult;
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error checking mention:`, error as Error);
			// Fall back to regex result
			return BlueBotConfig.Patterns.Default?.test(content) ?? false;
		}
	}

	private async isVennInsultingBlu(message: Message): Promise<boolean> {
		logger.debug(`[${this.defaultBotName}] Checking if Venn is insulting Blue`);
		try {
			const targetUserId = isDebugMode() ? userId.Cova : userId.Venn;
			const isTargetUser = message.author.id === targetUserId;
			if (!isTargetUser) {
				logger.debug(`[${this.defaultBotName}] Message not from target user for insult check`);
				return false;
			}

			const content = message.content;
			const isMean = BlueBotConfig.Patterns.Mean?.test(content) ?? false;
			if (!isMean) {
				logger.debug(`[${this.defaultBotName}] Message not mean according to pattern check`);
				return false;
			}

			const messageDate = new Date(message.createdTimestamp);
			const isMurderCooldownOver = isOlderThan(this.blueMurderTimestamp, 1, TimeUnit.DAY, messageDate);
			const isRecentBlueReference = isWithinTimeframe(this.blueTimestamp, 2, TimeUnit.MINUTE, messageDate);

			logger.debug(`[${this.defaultBotName}] Insult check: cooldown over=${isMurderCooldownOver}, recent reference=${isRecentBlueReference}`);
			return isMurderCooldownOver && isRecentBlueReference;
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error checking for insult:`, error as Error);
			return false;
		}
	}

	private isSomeoneAskingToBeBlue(message: Message): boolean {
		const isAsking = BlueBotConfig.Patterns.Nice?.test(message.content) ?? false;
		if (isAsking) {
			logger.debug(`[${this.defaultBotName}] ${message.author.tag} is asking to be blue`);
		}
		return isAsking;
	}
}
