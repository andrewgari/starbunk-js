import { Message, TextChannel } from 'discord.js';
import userId from '../../../discord/userId';
import { getDiscordService, getLLMManager } from '../../../services/bootstrap';
import { LLMProviderType } from '../../../services/llm';
import { LLMManager } from '../../../services/llm/llmManager';
import { PromptRegistry, PromptType } from '../../../services/llm/promptManager';
import { registerAllPrompts } from '../../../services/llm/prompts';
import { covaResponseDecisionPrompt } from '../../../services/llm/prompts/covaEmulatorPrompt';
import { logger } from '../../../services/logger';
import { BotIdentity } from '../../types/botIdentity';
import { CovaBotConfig } from '../config/covaBotConfig';
import ReplyBot from '../replyBot';

export default class CovaBot extends ReplyBot {
	private _botIdentity: BotIdentity;
	private _lastProcessedMessageId: string = '';
	private _recentResponses: Set<string> = new Set(); // Channel IDs where bot recently responded
	private _hasLLM: boolean = false;
	private readonly llmManager?: LLMManager | null;
	// Only track last response time for logging
	private lastResponseTime: Date = new Date(0);

	// Force responses for testing (set to true for debugging)
	private readonly FORCE_RESPONSES: boolean = process.env.DEBUG_MODE === 'true';

	private readonly botIdentityValue: BotIdentity = {
		botName: CovaBotConfig.Name,
		avatarUrl: CovaBotConfig.Avatars.Default
	};

	constructor() {
		super();
		logger.info(`[${this.defaultBotName}] Initializing CovaBot`);

		try {
			// Initialize with default values
			this._botIdentity = this.botIdentityValue;

			// Try to get Cova's real identity
			this.updateBotIdentity();

			// Ensure all prompts are registered properly - only if needed
			try {
				this.ensurePromptsRegistered();
			} catch (promptError) {
				logger.error(`[${this.defaultBotName}] Error registering prompts: ${promptError instanceof Error ? promptError.message : String(promptError)}`);
				// Continue bot initialization even if prompt registration fails
			}

			// Initialize LLM manager - with safer approach
			try {
				logger.info(`[${this.defaultBotName}] Attempting to initialize LLM Manager...`);
				const tempLLMManager = getLLMManager();
				this._hasLLM = !!tempLLMManager;

				if (this._hasLLM) {
					this.llmManager = tempLLMManager;
					logger.info(`[${this.defaultBotName}] LLM Manager initialized: SUCCESS`);

					// Only test LLM if manager was successfully retrieved
					try {
						this.verifyLLMAvailability();
					} catch (verifyError) {
						logger.error(`[${this.defaultBotName}] Error verifying LLM: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`);
						// Continue initialization even if verification fails
					}
				} else {
					logger.info(`[${this.defaultBotName}] LLM Manager initialized: FAILED - Manager is null or undefined`);
				}
			} catch (error) {
				const typedError = error instanceof Error ? error : new Error(String(error));
				logger.error(`[${this.defaultBotName}] Error initializing LLM Manager: ${typedError.message}`);
				this._hasLLM = false;
				// Don't throw error, continue with initialization
			}

			logger.info(`[${this.defaultBotName}] Initialization complete. Force responses: ${this.FORCE_RESPONSES}, LLM available: ${this._hasLLM}`);

			// Very explicit debug mode check for verification
			if (process.env.DEBUG_MODE === 'true') {
				logger.warn(`[${this.defaultBotName}] DEBUG MODE IS ACTIVE - WILL ONLY RESPOND TO COVA MESSAGES`);
				console.log(`[${this.defaultBotName}] DEBUG MODE IS ACTIVE - WILL ONLY RESPOND TO COVA MESSAGES`);
			} else {
				logger.warn(`[${this.defaultBotName}] Normal mode - will ignore messages from Cova`);
				console.log(`[${this.defaultBotName}] Normal mode - will ignore messages from Cova`);
			}

			logger.info(`[${this.defaultBotName}] Force responses mode: ${this.FORCE_RESPONSES ? 'ENABLED' : 'DISABLED'}`);
		} catch (error) {
			// Ensure the bot doesn't crash during initialization
			const typedError = error instanceof Error ? error : new Error(String(error));
			logger.error(`[${this.defaultBotName}] Error during initialization: ${typedError.message}`);
			logger.error(`[${this.defaultBotName}] Stack trace:`, typedError);

			// Set safe defaults
			this._hasLLM = false;
			this._botIdentity = this.botIdentityValue;
		}
	}

