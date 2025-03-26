import { Message, TextChannel } from 'discord.js';
import userId from '../../../discord/userId';
import { isDebugMode } from '../../../environment';
import { getDiscordService, getLLMManager } from '../../../services/bootstrap';
import { LLMProviderType } from '../../../services/llm/llmFactory';
import { PromptRegistry, PromptType } from '../../../services/llm/promptManager';
import { logger } from '../../../services/logger';
import { PerformanceTimer, TimeUnit, formatRelativeTime, isOlderThan } from '../../../utils/time';
import { BotIdentity } from '../../types/botIdentity';
import { CovaBotConfig } from '../config/covaBotConfig';
import ReplyBot from '../replyBot';

// Create performance timer for CovaBot operations
const perfTimer = PerformanceTimer.getInstance();

// Strategy interfaces
interface ResponseConditionStrategy {
	shouldRespond(message: Message, context: MessageContext): Promise<boolean>;
}

interface ResponseGenerationStrategy {
	generateResponse(message: Message): Promise<string>;
}

interface CacheStrategy {
	getCachedDecision(key: string): { decision: boolean; timestamp: Date } | undefined;
	cacheDecision(key: string, decision: boolean): void;
	cleanup(): void;
}

// Context object for decision making
interface MessageContext {
	inConversation: boolean;
	containsCova: boolean;
	isDirectMention: boolean;
	lastResponseTime?: Date;
}

// Implementation of cache strategy
class TimeBasedDecisionCache implements CacheStrategy {
	private cache: Map<string, { decision: boolean; timestamp: Date }> = new Map();
	private readonly botName: string;

	constructor(botName: string) {
		this.botName = botName;
	}

	getCachedDecision(key: string): { decision: boolean; timestamp: Date } | undefined {
		const cachedDecision = this.cache.get(key);
		if (cachedDecision && !isOlderThan(cachedDecision.timestamp, 30, TimeUnit.SECOND)) {
			logger.debug(`[${this.botName}] Using cached decision from ${formatRelativeTime(cachedDecision.timestamp)}: ${cachedDecision.decision}`);
			return cachedDecision;
		}
		return undefined;
	}

	cacheDecision(key: string, decision: boolean): void {
		this.cache.set(key, {
			decision,
			timestamp: new Date()
		});

		// Cleanup old cache entries periodically
		if (this.cache.size > 20) {
			this.cleanup();
		}
	}

	cleanup(): void {
		const now = new Date();
		let cleanupCount = 0;

		// Remove entries older than 2 minutes
		for (const [cacheKey, cacheEntry] of this.cache.entries()) {
			if (isOlderThan(cacheEntry.timestamp, 2, TimeUnit.MINUTE, now)) {
				this.cache.delete(cacheKey);
				cleanupCount++;
			}
		}

		if (cleanupCount > 0) {
			logger.debug(`[${this.botName}] Cleaned up ${cleanupCount} expired decision cache entries, ${this.cache.size} remaining`);
		}
	}
}

// Implementation of conversation tracking
class ConversationTracker {
	private recentResponses: Map<string, Date> = new Map();
	private readonly botName: string;

	constructor(botName: string) {
		this.botName = botName;
	}

	isInConversation(channelId: string): boolean {
		const lastResponseTime = this.recentResponses.get(channelId);
		return lastResponseTime ? !isOlderThan(lastResponseTime, 60, TimeUnit.SECOND) : false;
	}

	getLastResponseTime(channelId: string): Date | undefined {
		return this.recentResponses.get(channelId);
	}

	updateRecentResponses(channelId: string): void {
		const now = new Date();
		logger.debug(`[${this.botName}] Adding channel ${channelId} to recent responses at ${now.toISOString()}`);

		// Store current timestamp for this channel
		this.recentResponses.set(channelId, now);

		// Clean up old entries periodically
		this.cleanupOldResponses();
	}

	private cleanupOldResponses(): void {
		// Only run cleanup if we have enough entries to be worth checking
		if (this.recentResponses.size > 10) {
			const now = new Date();
			let cleanupCount = 0;

			// Remove entries older than 2 minutes
			for (const [channelId, timestamp] of this.recentResponses.entries()) {
				if (isOlderThan(timestamp, 2, TimeUnit.MINUTE, now)) {
					this.recentResponses.delete(channelId);
					cleanupCount++;
					logger.debug(`[${this.botName}] Removed channel ${channelId} from recent responses - ${formatRelativeTime(timestamp, now)}`);
				}
			}

			if (cleanupCount > 0) {
				logger.debug(`[${this.botName}] Cleaned up ${cleanupCount} expired channel entries, ${this.recentResponses.size} remaining`);
			}
		}
	}
}

