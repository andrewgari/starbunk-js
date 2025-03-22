import { Message, TextChannel } from 'discord.js';
import userId from '../../../discord/userId';
import { getDiscordService, getLLMManager } from '../../../services/bootstrap';
import { LLMProviderType } from '../../../services/llm';
import { PromptType } from '../../../services/llm/promptManager';
import { covaResponseDecisionPrompt } from '../../../services/llm/prompts/covaEmulatorPrompt';
import { logger } from '../../../services/logger';
import { BotIdentity } from '../../types/botIdentity';
import { CovaBotConfig } from '../config/covaBotConfig';
import ReplyBot from '../replyBot';

export default class CovaBot extends ReplyBot {
	private _botIdentity: BotIdentity;
	private _lastProcessedMessageId: string = '';
	private _recentResponses: Set<string> = new Set(); // Channel IDs where bot recently responded

	constructor() {
		super();
		logger.debug(`[${this.defaultBotName}] Initializing CovaBot`);

		// Initialize with default values
		this._botIdentity = {
			botName: CovaBotConfig.Name,
			avatarUrl: CovaBotConfig.Avatars.Default
		};

		// Try to get Cova's real identity
		this.updateBotIdentity();

		// Very explicit debug mode check for verification
		if (process.env.DEBUG_MODE === 'true') {
			logger.warn(`[${this.defaultBotName}] DEBUG MODE IS ACTIVE - WILL ONLY RESPOND TO COVA MESSAGES`);
			console.log(`[${this.defaultBotName}] DEBUG MODE IS ACTIVE - WILL ONLY RESPOND TO COVA MESSAGES`);
		} else {
			logger.warn(`[${this.defaultBotName}] Normal mode - will ignore messages from Cova`);
			console.log(`[${this.defaultBotName}] Normal mode - will ignore messages from Cova`);
		}
	}

	public get botIdentity(): BotIdentity {
		// Update identity before returning
		this.updateBotIdentity();
		return this._botIdentity;
	}

	private updateBotIdentity(): void {
		try {
			this._botIdentity = getDiscordService().getMemberAsBotIdentity(userId.Cova);
		} catch (error) {
			// Silently keep using existing identity
		}
	}

	protected shouldSkipMessage(message: Message): boolean {
		// Skip base class conditions
		if (super.shouldSkipMessage(message)) {
			return true;
		}

		// In debug mode, ONLY respond to Cova's messages
		if (process.env.DEBUG_MODE === 'true') {
			logger.debug(`[${this.defaultBotName}] Debug mode active, only responding to Cova`);
			return message.author.id !== userId.Cova;
		}

		// Regular mode: skip messages from the real Cova and ignored users
		return message.author.id === userId.Cova ||
			(CovaBotConfig.IgnoreUsers && CovaBotConfig.IgnoreUsers.includes(message.author.id));
	}

	public async processMessage(message: Message): Promise<void> {
		try {
			// Skip duplicate processing
			if (message.id === this._lastProcessedMessageId) {
				return;
			}
			this._lastProcessedMessageId = message.id;

			// Always respond to direct mentions/questions
			const isDirectMention = CovaBotConfig.Patterns.Question.test(message.content)
				|| message.mentions.has(message.client.user?.id || '');

			// Check if we've recently replied in this channel
			const inConversation = this._recentResponses.has(message.channelId);

			if (isDirectMention) {
				await this.generateAndSendResponse(message);
				this.updateRecentResponses(message.channelId);
				return;
			}

			// For other messages, use LLM to decide if it's worth responding
			const shouldRespond = await this.shouldRespondToMessage(message.content, inConversation);
			if (shouldRespond) {
				await this.generateAndSendResponse(message);
				this.updateRecentResponses(message.channelId);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
		}
	}

	private updateRecentResponses(channelId: string): void {
		this._recentResponses.add(channelId);
		setTimeout(() => {
			this._recentResponses.delete(channelId);
		}, 60000);
	}

	private async shouldRespondToMessage(content: string, inConversation: boolean): Promise<boolean> {
		try {
			const userPrompt = `Message: "${content}"
${inConversation ? "Part of an ongoing conversation where Cova recently replied." : "New conversation Cova hasn't joined yet."}`;

			// Use a fast, small model for quick decision
			const llmResponse = await getLLMManager().createCompletion({
				model: process.env.OLLAMA_DEFAULT_MODEL || 'gemma3:4b',
				messages: [
					{ role: "system", content: covaResponseDecisionPrompt },
					{ role: "user", content: userPrompt }
				],
				temperature: 0.1,
				maxTokens: 5
			});

			const shouldRespond = llmResponse.content.toLowerCase().includes("yes");

			// Apply randomization to avoid responding to everything
			const randomThreshold = inConversation ? 0.7 : 0.3;
			return shouldRespond && Math.random() < randomThreshold;
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error deciding whether to respond:`, error as Error);

			// Fall back to simple randomization
			return Math.random() < (inConversation ? 0.3 : CovaBotConfig.ResponseRate);
		}
	}

	private async generateAndSendResponse(message: Message): Promise<void> {
		try {
			let response = await getLLMManager().createPromptCompletion(
				PromptType.COVA_EMULATOR,
				message.content,
				{
					temperature: 0.7,
					maxTokens: 150,
					providerType: LLMProviderType.OLLAMA,
					fallbackToDefault: true
				}
			);

			if (!response || response.trim() === '') {
				response = "Yeah, that's pretty cool.";
			}

			await this.sendReply(message.channel as TextChannel, response);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error generating response:`, error as Error);
		}
	}
}