	/**
	 * Ensure that prompts are properly registered
	 */
	private async ensurePromptsRegistered(): Promise<void> {
		try {
			logger.info(`[${this.defaultBotName}] Registering all prompts...`);
			registerAllPrompts();

			// Verify the Cova prompt is registered
			const decisionPrompt = PromptRegistry.getPrompt(PromptType.COVA_EMULATOR);
			logger.info(`[${this.defaultBotName}] Prompt registration status: ${decisionPrompt ? 'OK' : 'MISSING'}`);

			if (!decisionPrompt) {
				logger.warn(`[${this.defaultBotName}] Cova emulator prompt not registered, attempting manual registration...`);
				PromptRegistry.registerPrompt(PromptType.COVA_EMULATOR, {
					systemContent: covaResponseDecisionPrompt,
					formatUserMessage: (message: string) => message,
					defaultTemperature: 0.7,
					defaultMaxTokens: 150
				});

				// Verify registration was successful
				const promptAfter = PromptRegistry.getPrompt(PromptType.COVA_EMULATOR);
				logger.info(`[${this.defaultBotName}] After manual registration: Cova prompt: ${promptAfter ? 'OK' : 'STILL MISSING'}`);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error ensuring prompts registered: ${error instanceof Error ? error.message : String(error)}`);
			throw error; // Rethrow to be handled by caller
		}
	}

	/**
	 * Verify LLM availability with a quick test
	 */
	private async verifyLLMAvailability(): Promise<void> {
		try {
			logger.info(`[${this.defaultBotName}] Verifying LLM availability...`);
			if (!this.llmManager) {
				logger.error(`[${this.defaultBotName}] LLM Manager not available`);
				this._hasLLM = false;
				return;
			}

			try {
				const testResponse = await this.llmManager.createCompletion({
					model: LLMProviderType.OLLAMA,
					messages: [{ role: 'user', content: 'Say "LLM is working"' }],
					temperature: 0.7,
					maxTokens: 10
				});

				this._hasLLM = !!testResponse?.content;
				logger.info(`[${this.defaultBotName}] LLM test response: "${testResponse?.content}" - Available: ${this._hasLLM}`);
			} catch (testError) {
				logger.error(`[${this.defaultBotName}] Test LLM request failed:`, testError instanceof Error ? testError : new Error(String(testError)));
				this._hasLLM = false;
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error testing LLM:`, error instanceof Error ? error : new Error(String(error)));
			this._hasLLM = false;
			throw error; // Rethrow to be handled by caller
		}
	}

	/**
	 * Updates the bot identity by fetching the latest user data
	 */
	private async updateBotIdentity(): Promise<void> {
		try {
			// Try to get the user's info
			const discord = getDiscordService();
			let user;

			try {
				user = discord.getUser(userId.Cova);
				logger.info(`[${this.defaultBotName}] Successfully found Cova user with ID: ${userId.Cova}`);
			} catch (userErr) {
				logger.warn(`[${this.defaultBotName}] Could not get Cova's user info: ${userErr instanceof Error ? userErr.message : String(userErr)}`);
				user = null;
			}

			if (user) {
				this._botIdentity = {
					botName: CovaBotConfig.Name,
					avatarUrl: user.displayAvatarURL()
				};
				logger.debug(`[${this.defaultBotName}] Bot identity updated with avatar: ${this._botIdentity.avatarUrl}`);
			} else {
				logger.warn(`[${this.defaultBotName}] Using default avatar for CovaBot`);
				this._botIdentity = this.botIdentityValue;
			}
		} catch (error) {
			const typedError = error instanceof Error ? error : new Error(String(error));
			logger.error(`[${this.defaultBotName}] Error updating bot identity:`, typedError);
			this._botIdentity = this.botIdentityValue;
		}
	}