// Strategy for direct mention handling
class DirectMentionStrategy implements ResponseConditionStrategy {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async shouldRespond(message: Message, context: MessageContext): Promise<boolean> {
		return context.isDirectMention;
	}
}

// Strategy for LLM-based response decision
class LLMDecisionStrategy implements ResponseConditionStrategy {
	private cache: CacheStrategy;
	private readonly botName: string;

	constructor(botName: string, cache: CacheStrategy) {
		this.botName = botName;
		this.cache = cache;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async shouldRespond(message: Message, context: MessageContext): Promise<boolean> {
		// Use performance timer for this operation
		return await PerformanceTimer.time('shouldRespondToMessage', async () => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const _startTime = Date.now();
			logger.debug(`[${this.botName}] ========== SHOULD RESPOND EVALUATION START ==========`);
			logger.debug(`[${this.botName}] Evaluating whether to respond to: "${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}"`);
			logger.debug(`[${this.botName}] Context: inConversation=${context.inConversation}, containsCova=${context.containsCova}`);

			try {
				// Create a cache key from the content and message context
				const normalizedContent = message.content.toLowerCase().trim().substring(0, 50);
				const cacheKey = `${normalizedContent}|${context.inConversation}|${context.containsCova}`;

				// Check cache first
				const cachedDecision = this.cache.getCachedDecision(cacheKey);
				if (cachedDecision) {
					return cachedDecision.decision;
				}

				// Create prompt for LLM with context about the message
				const mentionContext = context.containsCova
					? "The message contains the word 'cova' or similar."
					: "The message does not contain 'cova' or similar.";

				const userPrompt = `Message: "${message.content}"
${context.inConversation ? "Part of an ongoing conversation where Cova recently replied." : "New conversation Cova hasn't joined yet."}
${mentionContext}

Using the Response Decision System, should Cova respond to this message?`;

				logger.debug(`[${this.botName}] Prompt for LLM decision:\n${userPrompt}`);
				logger.debug(`[${this.botName}] Sending LLM request for response decision`);

				let llmResponse;
				try {
					const llmStartTime = Date.now();
					llmResponse = await getLLMManager().createCompletion({
						model: process.env.OLLAMA_DEFAULT_MODEL || 'gemma3:4b',
						messages: [
							{ role: "system", content: CovaBotConfig.DecisionPrompt },
							{ role: "user", content: userPrompt },
						],
						temperature: 0.1,
						maxTokens: 5
					});
					logger.debug(`[${this.botName}] LLM response received in ${Date.now() - llmStartTime}ms`);
				} catch (llmError) {
					logger.warn(`[${this.botName}] LLM service error: ${llmError instanceof Error ? llmError.message : String(llmError)}`);
					throw new Error('LLM service unavailable');
				}

				const rawResponse = llmResponse.content;
				const response = rawResponse.toUpperCase();
				logger.debug(`[${this.botName}] Raw LLM response: "${rawResponse}"`);
				logger.debug(`[${this.botName}] Normalized response: "${response}"`);

				// Determine probability based on the response
				let probability = 0;
				let probabilitySource = "";
				if (response.includes("YES")) {
					probability = 0.8;
					probabilitySource = "YES response";
				} else if (response.includes("LIKELY")) {
					probability = 0.5;
					probabilitySource = "LIKELY response";
				} else if (response.includes("UNLIKELY")) {
					probability = 0.15;
					probabilitySource = "UNLIKELY response";
				} else {
					probability = 0.05;
					probabilitySource = "NO/unrecognized response";
				}

				// Apply context-based modifiers
				if (context.containsCova) probability *= 1.2;
				if (context.inConversation) probability *= 1.1;

				// Cap at 0.9
				probability = Math.min(probability, 0.9);

				logger.debug(`[${this.botName}] Assigned probability ${probability} based on ${probabilitySource}`);
				logger.debug(`[${this.botName}] Factors: containsCova=${context.containsCova}, inConversation=${context.inConversation}`);

				// Apply randomization to avoid predictability
				const random = Math.random();
				const shouldRespond = random < probability;
				logger.debug(`[${this.botName}] Random roll: ${random} vs threshold ${probability} = ${shouldRespond ? "RESPOND" : "DON'T RESPOND"}`);

				// Cache the decision for future similar messages
				this.cache.cacheDecision(cacheKey, shouldRespond);

				logger.debug(`[${this.botName}] Total evaluation time: ${Date.now() - _startTime}ms`);
				logger.debug(`[${this.botName}] ========== SHOULD RESPOND EVALUATION END ==========`);
				return shouldRespond;
			} catch (error) {
				logger.error(`[${this.botName}] Error deciding whether to respond:`, error as Error);
				logger.debug(`[${this.botName}] Error stack: ${(error as Error).stack}`);

				// Fall back to simple randomization with context-based probabilities
				const baseRate = context.containsCova ? 0.2 : (context.inConversation ? 0.1 : CovaBotConfig.ResponseRate);
				const random = Math.random();
				const shouldRespond = random < baseRate;
				logger.debug(`[${this.botName}] Fallback random roll: ${random} vs threshold ${baseRate} = ${shouldRespond ? "RESPOND" : "DON'T RESPOND"}`);

				logger.debug(`[${this.botName}] Total evaluation time (with error): ${Date.now() - _startTime}ms`);
				logger.debug(`[${this.botName}] ========== SHOULD RESPOND EVALUATION END (ERROR) ==========`);
				return shouldRespond;
			}
		});
	}
}

