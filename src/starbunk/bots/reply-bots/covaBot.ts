import { Message, TextChannel } from 'discord.js';
import userId from '../../../discord/userId';
import { getDiscordClient, getDiscordService, getLLMManager } from '../../../services/bootstrap';
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
		logger.debug(`[${this.defaultBotName}] Initializing CovaBot with extensive logging`);
		console.log(`[${this.defaultBotName}] Initializing CovaBot with extensive logging`);

		// Initialize with default values
		this._botIdentity = {
			botName: CovaBotConfig.Name,
			avatarUrl: CovaBotConfig.Avatars.Default
		};
		logger.debug(`[${this.defaultBotName}] Initial bot identity: ${JSON.stringify(this._botIdentity)}`);

		// Try to get Cova's real identity
		this.updateBotIdentity();

		// Very explicit debug mode check for verification
		if (process.env.DEBUG === 'true') {
			logger.warn(`[${this.defaultBotName}] DEBUG MODE IS ACTIVE - WILL ONLY RESPOND TO COVA MESSAGES`);
			console.log(`[${this.defaultBotName}] DEBUG MODE IS ACTIVE - WILL ONLY RESPOND TO COVA MESSAGES`);
		} else {
			logger.warn(`[${this.defaultBotName}] Normal mode - will ignore messages from Cova`);
			console.log(`[${this.defaultBotName}] Normal mode - will ignore messages from Cova`);
		}

		// Add testing mode check
		if (process.env.TESTING_MODE === 'true') {
			logger.warn(`[${this.defaultBotName}] TESTING MODE IS ACTIVE - WILL RESPOND TO MESSAGES MENTIONING COVA`);
			console.log(`[${this.defaultBotName}] TESTING MODE IS ACTIVE - WILL RESPOND TO MESSAGES MENTIONING COVA`);
		}

		logger.debug(`[${this.defaultBotName}] Configuration loaded: ResponseRate=${CovaBotConfig.ResponseRate}, IgnoreUsers=${JSON.stringify(CovaBotConfig.IgnoreUsers)}`);
		logger.debug(`[${this.defaultBotName}] Patterns: Mention=${CovaBotConfig.Patterns.Mention}, Question=${CovaBotConfig.Patterns.Question}, AtMention=${CovaBotConfig.Patterns.AtMention}`);
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
				console.log(`[${this.defaultBotName}] ❌ SKIPPING MESSAGE CONTAINING 'COVA' (base class rule): "${message.content}"`);
			}
			return true;
		}

		// In testing mode, respond to messages mentioning Cova
		if (process.env.TESTING_MODE === 'true') {
			const messageContent = message.content.toLowerCase();
			const mentionsCova = messageContent.includes('cova');
			logger.debug(`[${this.defaultBotName}] TESTING MODE: Message from ${authorUsername} (${authorId}), mentionsCova=${mentionsCova}`);

			if (mentionsCova) {
				logger.debug(`[${this.defaultBotName}] TESTING MODE: Processing message mentioning Cova: "${message.content}"`);
				console.log(`[${this.defaultBotName}] ✅ TESTING MODE: WILL PROCESS MESSAGE MENTIONING COVA: "${message.content}"`);
				return false;
			} else {
				if (mentionsCova) {
					console.log(`[${this.defaultBotName}] ❌ SKIPPING MESSAGE CONTAINING 'COVA' (testing mode - logic error): "${message.content}"`);
				}
			}
		}

		// In debug mode, ONLY respond to Cova's messages
		if (process.env.DEBUG === 'true') {
			const isFromCova = authorId === userId.Cova;
			logger.debug(`[${this.defaultBotName}] DEBUG MODE: Message from ${authorUsername} (${authorId}), isFromCova=${isFromCova}`);
			if (!isFromCova) {
				logger.debug(`[${this.defaultBotName}] DEBUG MODE: Skipping message from ${authorUsername} (not Cova)`);
				if (mentionsCova) {
					console.log(`[${this.defaultBotName}] ❌ DEBUG MODE: SKIPPING MESSAGE CONTAINING 'COVA' (not from Cova): "${message.content}"`);
				}
				return true;
			} else {
				logger.debug(`[${this.defaultBotName}] DEBUG MODE: Processing message from Cova`);
				return false;
			}
		}

		// Regular mode: skip messages from the real Cova and ignored users
		const isFromRealCova = authorId === userId.Cova;
		const isIgnoredUser = CovaBotConfig.IgnoreUsers && CovaBotConfig.IgnoreUsers.includes(authorId);

		logger.debug(`[${this.defaultBotName}] shouldSkipMessage: isFromRealCova=${isFromRealCova}, isIgnoredUser=${isIgnoredUser}`);

		if (isFromRealCova) {
			logger.debug(`[${this.defaultBotName}] shouldSkipMessage: Skipping message from the real Cova`);
			if (mentionsCova) {
				console.log(`[${this.defaultBotName}] ❌ SKIPPING MESSAGE CONTAINING 'COVA' (from real Cova): "${message.content}"`);
			}
			return true;
		}

		if (isIgnoredUser) {
			logger.debug(`[${this.defaultBotName}] shouldSkipMessage: Skipping message from ignored user ${authorUsername} (${authorId})`);
			if (mentionsCova) {
				console.log(`[${this.defaultBotName}] ❌ SKIPPING MESSAGE CONTAINING 'COVA' (from ignored user): "${message.content}"`);
			}
			return true;
		}

		logger.debug(`[${this.defaultBotName}] shouldSkipMessage: Message will be processed`);
		if (mentionsCova) {
			console.log(`[${this.defaultBotName}] ✅ WILL PROCESS MESSAGE CONTAINING 'COVA': "${message.content}"`);
		}
		return false;
	}

	public async processMessage(message: Message): Promise<void> {
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
		console.log(`[${this.defaultBotName}] 👁️ SAW MESSAGE: ${messageId} from ${authorUsername} (${authorId}) in ${channelName} (${channelId})`);
		if (containsCova) {
			console.log(`[${this.defaultBotName}] 🔍 MESSAGE CONTAINS 'COVA': "${message.content}"`);
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
			const isNameMention = CovaBotConfig.Patterns.Mention.test(message.content);
			const isQuestion = CovaBotConfig.Patterns.Question.test(message.content);

			// Log all mention details
			logger.debug(`[${this.defaultBotName}] FULL Message content: "${message.content}"`);
			logger.debug(`[${this.defaultBotName}] Mention detection results:`);
			logger.debug(`[${this.defaultBotName}]   - Direct @ mention (Discord API): ${isDirectMention}`);
			logger.debug(`[${this.defaultBotName}]   - Raw @ mention (regex): ${isRawAtMention}`);
			logger.debug(`[${this.defaultBotName}]   - Name mention: ${isNameMention}`);
			logger.debug(`[${this.defaultBotName}]   - Question for Cova: ${isQuestion}`);

			if (isNameMention) {
				const nameMatch = message.content.match(CovaBotConfig.Patterns.Mention);
				logger.debug(`[${this.defaultBotName}]   - Name match found: "${nameMatch?.[0] || 'unknown match'}"`);
			}

			if (isQuestion) {
				const questionMatch = message.content.match(CovaBotConfig.Patterns.Question);
				logger.debug(`[${this.defaultBotName}]   - Question match found: "${questionMatch?.[0] || 'unknown match'}"`);
			}

			// Check if we've recently replied in this channel
			const inConversation = this._recentResponses.has(message.channelId);
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
			const shouldRespond = await this.shouldRespondToMessage(message.content, inConversation, isNameMention);
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

			logger.debug(`[${this.defaultBotName}] Total message processing time: ${Date.now() - startTime}ms`);
			logger.debug(`[${this.defaultBotName}] ========== PROCESS MESSAGE END ==========`);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			logger.debug(`[${this.defaultBotName}] Error stack: ${(error as Error).stack}`);
			logger.debug(`[${this.defaultBotName}] ========== PROCESS MESSAGE END (ERROR) ==========`);
		}
	}

	private updateRecentResponses(channelId: string): void {
		logger.debug(`[${this.defaultBotName}] Adding channel ${channelId} to recent responses`);
		const previousSize = this._recentResponses.size;
		this._recentResponses.add(channelId);
		logger.debug(`[${this.defaultBotName}] Recent responses set size: ${previousSize} -> ${this._recentResponses.size}`);

		logger.debug(`[${this.defaultBotName}] Setting expiration timeout for channel ${channelId} (60 seconds)`);
		setTimeout(() => {
			logger.debug(`[${this.defaultBotName}] Removing channel ${channelId} from recent responses (timeout expired)`);
			const beforeSize = this._recentResponses.size;
			this._recentResponses.delete(channelId);
			logger.debug(`[${this.defaultBotName}] Recent responses set size after removal: ${beforeSize} -> ${this._recentResponses.size}`);
		}, 60000);
	}

	private async shouldRespondToMessage(content: string, inConversation: boolean, isNameMention: boolean = false): Promise<boolean> {
		const startTime = Date.now();
		logger.debug(`[${this.defaultBotName}] ========== SHOULD RESPOND EVALUATION START ==========`);
		logger.debug(`[${this.defaultBotName}] Evaluating whether to respond to: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);
		logger.debug(`[${this.defaultBotName}] Context: inConversation=${inConversation}, isNameMention=${isNameMention}`);

		try {
			// Add context about mentions to help the LLM make better decisions
			const mentionContext = isNameMention
				? "The message mentions Cova by name (not with @)."
				: "The message does not directly mention Cova.";

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

			// Determine probability based on the response, with higher probabilities for name mentions
			let probability = 0;
			let probabilitySource = "";
			if (response.includes("YES")) {
				probability = isNameMention ? 0.95 : (inConversation ? 0.9 : 0.8);
				probabilitySource = "YES response";
			} else if (response.includes("LIKELY")) {
				probability = isNameMention ? 0.85 : (inConversation ? 0.7 : 0.5);
				probabilitySource = "LIKELY response";
			} else if (response.includes("UNLIKELY")) {
				probability = isNameMention ? 0.5 : (inConversation ? 0.3 : 0.15);
				probabilitySource = "UNLIKELY response";
			} else {
				probability = isNameMention ? 0.3 : (inConversation ? 0.1 : 0.05);
				probabilitySource = "NO/unrecognized response";
			}

			logger.debug(`[${this.defaultBotName}] Assigned probability ${probability} based on ${probabilitySource}`);
			logger.debug(`[${this.defaultBotName}] Factors: isNameMention=${isNameMention}, inConversation=${inConversation}`);

			// Apply randomization to avoid predictability
			const random = Math.random();
			const shouldRespond = random < probability;
			logger.debug(`[${this.defaultBotName}] Random roll: ${random} vs threshold ${probability} = ${shouldRespond ? "RESPOND" : "DON'T RESPOND"}`);

			logger.debug(`[${this.defaultBotName}] Total evaluation time: ${Date.now() - startTime}ms`);
			logger.debug(`[${this.defaultBotName}] ========== SHOULD RESPOND EVALUATION END ==========`);
			return shouldRespond;
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error deciding whether to respond:`, error as Error);
			logger.debug(`[${this.defaultBotName}] Error stack: ${(error as Error).stack}`);

			// Fall back to simple randomization with higher probability for name mentions
			const baseRate = isNameMention ? 0.6 : (inConversation ? 0.3 : CovaBotConfig.ResponseRate);
			const random = Math.random();
			const shouldRespond = random < baseRate;
			logger.debug(`[${this.defaultBotName}] Fallback random roll: ${random} vs threshold ${baseRate} = ${shouldRespond ? "RESPOND" : "DON'T RESPOND"}`);

			logger.debug(`[${this.defaultBotName}] Total evaluation time (with error): ${Date.now() - startTime}ms`);
			logger.debug(`[${this.defaultBotName}] ========== SHOULD RESPOND EVALUATION END (ERROR) ==========`);
			return shouldRespond;
		}
	}

	private async generateAndSendResponse(message: Message): Promise<void> {
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
	}
}