	public override get botIdentity(): BotIdentity {
		return this._botIdentity;
	}

	/**
	 * Get the default name for this bot
	 */
	public override get defaultBotName(): string {
		return CovaBotConfig.Name;
	}

	protected override async processMessage(message: Message): Promise<void> {
		try {
			// Skip messages from Cova unless we're in debug mode
			if (message.author.id === userId.Cova && process.env.DEBUG_MODE !== 'true') {
				logger.debug(`[${this.defaultBotName}] Ignoring message from Cova`);
				return;
			}

			// Skip messages from other ignored users
			if (CovaBotConfig.IgnoreUsers.includes(message.author.id)) {
				logger.debug(`[${this.defaultBotName}] Ignoring message from ignored user ${message.author.id}`);
				return;
			}

			// Skip our own messages
			if (message.author.id === message.client.user?.id) {
				return;
			}

			// Skip if we've already processed this message
			if (message.id === this._lastProcessedMessageId) {
				return;
			}
			this._lastProcessedMessageId = message.id;

			// Skip if content is empty
			if (!message.content || message.content.trim() === '') {
				return;
			}

			// Check cooldown between responses - removed cooldown check
			const currentTime = new Date();
			const timeSinceLastResponse = currentTime.getTime() - this.lastResponseTime.getTime();
			logger.debug(`[${this.defaultBotName}] Time since last response: ${Math.round(timeSinceLastResponse / 1000)}s`);

			logger.debug(`[${this.defaultBotName}] Cooldown disabled - processing all messages`);

			// Check if we recently responded in this channel
			const inConversation = this._recentResponses.has(message.channel.id);

			// Check for mentions of Cova
			const containsMention = CovaBotConfig.Patterns.Mention.test(message.content) ||
				CovaBotConfig.Patterns.Question.test(message.content);

			// Force response for testing
			if (this.FORCE_RESPONSES && message.content.toLowerCase().includes('hey cova')) {
				logger.info(`[${this.defaultBotName}] Force response triggered by 'hey cova' keyword`);
				await this.generateAndSendResponse(message);
				this.lastResponseTime = currentTime;
				this._recentResponses.add(message.channel.id);

				// Clean up old channels in the set (keep only 5 most recent)
				if (this._recentResponses.size > 5) {
					const channelsArray = Array.from(this._recentResponses);
					this._recentResponses = new Set(channelsArray.slice(channelsArray.length - 5));
				}

				return;
			}

			// Always respond to direct mentions
			if (containsMention) {
				logger.info(`[${this.defaultBotName}] Mention detected, generating response`);
				await this.generateAndSendResponse(message);
				this.lastResponseTime = currentTime;
				this._recentResponses.add(message.channel.id);
				return;
			}

			// Use LLM to decide if we should respond
			const shouldRespond = await this.shouldRespondToMessage(message.content, inConversation);
			if (shouldRespond) {
				logger.info(`[${this.defaultBotName}] LLM decided to respond`);
				await this.generateAndSendResponse(message);
				this.lastResponseTime = currentTime;
				this._recentResponses.add(message.channel.id);

				// Clean up old channels in the set (keep only 5 most recent)
				if (this._recentResponses.size > 5) {
					const channelsArray = Array.from(this._recentResponses);
					this._recentResponses = new Set(channelsArray.slice(channelsArray.length - 5));
				}
			}
		} catch (error) {
			const typedError = error instanceof Error ? error : new Error(String(error));
			logger.error(`[${this.defaultBotName}] Error processing message:`, typedError);
			logger.error(`[${this.defaultBotName}] Stack trace: ${typedError.stack}`);
			// Don't rethrow - keep the bot running
		}
	}