// Strategy for LLM-based response generation
class LLMResponseStrategy implements ResponseGenerationStrategy {
	private readonly botName: string;

	constructor(botName: string) {
		this.botName = botName;
	}

	async generateResponse(message: Message): Promise<string> {
		return await PerformanceTimer.time('generateAndSendResponse', async () => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const _startTime = Date.now();
			logger.debug(`[${this.botName}] ========== GENERATE RESPONSE START ==========`);
			logger.debug(`[${this.botName}] Generating response for message: "${message.content}"`);

			try {
				logger.debug(`[${this.botName}] Sending request to LLM for Cova emulation`);
				const llmStartTime = Date.now();
				let response;

				try {
					response = await getLLMManager().createPromptCompletion(
						PromptType.COVA_EMULATOR,
						message.content,
						{
							temperature: 0.7,
							maxTokens: 150,
							providerType: LLMProviderType.OLLAMA,
							fallbackToDefault: true
						}
					);
					logger.debug(`[${this.botName}] LLM response received in ${Date.now() - llmStartTime}ms`);
				} catch (llmError) {
					logger.warn(`[${this.botName}] LLM service error: ${llmError instanceof Error ? llmError.message : String(llmError)}`);
					// If LLM fails, use one of these fallback responses
					const fallbackResponses = [
						"Yeah, that's pretty cool.",
						"Interesting.",
						"Hmm, I see what you mean.",
						"I'm not sure about that.",
						"That's wild.",
						"Neat.",
						"lol",
						"👀",
						"Tell me more about that."
					];
					response = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
					logger.debug(`[${this.botName}] Using fallback response: "${response}"`);
				}

				logger.debug(`[${this.botName}] Raw LLM response: "${response}"`);

				if (!response || response.trim() === '') {
					logger.debug(`[${this.botName}] Received empty response from LLM, using fallback response`);
					response = "Yeah, that's pretty cool.";
				}

				logger.debug(`[${this.botName}] Final response to generate: "${response}"`);
				logger.debug(`[${this.botName}] ========== GENERATE RESPONSE END ==========`);
				return response;
			} catch (error) {
				logger.error(`[${this.botName}] Error generating response:`, error as Error);
				return "Hmm, interesting.";
			}
		});
	}
}

// Main CovaBot implementation using the strategies
export default class CovaBot extends ReplyBot {
	private _lastProcessedMessageId: string = '';
	private readonly conversationTracker: ConversationTracker;
	private readonly decisionCache: CacheStrategy;
	private readonly responseConditionStrategies: ResponseConditionStrategy[];
	private readonly responseGenerationStrategy: ResponseGenerationStrategy;

