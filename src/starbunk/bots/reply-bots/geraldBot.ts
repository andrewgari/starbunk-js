import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { getLLMManager } from '../../../services/bootstrap';
import { LLMProviderType } from '../../../services/llm';
import { LLMManager } from '../../../services/llm/llmManager';
import promptKit, { PersonalityTemplate } from '../../../services/llm/promptKit';
import { logger } from '../../../services/logger';
import { GeraldBotConfig } from '../config/geraldBotConfig';
import ReplyBot from '../replyBot';

/**
 * GeraldBot - an insufferable know-it-all that occasionally responds to messages
 * with passive-aggressive corrections that are often comically incorrect.
 * Registered automatically by StarbunkClient.registerBots().
 */
export default class GeraldBot extends ReplyBot {
	// The time we last made a passive-aggressive correction
	private lastResponseTime: Date = new Date(0);
	private readonly llmManager?: LLMManager | null;
	private _hasLLM: boolean = false;
	// Track recent channels Gerald has responded in to vary responses across channels
	private _recentChannels: Set<string> = new Set();
	// Track if personalities have been registered
	private _personalitiesRegistered: boolean = false;

	// Set this to true to force Gerald to respond (for testing)
	private FORCED_DEBUG = true;

	constructor() {
		super();
		logger.info(`[${this.defaultBotName}] Initializing GeraldBot`);

		try {
			// Initialize the LLM manager - but use a safe approach
			try {
				this.llmManager = getLLMManager();
				this._hasLLM = !!this.llmManager;
				logger.info(`[${this.defaultBotName}] LLM Manager initialization ${this._hasLLM ? 'SUCCESS' : 'FAILED'}`);
			} catch (error) {
				logger.error(`[${this.defaultBotName}] LLM Manager initialization FAILED: ${error instanceof Error ? error.message : String(error)}`);
				this._hasLLM = false;
				this.llmManager = undefined;
			}

			// Only attempt to register personalities if LLM is available
			if (this._hasLLM) {
				this.registerGeraldPersonalities();
			} else {
				logger.warn(`[${this.defaultBotName}] Skipping personality registration as LLM is not available`);
			}

			// Enable forced debug mode for testing
			logger.info(`[${this.defaultBotName}] Setting FORCED_DEBUG = true to always respond for testing`);
		} catch (error) {
			// Ensure the bot doesn't crash during initialization
			logger.error(`[${this.defaultBotName}] Error during initialization: ${error instanceof Error ? error.message : String(error)}`);
			logger.error(`[${this.defaultBotName}] Stack trace:`, error as Error);
		}
	}