	private async shouldRespondToMessage(content: string, inConversation: boolean): Promise<boolean> {
		try {
			const userPrompt = `Message: "${content}"
${inConversation ? "Part of an ongoing conversation where Cova recently replied." : "New conversation Cova hasn't joined yet."}`;

			// Check if LLM is available
			if (!this._hasLLM || !this.llmManager) {
				logger.warn(`[${this.defaultBotName}] LLM not available for decision, falling back to simple randomization`);
				// Fall back to simple randomization with higher probability for ongoing conversations
				return Math.random() < (inConversation ? 0.3 : CovaBotConfig.ResponseRate);
			}

			// Use a fast, small model for quick decision
			try {
				const llmResponse = await this.llmManager.createCompletion({
					model: process.env.OLLAMA_DEFAULT_MODEL || 'gemma3:4b',
					messages: [
						{ role: "system", content: covaResponseDecisionPrompt },
						{ role: "user", content: userPrompt }
					],
					temperature: 0.1,
					maxTokens: 5
				});

				if (!llmResponse || !llmResponse.content) {
					logger.warn(`[${this.defaultBotName}] LLM returned empty response for decision, using fallback`);
					return Math.random() < (inConversation ? 0.3 : CovaBotConfig.ResponseRate);
				}

				const shouldRespond = llmResponse.content.toLowerCase().includes("yes");
				logger.info(`[${this.defaultBotName}] LLM decision: ${shouldRespond} (raw: "${llmResponse.content}")`);

				// Apply randomization to avoid responding to everything
				const randomThreshold = inConversation ? 0.7 : 0.3;
				const finalDecision = shouldRespond && Math.random() < randomThreshold;
				logger.info(`[${this.defaultBotName}] Final decision after randomization: ${finalDecision}`);
				return finalDecision;
			} catch (llmError) {
				logger.error(`[${this.defaultBotName}] Error with LLM decision: ${llmError instanceof Error ? llmError.message : String(llmError)}`);
				// Fall back to simple randomization
				return Math.random() < (inConversation ? 0.3 : CovaBotConfig.ResponseRate);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error deciding whether to respond:`, error as Error);

			// Fall back to simple randomization
			return Math.random() < (inConversation ? 0.3 : CovaBotConfig.ResponseRate);
		}
	}

	/**
	 * Get more diverse fallback responses for when LLM is unavailable
	 */
	private getFallbackResponse(_messageContent?: string): string {
		// Fallback responses - more creative
		const responses = [
			"Yeah, that's pretty cool.",
			"I see what you mean.",
			"Interesting point.",
			"I was just thinking about that.",
			"Hmm, I haven't considered that before.",
			"That's a fair point.",
			"I can see where you're coming from.",
			"That makes sense.",
			"I've been wondering about that too.",
			"Good point!",
			"Fair enough.",
			"Well said.",
			"That's a unique perspective.",
			"I like how you think about these things.",
			"You might be onto something there."
		];

		return responses[Math.floor(Math.random() * responses.length)];
	}

	private async generateAndSendResponse(message: Message): Promise<void> {
		try {
			if (!this._hasLLM || !this.llmManager) {
				const response = this.getFallbackResponse();
				logger.warn(`[${this.defaultBotName}] LLM not available, using fallback response: "${response}"`);
				await this.sendReply(message.channel as TextChannel, response);
				return;
			}

			try {
				let response = await this.llmManager.createPromptCompletion(
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
					response = this.getFallbackResponse();
					logger.warn(`[${this.defaultBotName}] LLM returned empty response, using fallback: "${response}"`);
				}

				logger.info(`[${this.defaultBotName}] Sending response: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`);
				await this.sendReply(message.channel as TextChannel, response);
			} catch (error) {
				logger.error(`[${this.defaultBotName}] Error generating response:`, error as Error);
				// Use fallback if error occurs
				const fallbackResponse = this.getFallbackResponse();
				logger.warn(`[${this.defaultBotName}] Using fallback response after error: "${fallbackResponse}"`);
				await this.sendReply(message.channel as TextChannel, fallbackResponse);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error generating response:`, error as Error);
			try {
				// Last resort fallback
				const emergencyResponse = "Hmm, interesting.";
				await this.sendReply(message.channel as TextChannel, emergencyResponse);
			} catch (sendError) {
				logger.error(`[${this.defaultBotName}] Failed to send even fallback response:`, sendError as Error);
			}
		}
	}
}

