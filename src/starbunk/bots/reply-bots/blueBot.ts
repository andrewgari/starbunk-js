import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import userId from '../../../discord/userId';
import { getLLMManager } from '../../../services/bootstrap';
import { LLMProviderType, PromptCompletionOptions, PromptType } from '../../../services/llm';
import { blueDetectorPrompt, formatBlueDetectorUserPrompt } from '../../../services/llm/prompts/blueDetectorPrompt';
import { logger } from '../../../services/logger';
import { TimeUnit, isOlderThan, isWithinTimeframe } from '../../../utils/time';
import { BlueBotConfig } from '../config/blueBotConfig';
import ReplyBot from '../replyBot';
export default class BlueBot extends ReplyBot {
	public get defaultBotName(): string {
		return 'BlueBot';
	}

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

	public async handleMessage(message: Message): Promise<void> {
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

		// Use AI to check for blue references
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

		// Try LLM approach first
		try {
			const llmManager = getLLMManager();
			if (llmManager.isProviderAvailable(LLMProviderType.OLLAMA)) {
				logger.debug('Checking if message is acknowledging BlueBot via Ollama');

				const messageContent = message.content.trim();

				// First check if it's acknowledging BlueBot using the prompt registry
				const options: PromptCompletionOptions = {
					providerType: LLMProviderType.OLLAMA,
					fallbackToDefault: true,
					fallbackToDirectCall: true
				};

				const acknowledgmentResponse = await llmManager.createPromptCompletion(
					PromptType.BLUE_ACKNOWLEDGMENT,
					messageContent,
					options
				);

				const isAcknowledging = acknowledgmentResponse.trim().toLowerCase() === 'yes';

				// If it's acknowledging, check the sentiment
				if (isAcknowledging) {
					logger.debug('Message is acknowledging BlueBot, checking sentiment');

					const sentimentResponse = await llmManager.createPromptCompletion(
						PromptType.BLUE_SENTIMENT,
						messageContent,
						options
					);

					const isNegative = sentimentResponse.trim().toLowerCase() === 'negative';

					return { isAcknowledging, isNegative };
				}

				return { isAcknowledging, isNegative: false };
			}
		} catch (error) {
			logger.error('Error checking if acknowledging BlueBot', error as Error);
		}

		// Fall back to regex approach if LLM fails
		const content = message.content;
		const isConfirm = BlueBotConfig.Patterns.Confirm?.test(content);
		const isMean = BlueBotConfig.Patterns.Mean?.test(content);

		if (isConfirm || isMean) {
			return { isAcknowledging: true, isNegative: isMean };
		}

		return defaultResult;
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

	private async checkIfBlueIsSaid(message: Message): Promise<boolean> {
		console.log('Checking if blue is said');
		try {
			// First try a simple check for common blue words
			const content = message.content.toLowerCase();
			if (BlueBotConfig.Patterns.Default?.test(content)) {
				logger.debug('Simple check for blue reference passed');
				return true;
			}

			// Try to use LLM service for more sophisticated detection
			try {
				const llmManager = getLLMManager();
				logger.debug('Checking if blue is said using LLM service');
				const messageContent = message.content.trim();

				// Use the prompt registry to check for blue references
				try {
					logger.debug('Checking if blue is said using prompt registry');
					const options: PromptCompletionOptions = {
						providerType: LLMProviderType.OLLAMA,
						fallbackToDefault: true,
						fallbackToDirectCall: true
					};

					const response = await llmManager.createPromptCompletion(
						PromptType.BLUE_DETECTOR,
						messageContent,
						options
					);

					logger.debug('Prompt registry response', response);
					return response.trim().toLowerCase() === 'yes';
				} catch (error) {
					logger.error('Error using prompt registry for blue detection', error as Error);

					// Fall back to direct approach if prompt registry fails
					if (llmManager.isProviderAvailable(LLMProviderType.OLLAMA)) {
						logger.debug('Falling back to direct Ollama call for blue detection');

						const userPrompt = formatBlueDetectorUserPrompt(messageContent);
						const response = await llmManager.createCompletion(
							LLMProviderType.OLLAMA,
							{
								model: process.env.OLLAMA_DEFAULT_MODEL || "llama3",
								messages: [
									{
										role: "system",
										content: blueDetectorPrompt
									},
									{
										role: "user",
										content: userPrompt
									}
								],
								temperature: 0.1,
								maxTokens: 3
							}
						);

						logger.debug('Ollama response', response);
						return response.content.trim().toLowerCase() === 'yes';
					}

					// Fall back to OpenAI if Ollama is not available
					if (llmManager.isProviderAvailable(LLMProviderType.OPENAI)) {
						logger.debug('Falling back to OpenAI for blue detection');

						const userPrompt = formatBlueDetectorUserPrompt(messageContent);
						const response = await llmManager.createCompletion(
							LLMProviderType.OPENAI,
							{
								model: process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini",
								messages: [
									{
										role: "system",
										content: blueDetectorPrompt
									},
									{
										role: "user",
										content: userPrompt
									}
								],
								temperature: 0.1,
								maxTokens: 3
							}
						);

						logger.debug('OpenAI response', response);
						return response.content.trim().toLowerCase() === 'yes';
					}
				}
			} catch (llmError) {
				logger.error('Error calling LLM service', llmError as Error);
			}

			// Fall back to simple check if LLM service fails
			logger.debug('LLM service failed, falling back to simple check');
			return false;
		} catch (error) {
			logger.error('Error checking for blue reference', error as Error);
			// Fall back to simple check if AI fails
			logger.debug('AI failed, falling back to simple check');
			return false;
		}
	}

	private isSomeoneAskingToBeBlue(message: Message): boolean {
		const content = message.content;
		return BlueBotConfig.Patterns.Nice?.test(content) ?? false;
	}
}