	constructor() {
		super();
		perfTimer.mark('covabot-init');
		logger.debug(`[${this.defaultBotName}] Initializing CovaBot with strategy pattern`);

		// Set up conversation tracking
		this.conversationTracker = new ConversationTracker(this.defaultBotName);

		// Set up the decision cache
		this.decisionCache = new TimeBasedDecisionCache(this.defaultBotName);

		// Set up response condition strategies
		this.responseConditionStrategies = [
			new DirectMentionStrategy(),
			new LLMDecisionStrategy(this.defaultBotName, this.decisionCache)
		];

		// Set up response generation strategy
		this.responseGenerationStrategy = new LLMResponseStrategy(this.defaultBotName);

		// Register the Cova Emulator prompt
		PromptRegistry.registerPrompt(PromptType.COVA_EMULATOR, {
			systemContent: CovaBotConfig.EmulatorPrompt,
			formatUserMessage: (message: string): string => message,
			defaultTemperature: 0.7,
			defaultMaxTokens: 150
		});

		// Initialize periodic stats logging
		this.logPeriodicStats();

		const initTime = perfTimer.measure('covabot-init');
		logger.debug(`[${this.defaultBotName}] Initialization completed in ${initTime}ms`);
	}

	public override get botIdentity(): BotIdentity {
		try {
			return getDiscordService().getBotProfile(userId.Cova);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error getting bot identity:`, error as Error);
			return {
				avatarUrl: CovaBotConfig.Avatars.Default,
				botName: CovaBotConfig.Name
			};
		}
	}

	protected shouldSkipMessage(message: Message): boolean {
		const authorId = message.author.id;
		const authorUsername = message.author.username;
		const channelId = message.channelId;
		const channelName = message.channel.type === 0 ? (message.channel as TextChannel).name : 'DM/unknown';
		const messageContent = message.content.toLowerCase();
		const mentionsCova = messageContent.includes('cova');

		logger.debug(`[${this.defaultBotName}] shouldSkipMessage: Evaluating message from ${authorUsername} (${authorId}) in ${channelName} (${channelId})`);
		logger.debug(`[${this.defaultBotName}] shouldSkipMessage: Message content: "${message.content}"`);
		logger.debug(`[${this.defaultBotName}] shouldSkipMessage: Contains 'cova': ${mentionsCova}`);

		// Skip base class conditions
		if (super.shouldSkipMessage(message)) {
			logger.debug(`[${this.defaultBotName}] shouldSkipMessage: Base class says to skip message from ${authorUsername}`);
			if (mentionsCova) {
				logger.debug(`[${this.defaultBotName}] ❌ SKIPPING MESSAGE CONTAINING 'COVA' (base class rule): "${message.content}"`);
			}
			return true;
		}

		const isFromCova = authorId === userId.Cova;
		// In debug mode, ONLY respond to Cova's messages
		if (isDebugMode()) {
			if (!isFromCova) {
				return true;
			}
		}

		if (isFromCova) {
			return true;
		}

		return false;
	}

	public async processMessage(message: Message): Promise<void> {
		// Check for performance stats command
		if (message.content.toLowerCase() === '!covabot-stats' && (message.author.id === userId.Cova || isDebugMode())) {
			await this.sendPerformanceStats(message.channel as TextChannel);
			return;
		}

		// Use the performance timer for the entire message processing
		perfTimer.mark(`process-message-${message.id}`);

		// Always log every message the bot sees, for debugging purposes
		const authorId = message.author.id;
		const authorUsername = message.author.username;
		const channelId = message.channelId;
		const channelName = message.channel.type === 0 ? (message.channel as TextChannel).name : 'DM/unknown';
		const messageId = message.id;
		const contentPreview = message.content.substring(0, 100) + (message.content.length > 100 ? '...' : '');
		const messageContent = message.content.toLowerCase();
		const containsCova = messageContent.includes('cova');

		// Global log for ALL messages, regardless of processing
		logger.debug(`[${this.defaultBotName}] 👁️ SAW MESSAGE: ${messageId} from ${authorUsername} (${authorId}) in ${channelName} (${channelId})`);
		if (containsCova) {
			logger.debug(`[${this.defaultBotName}] 🔍 MESSAGE CONTAINS 'COVA': "${message.content}"`);
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const _startTime = Date.now();
		logger.debug(`[${this.defaultBotName}] ========== PROCESS MESSAGE START ==========`);
		logger.debug(`[${this.defaultBotName}] Processing message ${messageId} from ${authorUsername} (${authorId})`);
		logger.debug(`[${this.defaultBotName}] Channel: ${channelName} (${channelId})`);
		logger.debug(`[${this.defaultBotName}] Content: "${contentPreview}"`);
		logger.debug(`[${this.defaultBotName}] Contains 'cova': ${containsCova}`);

		try {
			// Skip duplicate processing
			if (message.id === this._lastProcessedMessageId) {
				logger.debug(`[${this.defaultBotName}] Skipping duplicate processing of message ${messageId}`);
				return;
			}

			logger.debug(`[${this.defaultBotName}] Setting last processed message ID: ${messageId}`);
			this._lastProcessedMessageId = message.id;

			// Check for direct mentions
			const isDirectMention = message.mentions.has(message.client.user?.id || '');
			logger.debug(`[${this.defaultBotName}] Direct @ mention (Discord API): ${isDirectMention}`);

			// Create context for response decision strategies
			const context: MessageContext = {
				inConversation: this.conversationTracker.isInConversation(channelId),
				containsCova,
				isDirectMention,
				lastResponseTime: this.conversationTracker.getLastResponseTime(channelId)
			};

			logger.debug(`[${this.defaultBotName}] In active conversation: ${context.inConversation}`);
			if (context.inConversation) {
				logger.debug(`[${this.defaultBotName}] Recently active in channel ${channelName} (${channelId})`);
			}

			// Evaluate each response condition strategy in order
			let shouldRespond = false;
			for (const strategy of this.responseConditionStrategies) {
				const result = await strategy.shouldRespond(message, context);
				if (result) {
					shouldRespond = true;
					break;
				}
			}

			if (shouldRespond) {
				logger.debug(`[${this.defaultBotName}] Decision: Will respond to this message`);

				// Generate response using strategy
				const responseStart = Date.now();
				const response = await this.responseGenerationStrategy.generateResponse(message);

				// Send the response
				logger.debug(`[${this.defaultBotName}] Sending reply via ReplyBot.sendReply`);
				await this.sendReply(message.channel as TextChannel, response);
				logger.debug(`[${this.defaultBotName}] Response generated and sent in ${Date.now() - responseStart}ms`);

				// Update conversation tracking
				this.conversationTracker.updateRecentResponses(channelId);
				logger.debug(`[${this.defaultBotName}] Updated recent responses for channel ${channelId}`);
			} else {
				logger.debug(`[${this.defaultBotName}] Decision: Will NOT respond to this message`);
			}

			// Add performance timing at the end
			const processingTime = perfTimer.measure(`process-message-${message.id}`);
			logger.debug(`[${this.defaultBotName}] Total message processing time: ${processingTime}ms`);
			logger.debug(`[${this.defaultBotName}] ========== PROCESS MESSAGE END ==========`);
		} catch (error) {
			// Ensure we still capture timing even if there's an error
			perfTimer.measure(`process-message-${message.id}`);
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			logger.debug(`[${this.defaultBotName}] Error stack: ${(error as Error).stack}`);
			logger.debug(`[${this.defaultBotName}] ========== PROCESS MESSAGE END (ERROR) ==========`);
		}
	}

	/**
   * Send performance statistics to a channel
   */
	private async sendPerformanceStats(channel: TextChannel): Promise<void> {
		const stats = perfTimer.getStatsString();
		logger.debug(`[${this.defaultBotName}] Sending performance stats to ${channel.name} (${channel.id})`);
		logger.debug(`[${this.defaultBotName}] Stats: ${stats}`);

		await this.sendReply(channel, `\`\`\`\n${stats}\n\`\`\``);
		logger.debug(`[${this.defaultBotName}] Performance stats sent`);
	}

	// Every hour, log performance stats
	private logPeriodicStats(): void {
		setInterval(() => {
			const stats = perfTimer.getStatsString();
			logger.info(`[${this.defaultBotName}] Hourly performance stats:\n${stats}`);

			// Reset after logging to avoid memory growth
			if (perfTimer.getStats()['process-message-*']?.count > 1000) {
				logger.info(`[${this.defaultBotName}] Resetting performance stats after reaching threshold`);
				perfTimer.reset();
			}
		}, TimeUnit.HOUR);
	}
}