import { Message, TextChannel } from 'discord.js';
import userId from '../../../discord/userId';
import { isDebugMode } from '../../../environment';
import { getDiscordClient, getDiscordService, getLLMManager } from '../../../services/bootstrap';
import { LLMProviderType } from '../../../services/llm/llmFactory';
import { PromptType } from '../../../services/llm/promptManager';
import { logger } from '../../../services/logger';
import { PerformanceTimer, TimeUnit, formatRelativeTime, isOlderThan } from '../../../utils/time';
import { BotIdentity } from '../../types/botIdentity';
import { CovaBotConfig } from '../config/covaBotConfig';
import ReplyBot from '../replyBot';

// Create performance timer for CovaBot operations
const perfTimer = PerformanceTimer.getInstance();

// Decision prompt for CovaBot response
const covaResponseDecisionPrompt = `You are helping determine if a Discord message should get a response from a bot.
Answer with ONE of these options only: YES, LIKELY, UNLIKELY, or NO.
Respond to messages that:
- Ask the bot a direct question
- Explicitly invite the bot to comment
- Discuss topics the bot would have interesting input on
- Continue a conversation the bot is already in
Do NOT respond to:
- Messages that aren't looking for a response
- Commands for other bots
- Technical discussions or code that don't need the bot's input
- Messages that don't seem to be seeking further conversation`;

export default class CovaBot extends ReplyBot {
	private _botIdentity: BotIdentity;
	private _lastProcessedMessageId: string = '';
	// Store timestamps of recent responses by channel ID
	private _recentResponses: Map<string, Date> = new Map();
	// LLM decision cache to avoid repeated similar requests
	private _decisionCache: Map<string, { decision: boolean; timestamp: Date }> = new Map();

	constructor() {
		super();
		perfTimer.mark('covabot-init');
		logger.debug(`[${this.defaultBotName}] Initializing CovaBot with extensive logging`);
		console.log(`[${this.defaultBotName}] Initializing CovaBot with extensive logging`);

		// Initialize with default values
		this._botIdentity = {
			botName: CovaBotConfig.Name,
			avatarUrl: CovaBotConfig.Avatars.Default
		};
		logger.debug(`[${this.defaultBotName}] Initial bot identity: ${JSON.stringify(this._botIdentity)}`);

		// Very explicit debug mode check for verification
		if (isDebugMode()) {
			this.updateBotIdentity();

			logger.warn(`[${this.defaultBotName}] DEBUG MODE IS ACTIVE - WILL ONLY RESPOND TO COVA MESSAGES`);
			console.log(`[${this.defaultBotName}] DEBUG MODE IS ACTIVE - WILL ONLY RESPOND TO COVA MESSAGES`);
		} else {
			logger.warn(`[${this.defaultBotName}] Normal mode - will ignore messages from Cova`);
			console.log(`[${this.defaultBotName}] Normal mode - will ignore messages from Cova`);
		}

		logger.debug(`[${this.defaultBotName}] Configuration loaded: ResponseRate=${CovaBotConfig.ResponseRate}, IgnoreUsers=${JSON.stringify(CovaBotConfig.IgnoreUsers)}`);
		logger.debug(`[${this.defaultBotName}] Patterns: Mention=${CovaBotConfig.Patterns.Mention}, Question=${CovaBotConfig.Patterns.Question}, AtMention=${CovaBotConfig.Patterns.AtMention}`);

		// Initialize periodic stats logging
		this.logPeriodicStats();

		const initTime = perfTimer.measure('covabot-init');
		logger.debug(`[${this.defaultBotName}] Initialization completed in ${initTime}ms`);
	}

	public get botIdentity(): BotIdentity {
		logger.debug(`[${this.defaultBotName}] Getting bot identity`);
		// Update identity before returning
		this.updateBotIdentity();
		logger.debug(`[${this.defaultBotName}] Returning bot identity: ${JSON.stringify(this._botIdentity)}`);
		return this._botIdentity;
	}

