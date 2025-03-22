import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import userId from '../../../discord/userId';
import { getLLMManager } from '../../../services/bootstrap';
import { LLMProviderType, PromptCompletionOptions, PromptType } from '../../../services/llm';
import { logger } from '../../../services/logger';
import { TimeUnit, isOlderThan, isWithinTimeframe } from '../../../utils/time';
import { BlueBotConfig } from '../config/blueBotConfig';
import ReplyBot from '../replyBot';

export default class BlueBot extends ReplyBot {
	public _botIdentity: BotIdentity = {
		botName: BlueBotConfig.Name,
		avatarUrl: BlueBotConfig.Avatars.Default
	};

	public get botIdentity(): BotIdentity {
		return this._botIdentity;
	}

	private _blueTimestamp: Date = new Date(Number.MIN_SAFE_INTEGER);
	private _blueMurderTimestamp: Date = new Date(Number.MIN_SAFE_INTEGER);

	public get blueTimestamp(): Date {
		return this._blueTimestamp;
	}

	public get blueMurderTimestamp(): Date {
		return this._blueMurderTimestamp;
	}

	public async processMessage(message: Message): Promise<void> {
		if (await this.isVennInsultingBlu(message)) {
			this._blueMurderTimestamp = new Date();
			this._botIdentity = {
				botName: BlueBotConfig.Name,
				avatarUrl: BlueBotConfig.Avatars.Murder
			};
			await this.sendReply(message.channel as TextChannel, BlueBotConfig.Responses.Murder);
			return;
		}

		if (this.isSomeoneAskingToBeBlue(message)) {
			this._botIdentity = {
				botName: BlueBotConfig.Name,
				avatarUrl: BlueBotConfig.Avatars.Default
			};
			await this.sendReply(message.channel as TextChannel, BlueBotConfig.Responses.Request(message.content));
			return;
		}

		const acknowledgmentResult = await this.isSomeoneRespondingToBlu(message);
		if (acknowledgmentResult.isAcknowledging) {
			if (acknowledgmentResult.isNegative && message.author.id === userId.Venn) {
				this._botIdentity = {
					botName: BlueBotConfig.Name,
					avatarUrl: BlueBotConfig.Avatars.Murder
				};
				await this.sendReply(message.channel as TextChannel, BlueBotConfig.Responses.Murder);
			} else {
				this._botIdentity = {
					botName: BlueBotConfig.Name,
					avatarUrl: BlueBotConfig.Avatars.Cheeky
				};
				await this.sendReply(message.channel as TextChannel, BlueBotConfig.getRandomCheekyResponse());
			}
			return;
		}

		// Check for blue references
		if (await this.checkIfBlueIsSaid(message)) {
			this._blueTimestamp = new Date();
			this._botIdentity = {
				botName: BlueBotConfig.Name,
				avatarUrl: BlueBotConfig.Avatars.Cheeky
			};
			await this.sendReply(message.channel as TextChannel, BlueBotConfig.Responses.Default);
		}
	}

	private async isSomeoneRespondingToBlu(message: Message): Promise<{ isAcknowledging: boolean; isNegative: boolean }> {
		// Default result
		const defaultResult = { isAcknowledging: false, isNegative: false };

		// Fast check first - if not within timeframe, return false immediately
		if (!isWithinTimeframe(this.blueTimestamp, 5, TimeUnit.MINUTE, new Date(message.createdTimestamp))) {
			return defaultResult;
		}

		// Try regex approach first
		const content = message.content;
		const isConfirm = BlueBotConfig.Patterns.Confirm?.test(content);
		const isMean = BlueBotConfig.Patterns.Mean?.test(content);

		if (isConfirm || isMean) {
			return { isAcknowledging: true, isNegative: isMean };
		}

		// If regex didn't match, try LLM for more nuanced detection
		try {
			const llmManager = getLLMManager();
			if (!llmManager.isProviderAvailable(LLMProviderType.OLLAMA)) {
				return defaultResult;
			}

			const messageContent = message.content.trim();
			const options: PromptCompletionOptions = {
				providerType: LLMProviderType.OLLAMA,
				fallbackToDefault: true,
				fallbackToDirectCall: true
			};

			// Single LLM call to check both acknowledgment and sentiment
			const response = await llmManager.createPromptCompletion(
				PromptType.BLUE_ACKNOWLEDGMENT,
				messageContent,
				options
			);

			const result = response.trim().toLowerCase();
			if (result === 'yes-negative') {
				return { isAcknowledging: true, isNegative: true };
			} else if (result === 'yes-positive') {
				return { isAcknowledging: true, isNegative: false };
			}
		} catch (error) {
			logger.error('Error checking if acknowledging BlueBot', error as Error);
		}

		return defaultResult;
	}

	private async checkIfBlueIsSaid(message: Message): Promise<boolean> {
		// First try a simple check for common blue words
		const content = message.content.toLowerCase();
		if (BlueBotConfig.Patterns.Default?.test(content)) {
			logger.debug('Simple check for blue reference passed');
			return true;
		}

		// If regex didn't match, try LLM for more nuanced detection
		try {
			const llmManager = getLLMManager();
			if (!llmManager.isProviderAvailable(LLMProviderType.OLLAMA)) {
				return false;
			}

			const messageContent = message.content.trim();
			const options: PromptCompletionOptions = {
				providerType: LLMProviderType.OLLAMA,
				fallbackToDefault: true,
				fallbackToDirectCall: true
			};

			// Single LLM call to detect blue references
			const response = await llmManager.createPromptCompletion(
				PromptType.BLUE_DETECTOR,
				messageContent,
				options
			);

			return response.trim().toLowerCase() === 'yes';
		} catch (error) {
			logger.warn('Error using LLM for blue detection', error as Error);
			return false;
		}
	}

	private async isVennInsultingBlu(message: Message): Promise<boolean> {
		const targetUserId = process.env.DEBUG_MODE === 'true' ? userId.Cova : userId.Venn;
		const isTargetUser = message.author.id === targetUserId;
		if (!isTargetUser) return false;

		const content = message.content;
		const isMean = BlueBotConfig.Patterns.Mean?.test(content);
		if (!isMean) return false;

		const messageDate = new Date(message.createdTimestamp);
		const isMurderCooldownOver = isOlderThan(this.blueMurderTimestamp, 1, TimeUnit.DAY, messageDate);
		const isRecentBlueReference = isWithinTimeframe(this.blueTimestamp, 2, TimeUnit.MINUTE, messageDate);

		return isMurderCooldownOver && isRecentBlueReference;
	}

	private isSomeoneAskingToBeBlue(message: Message): boolean {
		return BlueBotConfig.Patterns.Nice?.test(message.content) ?? false;
	}
}