	/**
	 * Register Gerald personalities with the prompt kit for easier access
	 */
	private registerGeraldPersonalities(): void {
		try {
			// Skip if already registered
			if (this._personalitiesRegistered) {
				logger.info(`[${this.defaultBotName}] Gerald personalities already registered`);
				return;
			}

			// Skip if LLM is not available
			if (!this._hasLLM) {
				logger.warn(`[${this.defaultBotName}] Cannot register personalities - LLM not available`);
				return;
			}

			// Register Gerald decision personality
			const geraldDecisionPersonality: PersonalityTemplate = {
				name: 'geraldDecision',
				systemPrompt: `You determine if a message deserves a passive-aggressive, pedantic, know-it-all response.
You should respond with "yes" if the message contains any factual claims, expressions of opinion, or use of technical terms that someone insufferably pedantic might want to "correct".
Respond only with "yes" or "no", nothing else.`,
				temperature: 0.1,
				maxTokens: 5,
				defaultModel: 'llama2'
			};

			// Register Gerald response personality
			const geraldResponsePersonality: PersonalityTemplate = {
				name: 'geraldResponse',
				systemPrompt: `You are Gerald, an insufferable know-it-all who loves to passive-aggressively "correct" people with information that sounds plausible but is often comically incorrect.
Respond to the user message with a condescending, pedantic correction. Your correction should:
1. Sound authoritative and smug
2. Contain factual inaccuracies that sound plausible to a non-expert
3. Use unnecessary jargon and overcomplicated language
4. Be passive-aggressive in tone (use phrases like "actually", "technically", "well if we're being precise")
5. Be relatively brief (1-3 sentences)
Your goal is to be annoying but funny with your corrections. Make up "facts" that sound believable but are wrong.`,
				temperature: 0.7,
				maxTokens: 150,
				defaultModel: 'llama2'
			};

			try {
				// Register the personalities with the prompt kit
				promptKit.registerPersonality(geraldDecisionPersonality);
				promptKit.registerPersonality(geraldResponsePersonality);

				this._personalitiesRegistered = true;
				logger.info(`[${this.defaultBotName}] Registered Gerald personalities with PromptKit successfully`);
			} catch (error) {
				logger.error(`[${this.defaultBotName}] Failed to register personalities with PromptKit: ${error instanceof Error ? error.message : String(error)}`);
				this._personalitiesRegistered = false;
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error registering Gerald personalities: ${error instanceof Error ? error.message : String(error)}`);
			this._personalitiesRegistered = false;
		}
	}

	public override get botIdentity(): BotIdentity {
		return {
			botName: GeraldBotConfig.Name,
			avatarUrl: GeraldBotConfig.Avatars.Default
		};
	}

	protected override async processMessage(message: Message): Promise<void> {
		const truncatedContent = message.content.substring(0, 100);
		logger.info(`[${this.defaultBotName}] Processing message from ${message.author.tag} (${message.author.id}): "${truncatedContent}..."`);
		logger.info(`[${this.defaultBotName}] Message timestamp: ${new Date(message.createdTimestamp).toISOString()}, channel: ${message.channel.id}, guild: ${message.guild?.id || 'DM'}`);

		// Try to register personalities again if they failed the first time and LLM is available
		if (!this._personalitiesRegistered && this._hasLLM) {
			logger.info(`[${this.defaultBotName}] Attempting to register personalities again`);
			this.registerGeraldPersonalities();
		}

		try {
			await this.processMessageContent(message);
		} catch (error) {
			const typedError = error instanceof Error ? error : new Error(String(error));
			logger.error(`[${this.defaultBotName}] Error processing message:`, typedError);
			logger.error(`[${this.defaultBotName}] Error stack trace: ${typedError.stack}`);
			// Don't rethrow the error - we want to keep the bot running
			logger.info(`[${this.defaultBotName}] Continuing despite error`);
		}
	}

	/**
	 * Handles processing the message to determine if Gerald should respond
	 * with a pedantic correction.
	 *
	 * @param message - The Discord message to process
	 */
	private async processMessageContent(message: Message): Promise<void> {
		const content = message.content;
		const channelId = message.channel.id;
		const currentTime = new Date();
		const timeSinceLastResponse = currentTime.getTime() - this.lastResponseTime.getTime();

		logger.info(`[${this.defaultBotName}] Last response time: ${this.lastResponseTime.toISOString()}`);
		logger.info(`[${this.defaultBotName}] Current time: ${currentTime.toISOString()}`);
		logger.info(`[${this.defaultBotName}] Time since last response: ${timeSinceLastResponse}ms (${Math.round(timeSinceLastResponse / 1000)}s)`);
		logger.info(`[${this.defaultBotName}] Recent channels: [${Array.from(this._recentChannels).join(', ')}]`);

		// Check if the message should trigger Gerald's know-it-all tendencies
		logger.info(`[${this.defaultBotName}] Checking if Gerald should respond to message...`);

		let shouldRespond = false;
		try {
			shouldRespond = await this.shouldGeraldRespond(content);
		} catch (error) {
			const typedError = error instanceof Error ? error : new Error(String(error));
			logger.error(`[${this.defaultBotName}] Error determining if Gerald should respond:`, typedError);
			// Use fallback heuristic in case of error
			shouldRespond = this.FORCED_DEBUG || Math.random() < GeraldBotConfig.Responses.TriggerProbability;
			logger.info(`[${this.defaultBotName}] Using fallback response decision: ${shouldRespond}`);
		}

		logger.info(`[${this.defaultBotName}] Should Gerald respond: ${shouldRespond}`);

		if (shouldRespond) {
			// Apply randomness to make Gerald less annoying
			const triggerProbability = GeraldBotConfig.Responses.TriggerProbability;
			const randomValue = Math.random();
			const randomChance = randomValue < triggerProbability;

			logger.info(`[${this.defaultBotName}] Random chance check: ${randomValue} < ${triggerProbability} = ${randomChance}`);

			// Use FORCED_DEBUG to bypass random chance
			const shouldProceed = this.FORCED_DEBUG || randomChance;
			logger.info(`[${this.defaultBotName}] Should proceed: ${shouldProceed} (FORCED_DEBUG=${this.FORCED_DEBUG})`);

			if (shouldProceed) {
				logger.info(`[${this.defaultBotName}] Triggered by message from ${message.author.tag}`);

				// Update last response time
				this.lastResponseTime = currentTime;
				logger.info(`[${this.defaultBotName}] Updated last response time to: ${this.lastResponseTime.toISOString()}`);

				// Add this channel to recent channels set
				this._recentChannels.add(channelId);

				// Limit recent channels to 3 most recent
				if (this._recentChannels.size > 3) {
					const channelsArray = Array.from(this._recentChannels);
					this._recentChannels = new Set(channelsArray.slice(channelsArray.length - 3));
				}

				// Generate a custom Gerald response using LLM or fall back to predefined responses
				let response: string;
				try {
					if (this._hasLLM && this._personalitiesRegistered) {
						logger.info(`[${this.defaultBotName}] Attempting to generate response using PromptKit...`);
						response = await this.generateGeraldResponse(message);
						logger.info(`[${this.defaultBotName}] Generated LLM response successfully, length: ${response.length} characters`);
					} else {
						logger.info(`[${this.defaultBotName}] Using predefined response (LLM=${this._hasLLM}, Personalities=${this._personalitiesRegistered})`);
						response = this.getFallbackResponse(content);
					}
				} catch (error) {
					const typedError = error instanceof Error ? error : new Error(String(error));
					logger.error(`[${this.defaultBotName}] Failed to generate response:`, typedError);
					response = this.getFallbackResponse(content);
					logger.info(`[${this.defaultBotName}] Using fallback response: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`);
				}

				try {
					logger.info(`[${this.defaultBotName}] Sending response to channel ${message.channel.id}: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`);
					await this.sendReply(message.channel as TextChannel, response);
					logger.info(`[${this.defaultBotName}] Sent passive-aggressive correction successfully`);
				} catch (replyError) {
					logger.error(`[${this.defaultBotName}] Failed to send reply: ${replyError instanceof Error ? replyError.message : String(replyError)}`);
					logger.error(`[${this.defaultBotName}] Reply error stack: ${replyError instanceof Error ? replyError.stack : 'No stack trace'}`);
				}
			} else {
				logger.info(`[${this.defaultBotName}] Trigger detected but random chance prevented response`);
			}
		} else {
			logger.info(`[${this.defaultBotName}] Gerald decided not to respond to this message`);
		}
	}

	/**
	 * Uses PromptKit to generate a custom Gerald response based on the message content.
	 *
	 * @param message - The Discord message to respond to
	 * @returns A custom Gerald response
	 */
	private async generateGeraldResponse(message: Message): Promise<string> {
		try {
			if (!this._hasLLM) {
				logger.warn(`[${this.defaultBotName}] LLM not available, using hardcoded response`);
				return this.getFallbackResponse(message.content);
			}

			if (!this._personalitiesRegistered) {
				logger.warn(`[${this.defaultBotName}] Gerald personalities not registered, attempting to register again`);
				this.registerGeraldPersonalities();

				// If registration still failed, use fallback
				if (!this._personalitiesRegistered) {
					logger.warn(`[${this.defaultBotName}] Still couldn't register personalities, using hardcoded response`);
					return this.getFallbackResponse(message.content);
				}
			}

			logger.info(`[${this.defaultBotName}] Generating response to: "${message.content}"`);

			// Try with the PromptKit's chat API first
			try {
				logger.info(`[${this.defaultBotName}] Attempting to use PromptKit chat API...`);

				// Adding an additional try-catch specifically for the promptKit.chat call
				let response;
				try {
					response = await promptKit.chat(
						message.content,
						'geraldResponse',
						{
							temperature: 0.7,
							maxTokens: 150,
							providerType: LLMProviderType.OLLAMA
						}
					);
				} catch (promptKitError) {
					logger.error(`[${this.defaultBotName}] PromptKit chat failed: ${promptKitError instanceof Error ? promptKitError.message : String(promptKitError)}`);
					throw promptKitError; // Re-throw to be caught by outer try-catch
				}

				if (response && response.trim().length > 0) {
					logger.info(`[${this.defaultBotName}] Generated response with PromptKit: "${response.substring(0, 50)}..."`);
					return response;
				}

				logger.warn(`[${this.defaultBotName}] PromptKit returned empty response, using direct LLM approach...`);
			} catch (error) {
				const typedError = error instanceof Error ? error : new Error(String(error));
				logger.warn(`[${this.defaultBotName}] Error using PromptKit chat API, using direct LLM approach: ${typedError.message}`);
			}

			// Try direct LLM call as fallback
			try {
				logger.info(`[${this.defaultBotName}] Using direct LLM approach...`);

				if (!this._hasLLM || !this.llmManager) {
					logger.warn(`[${this.defaultBotName}] LLM Manager not available for direct approach, using fallback`);
					return this.getFallbackResponse(message.content);
				}

				// Safely try to use the LLM manager
				const llmManager = this.llmManager;
				const completion = await llmManager.createCompletion({
					model: 'llama2',
					provider: LLMProviderType.OLLAMA,
					messages: [
						{
							role: 'system',
							content: `You are Gerald, an insufferable know-it-all who loves to passive-aggressively "correct" people with information that sounds plausible but is often comically incorrect.
Respond to the user message with a condescending, pedantic correction. Your correction should:
1. Sound authoritative and smug
2. Contain factual inaccuracies that sound plausible to a non-expert
3. Use unnecessary jargon and overcomplicated language
4. Be passive-aggressive in tone (use phrases like "actually", "technically", "well if we're being precise")
5. Be relatively brief (1-3 sentences)
Your goal is to be annoying but funny with your corrections. Make up "facts" that sound believable but are wrong.`
						},
						{
							role: 'user',
							content: message.content
						}
					],
					temperature: 0.7,
					maxTokens: 150
				});

				if (completion?.content && completion.content.trim().length > 0) {
					logger.info(`[${this.defaultBotName}] Generated response with direct LLM: "${completion.content.substring(0, 50)}..."`);
					return completion.content;
				}

				logger.warn(`[${this.defaultBotName}] Direct LLM returned empty response, using fallback`);
				return this.getFallbackResponse(message.content);
			} catch (error) {
				logger.error(`[${this.defaultBotName}] Error using direct LLM: ${error instanceof Error ? error.message : String(error)}`);
				return this.getFallbackResponse(message.content);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error generating response: ${error instanceof Error ? error.message : String(error)}`);
			return this.getFallbackResponse(message.content);
		}
	}

	/**
	 * Get a fallback response for when LLM is unavailable
	 */
	private getFallbackResponse(_messageContent?: string): string {
		// Fallback hardcoded responses - more creative
		const fallbackStarts = [
			"Actually, that's not quite right.",
			"I feel obligated to point out that your statement contains several inaccuracies.",
			"Well, technically speaking, what you're saying is incorrect.",
			"Not to be that guy, but I should clarify something.",
			"As someone who knows a lot about this subject, I must explain that",
			"Umm, I hate to be the one to tell you this, but",
			"*Adjusts glasses* I believe you'll find that",
			"While I understand why you might think that, the scientific consensus is actually",
			"According to my extensive research on the subject,"
		];

		const fallbackMiddles = [
			" The correct understanding is",
			" Most experts in the field recognize that",
			" The truth of the matter is",
			" A common misconception, but",
			" If you had read the literature on this, you'd know"
		];

		const fallbackEnds = [
			" This is basic knowledge that most educated people understand.",
			" I'm surprised you weren't aware of this.",
			" Just thought you should know the facts.",
			" Not everyone knows this, so I'm happy to enlighten you.",
			" Hope that clears things up for you!"
		];

		// Build a creative response
		const start = fallbackStarts[Math.floor(Math.random() * fallbackStarts.length)];
		const middle = fallbackMiddles[Math.floor(Math.random() * fallbackMiddles.length)];
		const end = fallbackEnds[Math.floor(Math.random() * fallbackEnds.length)];

		return `${start}${middle}${end}`;
	}

	/**
	 * Uses LLM to determine if Gerald should respond to this message with a pedantic correction.
	 * Falls back to simple pattern matching if LLM is unavailable.
	 *
	 * @param messageContent - The message content to analyze
	 * @returns True if Gerald should respond, false otherwise
	 */
	private async shouldGeraldRespond(messageContent: string): Promise<boolean> {
		// Use forced debug mode to always respond
		if (this.FORCED_DEBUG) {
			logger.info(`[${this.defaultBotName}] FORCED_DEBUG is true, forcing response`);
			return true;
		}

		// First check if the message matches our pattern
		const patternMatch = GeraldBotConfig.Patterns.Trigger.test(messageContent);
		logger.info(`[${this.defaultBotName}] Pattern match: ${patternMatch}`);

		if (!patternMatch) {
			return false;
		}

		// Use the LLM to decide if we should respond
		if (this._hasLLM && this._personalitiesRegistered && this.llmManager) {
			try {
				// Use the promptKit to get a boolean decision
				logger.info(`[${this.defaultBotName}] Using PromptKit to decide if Gerald should respond...`);

				// Try with the personality-based approach
				try {
					let shouldRespond: boolean;

					try {
						shouldRespond = await promptKit.askBoolean(
							messageContent,
							`You determine if a message deserves a passive-aggressive, pedantic, know-it-all response.
You should respond with "yes" if the message contains any factual claims, expressions of opinion, or use of technical terms that someone insufferably pedantic might want to "correct".`,
							{
								temperature: 0.1,
								maxTokens: 5,
								providerType: LLMProviderType.OLLAMA
							}
						);
					} catch (promptKitError) {
						logger.error(`[${this.defaultBotName}] PromptKit askBoolean failed: ${promptKitError instanceof Error ? promptKitError.message : String(promptKitError)}`);
						// Fall through to direct LLM approach below
						throw promptKitError; // Re-throw to be caught by next try-catch
					}

					logger.info(`[${this.defaultBotName}] PromptKit decision result: ${shouldRespond}`);
					return shouldRespond;
				} catch (error) {
					// If the personality approach fails, try with direct LLM
					logger.warn(`[${this.defaultBotName}] Error using PromptKit askBoolean, trying with direct LLM: ${error instanceof Error ? error.message : String(error)}`);

					const llmManager = this.llmManager;
					const completion = await llmManager.createCompletion({
						model: 'llama2',
						provider: LLMProviderType.OLLAMA,
						messages: [
							{
								role: 'system',
								content: `You determine if a message deserves a passive-aggressive, pedantic, know-it-all response.
You should respond with "yes" if the message contains any factual claims, expressions of opinion, or use of technical terms that someone insufferably pedantic might want to "correct".
Respond only with "yes" or "no", nothing else.`
							},
							{
								role: 'user',
								content: messageContent
							}
						],
						temperature: 0.1,
						maxTokens: 5
					});

					const responseText = completion?.content?.trim().toLowerCase() || '';
					const shouldRespond = responseText.includes('yes') || responseText === 'true' || responseText === 'correct';
					logger.info(`[${this.defaultBotName}] Direct LLM decision result: "${responseText}" => ${shouldRespond}`);
					return shouldRespond;
				}
			} catch (error) {
				logger.error(`[${this.defaultBotName}] Error using LLM for decision: ${error instanceof Error ? error.message : String(error)}`);

				// Fallback to probability-based decision
				const shouldRespond = Math.random() < GeraldBotConfig.Responses.TriggerProbability;
				logger.info(`[${this.defaultBotName}] Falling back to random probability: ${shouldRespond}`);
				return shouldRespond;
			}
		} else {
			logger.warn(`[${this.defaultBotName}] LLM or personalities not available, using fallback method`);

			// Fallback to probability-based response
			const shouldRespond = Math.random() < GeraldBotConfig.Responses.TriggerProbability;
			logger.info(`[${this.defaultBotName}] Using random probability: ${shouldRespond}`);
			return shouldRespond;
		}
	}
}