	private updateBotIdentity(): void {
		try {
			logger.debug(`[${this.defaultBotName}] Attempting to update bot identity from Discord service...`);
			const previousIdentity = JSON.stringify(this._botIdentity);

			try {
				// Try to get Cova's identity
				this._botIdentity = getDiscordService().getMemberAsBotIdentity(userId.Cova);
				logger.debug(`[${this.defaultBotName}] Bot identity updated: ${previousIdentity} -> ${JSON.stringify(this._botIdentity)}`);
			} catch (idError) {
				// If we can't find the member during initialization, set up a one-time retry when the client is ready
				logger.warn(`[${this.defaultBotName}] Failed to update bot identity: ${idError instanceof Error ? idError.message : String(idError)}`);
				logger.debug(`[${this.defaultBotName}] Using fallback identity: ${JSON.stringify(this._botIdentity)}`);

				// Set up a one-time retry when Discord client is fully ready and connected
				const client = getDiscordClient();

				// If client is already ready, set a timeout to try again in a few seconds
				if (client.isReady()) {
					logger.debug(`[${this.defaultBotName}] Client is ready, scheduling identity update in 5 seconds`);
					setTimeout(() => {
						try {
							logger.debug(`[${this.defaultBotName}] Retry: Attempting to update bot identity...`);
							this._botIdentity = getDiscordService().getMemberAsBotIdentity(userId.Cova);
							logger.debug(`[${this.defaultBotName}] Retry successful, bot identity updated: ${JSON.stringify(this._botIdentity)}`);
						} catch (retryError) {
							logger.warn(`[${this.defaultBotName}] Retry failed to update bot identity: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
							logger.debug(`[${this.defaultBotName}] Continuing with fallback identity: ${JSON.stringify(this._botIdentity)}`);
						}
					}, 5000);
				} else {
					// If client isn't ready yet, wait for the ready event
					logger.debug(`[${this.defaultBotName}] Client not ready, setting up identity update on ready event`);
					client.once('ready', () => {
						setTimeout(() => {
							try {
								logger.debug(`[${this.defaultBotName}] Client now ready, attempting to update bot identity...`);
								this._botIdentity = getDiscordService().getMemberAsBotIdentity(userId.Cova);
								logger.debug(`[${this.defaultBotName}] Client ready event: bot identity updated: ${JSON.stringify(this._botIdentity)}`);
							} catch (readyError) {
								logger.warn(`[${this.defaultBotName}] Ready event failed to update bot identity: ${readyError instanceof Error ? readyError.message : String(readyError)}`);
								logger.debug(`[${this.defaultBotName}] Continuing with fallback identity: ${JSON.stringify(this._botIdentity)}`);
							}
						}, 2000); // Wait a bit after ready event to ensure guilds are loaded
					});
				}
			}
		} catch (error) {
			// Silently keep using existing identity
			logger.warn(`[${this.defaultBotName}] Error in updateBotIdentity: ${error instanceof Error ? error.message : String(error)}`);
			logger.debug(`[${this.defaultBotName}] Continuing with existing identity: ${JSON.stringify(this._botIdentity)}`);
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

		const startTime = Date.now();
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

			// Parse message for different types of mentions
			const isDirectMention = message.mentions.has(message.client.user?.id || '');
			const isRawAtMention = CovaBotConfig.Patterns.AtMention?.test(message.content) || false;

			// Get Cova's current nickname from botIdentity
			const covaNickname = this._botIdentity.botName;

			// Create a dynamic pattern for the current nickname (case-insensitive)
			const dynamicNamePattern = new RegExp(`\\b${covaNickname}\\b`, 'i');

			// Create a dynamic question pattern with the current nickname
			const questionIndicators = '\\?|what|how|why|when|where|who|which|is|are|can|could|should|would|will';
			const dynamicQuestionPattern = new RegExp(`\\b${covaNickname}\\b.*(${questionIndicators})`, 'i');

			// Check for mentions using both the config pattern and the dynamic nickname pattern
			const isNameMention = CovaBotConfig.Patterns.Mention.test(message.content) || dynamicNamePattern.test(message.content);
			const isQuestion = CovaBotConfig.Patterns.Question.test(message.content) || dynamicQuestionPattern.test(message.content);

			// Check if this is a reply to Cova or CovaBot's message
			const isReplyToCova = message.reference?.messageId &&
				message.channel.messages.cache.get(message.reference.messageId)?.author.id === userId.Cova;
			const isReplyToCovaBot = message.reference?.messageId &&
				message.channel.messages.cache.get(message.reference.messageId)?.author.id === message.client.user?.id;
			const isReplyToEither = isReplyToCova || isReplyToCovaBot;

			// Log all mention details
			logger.debug(`[${this.defaultBotName}] FULL Message content: "${message.content}"`);
			logger.debug(`[${this.defaultBotName}] Mention detection results:`);
			logger.debug(`[${this.defaultBotName}]   - Direct @ mention (Discord API): ${isDirectMention}`);
			logger.debug(`[${this.defaultBotName}]   - Raw @ mention (regex): ${isRawAtMention}`);
			logger.debug(`[${this.defaultBotName}]   - Current nickname: ${covaNickname}`);
			logger.debug(`[${this.defaultBotName}]   - Dynamic nickname match: ${dynamicNamePattern.test(message.content)}`);
			logger.debug(`[${this.defaultBotName}]   - Config pattern match: ${CovaBotConfig.Patterns.Mention.test(message.content)}`);
			logger.debug(`[${this.defaultBotName}]   - Name mention (either pattern): ${isNameMention}`);
			logger.debug(`[${this.defaultBotName}]   - Dynamic question match: ${dynamicQuestionPattern.test(message.content)}`);
			logger.debug(`[${this.defaultBotName}]   - Config question match: ${CovaBotConfig.Patterns.Question.test(message.content)}`);
			logger.debug(`[${this.defaultBotName}]   - Question for Cova (either pattern): ${isQuestion}`);
			logger.debug(`[${this.defaultBotName}]   - Reply to Cova: ${isReplyToCova}`);
			logger.debug(`[${this.defaultBotName}]   - Reply to CovaBot: ${isReplyToCovaBot}`);

			if (isNameMention) {
				const nameMatch = message.content.match(CovaBotConfig.Patterns.Mention);
				logger.debug(`[${this.defaultBotName}]   - Name match found: "${nameMatch?.[0] || 'unknown match'}"`);
			}

			if (isQuestion) {
				const questionMatch = message.content.match(CovaBotConfig.Patterns.Question);
				logger.debug(`[${this.defaultBotName}]   - Question match found: "${questionMatch?.[0] || 'unknown match'}"`);
			}

			// Check if we've recently replied in this channel (within last 60 seconds)
			const lastResponseTime = this._recentResponses.get(message.channelId);
			const inConversation = lastResponseTime ? !isOlderThan(lastResponseTime, 60, TimeUnit.SECOND) : false;
			logger.debug(`[${this.defaultBotName}] In active conversation: ${inConversation}`);
			if (inConversation) {
				logger.debug(`[${this.defaultBotName}] Recently active in channel ${channelName} (${channelId})`);
			}

			// Always respond to direct @ mentions with highest priority
			if (isDirectMention || isRawAtMention) {
				logger.debug(`[${this.defaultBotName}] @ mention detected, responding with highest priority`);
				const responseStart = Date.now();
				await this.generateAndSendResponse(message);
				logger.debug(`[${this.defaultBotName}] @ mention response generated and sent in ${Date.now() - responseStart}ms`);
				this.updateRecentResponses(message.channelId);
				logger.debug(`[${this.defaultBotName}] Updated recent responses for channel ${channelId}`);
				logger.debug(`[${this.defaultBotName}] Total @ mention processing time: ${Date.now() - startTime}ms`);
				logger.debug(`[${this.defaultBotName}] ========== PROCESS MESSAGE END (@ MENTION) ==========`);
				return;
			}

			// High priority for replies to Cova's or CovaBot's messages
			if (isReplyToEither) {
				logger.debug(`[${this.defaultBotName}] Reply to ${isReplyToCova ? 'Cova' : 'CovaBot'} detected, responding with high priority`);
				const responseStart = Date.now();
				await this.generateAndSendResponse(message);
				logger.debug(`[${this.defaultBotName}] Reply response generated and sent in ${Date.now() - responseStart}ms`);
				this.updateRecentResponses(message.channelId);
				logger.debug(`[${this.defaultBotName}] Updated recent responses for channel ${channelId}`);
				logger.debug(`[${this.defaultBotName}] Total reply processing time: ${Date.now() - startTime}ms`);
				logger.debug(`[${this.defaultBotName}] ========== PROCESS MESSAGE END (REPLY) ==========`);
				return;
			}

			// High priority for direct questions that include Cova's name
			if (isQuestion) {
				logger.debug(`[${this.defaultBotName}] Question directed at Cova detected, responding with high priority`);
				const responseStart = Date.now();
				await this.generateAndSendResponse(message);
				logger.debug(`[${this.defaultBotName}] Question response generated and sent in ${Date.now() - responseStart}ms`);
				this.updateRecentResponses(message.channelId);
				logger.debug(`[${this.defaultBotName}] Updated recent responses for channel ${channelId}`);
				logger.debug(`[${this.defaultBotName}] Total question processing time: ${Date.now() - startTime}ms`);
				logger.debug(`[${this.defaultBotName}] ========== PROCESS MESSAGE END (QUESTION) ==========`);
				return;
			}

			// For name mentions or other messages, use LLM to decide if it's worth responding
			logger.debug(`[${this.defaultBotName}] Invoking LLM decision for response worthiness`);
			const llmDecisionStart = Date.now();
			const shouldRespond = await this.shouldRespondToMessage(
				message.content,
				inConversation,
				isNameMention,
				Boolean(isReplyToEither),
				dynamicNamePattern
			);
			logger.debug(`[${this.defaultBotName}] LLM decision completed in ${Date.now() - llmDecisionStart}ms: shouldRespond=${shouldRespond}`);

			if (shouldRespond) {
				logger.debug(`[${this.defaultBotName}] LLM decided to respond to this message`);
				const responseStart = Date.now();
				await this.generateAndSendResponse(message);
				logger.debug(`[${this.defaultBotName}] Response generated and sent in ${Date.now() - responseStart}ms`);
				this.updateRecentResponses(message.channelId);
				logger.debug(`[${this.defaultBotName}] Updated recent responses for channel ${channelId}`);
			} else {
				logger.debug(`[${this.defaultBotName}] LLM decided not to respond to this message`);
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

	private updateRecentResponses(channelId: string): void {
		const now = new Date();
		logger.debug(`[${this.defaultBotName}] Adding channel ${channelId} to recent responses at ${now.toISOString()}`);

		// Store current timestamp for this channel
		this._recentResponses.set(channelId, now);

		// Clean up old entries every 10 minutes to prevent memory leaks
		// No need for immediate timeouts that can be missed if the process restarts
		this.cleanupOldResponses();
	}

	private cleanupOldResponses(): void {
		// Only run cleanup if we have enough entries to be worth checking
		if (this._recentResponses.size > 10) {
			const now = new Date();
			let cleanupCount = 0;

			// Remove entries older than 2 minutes
			for (const [channelId, timestamp] of this._recentResponses.entries()) {
				if (isOlderThan(timestamp, 2, TimeUnit.MINUTE, now)) {
					this._recentResponses.delete(channelId);
					cleanupCount++;
					logger.debug(`[${this.defaultBotName}] Removed channel ${channelId} from recent responses - ${formatRelativeTime(timestamp, now)}`);
				}
			}

			if (cleanupCount > 0) {
				logger.debug(`[${this.defaultBotName}] Cleaned up ${cleanupCount} expired channel entries, ${this._recentResponses.size} remaining`);
			}
		}
	}

	private async shouldRespondToMessage(content: string, inConversation: boolean, isNameMention: boolean = false, isReplyToEither: boolean = false, dynamicNamePattern: RegExp): Promise<boolean> {
		// Use performance timer for this operation
		return await PerformanceTimer.time('shouldRespondToMessage', async () => {
			const startTime = Date.now();
			logger.debug(`[${this.defaultBotName}] ========== SHOULD RESPOND EVALUATION START ==========`);
			logger.debug(`[${this.defaultBotName}] Evaluating whether to respond to: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);
			logger.debug(`[${this.defaultBotName}] Context: inConversation=${inConversation}, isNameMention=${isNameMention}, isReplyToEither=${isReplyToEither}`);

			try {
				// Create a cache key from the content and context
				// Normalize content to reduce redundant cache entries for similar messages
				const normalizedContent = content.toLowerCase().trim().substring(0, 50);
				const cacheKey = `${normalizedContent}|${inConversation}|${isNameMention}|${isReplyToEither}|${dynamicNamePattern.test(content)}`;

				// Check cache first
				const cachedDecision = this._decisionCache.get(cacheKey);
				if (cachedDecision && !isOlderThan(cachedDecision.timestamp, 30, TimeUnit.SECOND)) {
					logger.debug(`[${this.defaultBotName}] Using cached decision from ${formatRelativeTime(cachedDecision.timestamp)}: ${cachedDecision.decision}`);
					return cachedDecision.decision;
				}

				// Add context about mentions to help the LLM make better decisions
				let mentionContext = "";
				if (isReplyToEither) {
					mentionContext = "The message is a reply to Cova or CovaBot.";
				} else if (isNameMention) {
					// Include the current nickname information
					if (dynamicNamePattern.test(content)) {
						mentionContext = `The message mentions Cova by current nickname "${this._botIdentity.botName}".`;
					} else {
						mentionContext = "The message mentions Cova by a known name (not with @).";
					}
				} else {
					mentionContext = "The message does not directly mention Cova.";
				}

				const userPrompt = `Message: "${content}"
${inConversation ? "Part of an ongoing conversation where Cova recently replied." : "New conversation Cova hasn't joined yet."}
${mentionContext}`;

				logger.debug(`[${this.defaultBotName}] Prompt for LLM decision:\n${userPrompt}`);
				logger.debug(`[${this.defaultBotName}] System prompt length: ${covaResponseDecisionPrompt.length} characters`);
				logger.debug(`[${this.defaultBotName}] User prompt length: ${userPrompt.length} characters`);

				// Use a fast, small model for quick decision
				logger.debug(`[${this.defaultBotName}] Sending LLM request for response decision`);

				let llmResponse;
				try {
					const llmStartTime = Date.now();
					llmResponse = await getLLMManager().createCompletion({
						model: process.env.OLLAMA_DEFAULT_MODEL || 'gemma3:4b',
						messages: [
							{ role: "system", content: covaResponseDecisionPrompt },
							{ role: "user", content: userPrompt }
						],
						temperature: 0.1,
						maxTokens: 5
					});
					logger.debug(`[${this.defaultBotName}] LLM response received in ${Date.now() - llmStartTime}ms`);
				} catch (llmError) {
					logger.warn(`[${this.defaultBotName}] LLM service error: ${llmError instanceof Error ? llmError.message : String(llmError)}`);
					throw new Error('LLM service unavailable');
				}

				const rawResponse = llmResponse.content;
				const response = rawResponse.toUpperCase();
				logger.debug(`[${this.defaultBotName}] Raw LLM response: "${rawResponse}"`);
				logger.debug(`[${this.defaultBotName}] Normalized response: "${response}"`);

				// Determine probability based on the response, with higher probabilities for replies and name mentions
				let probability = 0;
				let probabilitySource = "";
				if (response.includes("YES")) {
					probability = isReplyToEither ? 0.8 : (isNameMention ? 0.7 : (inConversation ? 0.6 : 0.5));
					probabilitySource = "YES response";
				} else if (response.includes("LIKELY")) {
					probability = isReplyToEither ? 0.6 : (isNameMention ? 0.5 : (inConversation ? 0.3 : 0.2));
					probabilitySource = "LIKELY response";
				} else if (response.includes("UNLIKELY")) {
					probability = isReplyToEither ? 0.3 : (isNameMention ? 0.2 : (inConversation ? 0.1 : 0.05));
					probabilitySource = "UNLIKELY response";
				} else {
					probability = isReplyToEither ? 0.2 : (isNameMention ? 0.1 : (inConversation ? 0.05 : 0.01));
					probabilitySource = "NO/unrecognized response";
				}

				logger.debug(`[${this.defaultBotName}] Assigned probability ${probability} based on ${probabilitySource}`);
				logger.debug(`[${this.defaultBotName}] Factors: isReplyToEither=${isReplyToEither}, isNameMention=${isNameMention}, inConversation=${inConversation}`);

				// Apply randomization to avoid predictability
				const random = Math.random();
				const shouldRespond = random < probability;
				logger.debug(`[${this.defaultBotName}] Random roll: ${random} vs threshold ${probability} = ${shouldRespond ? "RESPOND" : "DON'T RESPOND"}`);

				// Cache the decision for future similar messages
				this._decisionCache.set(cacheKey, {
					decision: shouldRespond,
					timestamp: new Date()
				});

				// Cleanup old cache entries periodically
				if (this._decisionCache.size > 20) {
					this.cleanupDecisionCache();
				}

				logger.debug(`[${this.defaultBotName}] Total evaluation time: ${Date.now() - startTime}ms`);
				logger.debug(`[${this.defaultBotName}] ========== SHOULD RESPOND EVALUATION END ==========`);
				return shouldRespond;
			} catch (error) {
				logger.error(`[${this.defaultBotName}] Error deciding whether to respond:`, error as Error);
				logger.debug(`[${this.defaultBotName}] Error stack: ${(error as Error).stack}`);

				// Fall back to simple randomization with higher probability for name mentions and replies
				const baseRate = isReplyToEither ? 0.6 : (isNameMention ? 0.4 : (inConversation ? 0.15 : CovaBotConfig.ResponseRate));
				const random = Math.random();
				const shouldRespond = random < baseRate;
				logger.debug(`[${this.defaultBotName}] Fallback random roll: ${random} vs threshold ${baseRate} = ${shouldRespond ? "RESPOND" : "DON'T RESPOND"}`);

				logger.debug(`[${this.defaultBotName}] Total evaluation time (with error): ${Date.now() - startTime}ms`);
				logger.debug(`[${this.defaultBotName}] ========== SHOULD RESPOND EVALUATION END (ERROR) ==========`);
				return shouldRespond;
			}
		});
	}

	private cleanupDecisionCache(): void {
		const now = new Date();
		let cleanupCount = 0;

		// Remove entries older than 2 minutes
		for (const [cacheKey, cacheEntry] of this._decisionCache.entries()) {
			if (isOlderThan(cacheEntry.timestamp, 2, TimeUnit.MINUTE, now)) {
				this._decisionCache.delete(cacheKey);
				cleanupCount++;
			}
		}

		if (cleanupCount > 0) {
			logger.debug(`[${this.defaultBotName}] Cleaned up ${cleanupCount} expired decision cache entries, ${this._decisionCache.size} remaining`);
		}
	}

	private async generateAndSendResponse(message: Message): Promise<void> {
		// Use performance timer for this operation
		return await PerformanceTimer.time('generateAndSendResponse', async () => {
			const startTime = Date.now();
			const authorId = message.author.id;
			const authorUsername = message.author.username;
			const channelId = message.channelId;
			const channelName = message.channel.type === 0 ? (message.channel as TextChannel).name : 'DM/unknown';
			const contentPreview = message.content.substring(0, 100) + (message.content.length > 100 ? '...' : '');

			logger.debug(`[${this.defaultBotName}] ========== RESPONSE GENERATION START ==========`);
			logger.debug(`[${this.defaultBotName}] Generating response to message from ${authorUsername} (${authorId})`);
			logger.debug(`[${this.defaultBotName}] Message content: "${contentPreview}"`);
			logger.debug(`[${this.defaultBotName}] Channel: ${channelName} (${channelId})`);

			try {
				logger.debug(`[${this.defaultBotName}] Sending request to LLM for Cova emulation`);
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
					logger.debug(`[${this.defaultBotName}] LLM response received in ${Date.now() - llmStartTime}ms`);
				} catch (llmError) {
					logger.warn(`[${this.defaultBotName}] LLM service error: ${llmError instanceof Error ? llmError.message : String(llmError)}`);
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
					logger.debug(`[${this.defaultBotName}] Using fallback response: "${response}"`);
				}

				logger.debug(`[${this.defaultBotName}] Raw LLM response: "${response}"`);

				if (!response || response.trim() === '') {
					logger.debug(`[${this.defaultBotName}] Received empty response from LLM, using fallback response`);
					response = "Yeah, that's pretty cool.";
				}

				logger.debug(`[${this.defaultBotName}] Final response to send: "${response}"`);
				logger.debug(`[${this.defaultBotName}] Sending reply via ReplyBot.sendReply`);

				const sendStartTime = Date.now();
				await this.sendReply(message.channel as TextChannel, response);
				logger.debug(`[${this.defaultBotName}] Reply sent in ${Date.now() - sendStartTime}ms`);

				logger.debug(`[${this.defaultBotName}] Total response generation and sending time: ${Date.now() - startTime}ms`);
				logger.debug(`[${this.defaultBotName}] ========== RESPONSE GENERATION END ==========`);
			} catch (error) {
				logger.error(`[${this.defaultBotName}] Error generating response:`, error as Error);
				logger.debug(`[${this.defaultBotName}] Error stack: ${(error as Error).stack}`);
				logger.debug(`[${this.defaultBotName}] ========== RESPONSE GENERATION END (ERROR) ==========`);
			}
		});
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

