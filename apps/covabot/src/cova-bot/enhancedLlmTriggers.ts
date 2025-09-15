import { Message } from 'discord.js';
import { logger, PerformanceTimer, ResponseGenerator, weightedRandomResponse } from '@starbunk/shared';
import { getLLMManager } from '@starbunk/shared';
import { LLMProviderType } from '@starbunk/shared';
import { PromptRegistry, PromptType } from '@starbunk/shared';
import { COVA_BOT_FALLBACK_RESPONSES, COVA_BOT_PROMPTS } from './constants';
import { QdrantMemoryService } from '../services/qdrantMemoryService';

// Create performance timer for CovaBot operations
const perfTimer = PerformanceTimer.getInstance();

// Track last time the bot responded to maintain conversation context
const lastResponseTime = new Map<string, number>();
const setLastResponseTime = (channelId: string) => {
	lastResponseTime.set(channelId, Date.now());
};
const getLastResponseTime = (channelId: string) => {
	return lastResponseTime.get(channelId) || 0;
};

// Register the enhanced Cova Emulator prompt
PromptRegistry.registerPrompt(PromptType.COVA_EMULATOR, {
	systemContent: COVA_BOT_PROMPTS.EmulatorPrompt,
	formatUserMessage: (message: string): string => message,
	defaultTemperature: 0.7,
	defaultMaxTokens: 200,
});

// Register the decision prompt
PromptRegistry.registerPrompt(PromptType.COVA_DECISION, {
	systemContent: COVA_BOT_PROMPTS.DecisionPrompt,
	formatUserMessage: (message: string): string => message,
	defaultTemperature: 0.2,
	defaultMaxTokens: 10,
});

/**
 * Enhanced LLM-based response generator using Qdrant memory service
 */
export const createEnhancedLLMEmulatorResponse = (): ResponseGenerator => {
	return async (message: Message): Promise<string> => {
		return await perfTimer.time('enhanced-llm-emulator', async () => {
			try {
				logger.debug(`[CovaBot] Generating enhanced response with conversation memory`);

				const memoryService = QdrantMemoryService.getInstance();

				// Get channel name safely
				let channelName = 'Unknown Channel';
				try {
					if ('name' in message.channel && message.channel.name) {
						channelName = message.channel.name;
					} else {
						channelName = 'Direct Message';
					}
				} catch (_error) {
					// If anything fails, just use default
				}

				// Generate enhanced context with conversation memory
				const enhancedContext = await memoryService.generateEnhancedContext(
					message.content,
					message.author.id,
					message.channel.id,
					{
						maxPersonalityNotes: 10,
						maxConversationHistory: 8,
						personalityWeight: 1.0,
						conversationWeight: 0.8,
						similarityThreshold: 0.6,
					},
				);

				// Create the user prompt with enhanced context
				const userPrompt = `
Channel: ${channelName}
User: ${message.author.username}
Message: ${message.content}

${enhancedContext.combinedContext}

Respond as Cova would to this message, taking into account both the personality instructions and the relevant conversation history above. Be natural and conversational.`;

				// Create completion with enhanced context
				const response = await getLLMManager().createPromptCompletion(PromptType.COVA_EMULATOR, userPrompt, {
					temperature: 0.7,
					maxTokens: 250,
					providerType: LLMProviderType.OLLAMA,
					fallbackToDefault: true,
				});

				if (response) {
					// Store both user message and bot response in conversation memory
					const conversationId = `${message.channel.id}_${Date.now()}`;

					try {
						// Store user message
						await memoryService.storeConversation({
							content: message.content,
							userId: message.author.id,
							channelId: message.channel.id,
							messageType: 'user',
							conversationId,
						});

						// Store bot response
						await memoryService.storeConversation({
							content: response,
							userId: 'covabot',
							channelId: message.channel.id,
							messageType: 'bot',
							conversationId,
						});

						logger.debug(`[CovaBot] Stored conversation pair in memory: ${conversationId}`);
					} catch (memoryError) {
						logger.warn(
							`[CovaBot] Failed to store conversation in memory: ${memoryError instanceof Error ? memoryError.message : 'Unknown error'}`,
						);
						// Continue with response even if memory storage fails
					}

					// Update last response time
					setLastResponseTime(message.channel.id);

					logger.debug(
						`[CovaBot] Enhanced response generated with ${enhancedContext.metadata.personalityNotesUsed} personality notes and ${enhancedContext.metadata.conversationItemsUsed} conversation items`,
					);
					return response;
				}

				// Fallback to random response if LLM fails
				logger.warn('[CovaBot] LLM response was empty, using fallback');
				return weightedRandomResponse(COVA_BOT_FALLBACK_RESPONSES);
			} catch (error) {
				logger.error(
					`[CovaBot] Error in enhanced LLM response generation: ${error instanceof Error ? error.message : String(error)}`,
				);
				return weightedRandomResponse(COVA_BOT_FALLBACK_RESPONSES);
			}
		});
	};
};

/**
 * Enhanced decision logic using conversation memory
 */
