import { Message, TextChannel } from 'discord.js';
import userId from '../../../discord/userId';
import { getLLMManager } from '../../../services/bootstrap';
import { LLMProviderType, PromptCompletionOptions, PromptType } from '../../../services/llm';
// Import directly from the specific prompt file for fallback
import { blueDetectorPrompt, formatBlueDetectorUserPrompt } from '../../../services/llm/prompts/blueDetectorPrompt';
import { Logger } from '../../../services/logger';
import { TimeUnit, isOlderThan, isWithinTimeframe } from '../../../utils/time';
import { BlueBotConfig } from '../config/blueBotConfig';
import ReplyBot from '../replyBot';
// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class BlueBot extends ReplyBot {
	protected get botIdentity(): { userId: string; botName: string; avatarUrl: string } {
		return {
			userId: '',
			botName: BlueBotConfig.Name,
			avatarUrl: BlueBotConfig.Avatars.Default
		};
	}

	private _blueTimestamp: Date = new Date(Number.MIN_SAFE_INTEGER);
	private _blueMurderTimestamp: Date = new Date(Number.MIN_SAFE_INTEGER);
	private readonly logger = new Logger();

	public get blueTimestamp(): Date {
		return this._blueTimestamp;
	}

	public get blueMurderTimestamp(): Date {
		return this._blueMurderTimestamp;
	}

	public async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		const channel = message.channel as TextChannel;

		if (await this.isVennInsultingBlu(message)) {
			this._blueMurderTimestamp = new Date();
			await this.sendReply(channel, {
				botIdentity: {
					...this.botIdentity,
					avatarUrl: BlueBotConfig.Avatars.Murder
				},
				content: BlueBotConfig.Responses.Murder
			});
			return;
		}

		if (this.isSomeoneAskingToBeBlue(message)) {
			await this.sendReply(channel, {
				botIdentity: {
					...this.botIdentity,
					avatarUrl: BlueBotConfig.Avatars.Default
				},
				content: BlueBotConfig.Responses.Request(message.content)
			});
			return;
		}

		const acknowledgmentResult = await this.isSomeoneRespondingToBlu(message);
		if (acknowledgmentResult.isAcknowledging) {
			const responses = acknowledgmentResult.isNegative
				? BlueBotConfig.Responses.Cheeky
				: BlueBotConfig.Responses.Cheeky;

			const randomIndex = Math.floor(Math.random() * responses.length);
			await this.sendReply(channel, {
				botIdentity: {
					...this.botIdentity,
					avatarUrl: acknowledgmentResult.isNegative
						? BlueBotConfig.Avatars.Cheeky
						: BlueBotConfig.Avatars.Cheeky
				},
				content: responses[randomIndex]
			});
			return;
		}

		// Use AI to check for blue references
		if (await this.checkIfBlueIsSaid(message)) {
			this._blueTimestamp = new Date();
			await this.sendReply(channel, {
				botIdentity: {
					...this.botIdentity,
					avatarUrl: BlueBotConfig.Avatars.Default
				},
				content: BlueBotConfig.Responses.Default
			});
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
				this.logger.debug('Checking if message is acknowledging BlueBot via Ollama');

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
					this.logger.debug('Message is acknowledging BlueBot, checking sentiment');

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
			this.logger.error('Error checking if acknowledging BlueBot', error as Error);
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
		try {
			// First try a simple check for common blue words
			const content = message.content.toLowerCase();
			if (BlueBotConfig.Patterns.Default?.test(content)) {
				return true;
			}

			// Try to use LLM service for more sophisticated detection
			try {
				const llmManager = getLLMManager();
				const messageContent = message.content.trim();

				// Use the prompt registry to check for blue references
				try {
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

					return response.trim().toLowerCase() === 'yes';
				} catch (error) {
					this.logger.error('Error using prompt registry for blue detection', error as Error);

					// Fall back to direct approach if prompt registry fails
					if (llmManager.isProviderAvailable(LLMProviderType.OLLAMA)) {
						this.logger.debug('Falling back to direct Ollama call for blue detection');

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

						return response.content.trim().toLowerCase() === 'yes';
					}

					// Fall back to OpenAI if Ollama is not available
					if (llmManager.isProviderAvailable(LLMProviderType.OPENAI)) {
						this.logger.debug('Falling back to OpenAI for blue detection');

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

						return response.content.trim().toLowerCase() === 'yes';
					}
				}
			} catch (llmError) {
				this.logger.error('Error calling LLM service', llmError as Error);
			}

			// Fall back to simple check if LLM service fails
			return false;
		} catch (error) {
			this.logger.error('Error checking for blue reference', error as Error);
			// Fall back to simple check if AI fails
			return false;
		}
	}

	private isSomeoneAskingToBeBlue(message: Message): boolean {
		const content = message.content;
		return BlueBotConfig.Patterns.Nice?.test(content) ?? false;
	}
}