export const createEnhancedLLMDecisionLogic = (): ResponseGenerator => {
	return async (message: Message): Promise<boolean> => {
		return await perfTimer.time('enhanced-llm-decision', async () => {
			try {
				const memoryService = QdrantMemoryService.getInstance();

				// Get recent conversation context for decision making
				const conversationContext = await memoryService.getConversationContext(
					message.content,
					message.author.id,
					message.channel.id,
					{
						maxConversationHistory: 5,
						similarityThreshold: 0.5,
					},
				);

				// Enhanced decision prompt with conversation awareness
				const decisionPrompt = `
User message: "${message.content}"
Channel: ${('name' in message.channel && message.channel.name) || 'DM'}
User: ${message.author.username}

${conversationContext ? `Recent conversation context:\n${conversationContext}\n` : ''}

Based on Cova's personality and the conversation context, should Cova respond to this message?

Consider:
- Is this a direct question or mention?
- Does it relate to ongoing conversation topics?
- Would Cova naturally want to contribute?
- Is the conversation active or stale?

Respond with only "yes" or "no".`;

				const response = await getLLMManager().createPromptCompletion(
					PromptType.COVA_DECISION,
					decisionPrompt,
					{
						temperature: 0.3,
						maxTokens: 5,
						providerType: LLMProviderType.OLLAMA,
						fallbackToDefault: true,
					},
				);

				// Parse decision
				const decision = response?.toLowerCase().trim() === 'yes';

				// Enhanced contextual adjustments
				const lastResponseMinutes = (Date.now() - getLastResponseTime(message.channel.id)) / (1000 * 60);
				const isRecentConversation = lastResponseMinutes < 30;

				let probability = decision ? 0.8 : 0.2;

				// Adjust based on conversation recency
				if (isRecentConversation) {
					probability *= 1.2; // More likely to continue active conversations
				} else {
					probability *= 0.7; // Less likely to start new conversations
				}

				// Boost for direct questions or mentions
				const messageContent = message.content.toLowerCase();
				if (messageContent.includes('?') || messageContent.includes('cova')) {
					probability *= 1.3;
				}

				// Reduce for very short messages
				if (message.content.length < 15 && !messageContent.includes('?')) {
					probability *= 0.6;
				}

				// Apply conversation memory boost
				if (conversationContext && conversationContext.length > 0) {
					probability *= 1.1; // Slight boost if there's relevant conversation history
				}

				// Cap probability
				probability = Math.min(probability, 0.85);

				// Final random check
				const shouldRespond = Math.random() < probability;

				logger.debug(
					`[CovaBot] Enhanced decision: LLM=${decision} → probability=${probability.toFixed(2)} → ${shouldRespond ? 'RESPOND' : "DON'T RESPOND"}`,
				);

				return shouldRespond;
			} catch (error) {
				logger.error(
					`[CovaBot] Error in enhanced decision logic: ${error instanceof Error ? error.message : String(error)}`,
				);
				// Fallback to simple randomization
				return Math.random() < 0.25;
			}
		});
	};
};

/**
 * Web-compatible enhanced response for testing
 */
export const createEnhancedWebResponse = (memoryService: QdrantMemoryService) => {
	return async (message: string, userId: string = 'web-user', channelId: string = 'web-channel'): Promise<string> => {
		try {
			// Generate enhanced context
			const enhancedContext = await memoryService.generateEnhancedContext(message, userId, channelId, {
				maxPersonalityNotes: 8,
				maxConversationHistory: 6,
				similarityThreshold: 0.6,
			});

			// Create prompt for web testing
			const userPrompt = `
User: ${userId}
Message: ${message}

${enhancedContext.combinedContext}

Respond as Cova would to this message, taking into account the personality instructions and conversation history.`;

			// Generate response
			const response = await getLLMManager().createPromptCompletion(PromptType.COVA_EMULATOR, userPrompt, {
				temperature: 0.7,
				maxTokens: 200,
				providerType: LLMProviderType.OLLAMA,
				fallbackToDefault: true,
			});

			if (response) {
				// Store conversation in memory for web testing
				const conversationId = `web_${channelId}_${Date.now()}`;

				await memoryService.storeConversation({
					content: message,
					userId,
					channelId,
					messageType: 'user',
					conversationId,
				});

				await memoryService.storeConversation({
					content: response,
					userId: 'covabot',
					channelId,
					messageType: 'bot',
					conversationId,
				});

				return response;
			}

			return weightedRandomResponse(COVA_BOT_FALLBACK_RESPONSES);
		} catch (error) {
			logger.error(
				`[CovaBot] Error in enhanced web response: ${error instanceof Error ? error.message : String(error)}`,
			);
			return weightedRandomResponse(COVA_BOT_FALLBACK_RESPONSES);
		}
	};
};

// Initialize periodic cleanup - every 2 hours
setInterval(
	() => {
		const stats = perfTimer.getStatsString();
		logger.info(`[CovaBot] Enhanced performance stats:\n${stats}`);

		// Reset performance stats periodically
		if (perfTimer.getStats()['enhanced-llm-decision']?.count > 500) {
			logger.info(`[CovaBot] Resetting enhanced performance stats after threshold`);
			perfTimer.reset();
		}

		// Clean up old response tracking
		const now = Date.now();
		for (const [channelId, time] of lastResponseTime.entries()) {
			if (now - time > 24 * 60 * 60 * 1000) {
				// Older than 24 hours
				lastResponseTime.delete(channelId);
			}
		}
	},
	2 * 60 * 60 * 1000,
).unref(); // 2 hours in milliseconds
