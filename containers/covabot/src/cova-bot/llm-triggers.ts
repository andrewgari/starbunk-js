import { Message } from 'discord.js';
import userId from '../../../../discord/userId';
import { getLLMManager } from '@starbunk/shared';
import { LLMProviderType } from '@starbunk/shared';
import { PromptRegistry, PromptType } from '@starbunk/shared';
import { logger } from '@starbunk/shared';
import { getPersonalityService } from '../../../../services/personalityService';
import { PerformanceTimer } from '../../../../utils/time';
import { ResponseGenerator, weightedRandomResponse } from '../../core/responses';
import { COVA_BOT_FALLBACK_RESPONSES, COVA_BOT_PROMPTS } from './constants';

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

// Register the Cova Emulator prompt
PromptRegistry.registerPrompt(PromptType.COVA_EMULATOR, {
	systemContent: COVA_BOT_PROMPTS.EmulatorPrompt,
	formatUserMessage: (message: string): string => message,
	defaultTemperature: 0.7,
	defaultMaxTokens: 150
});

// Register the decision prompt
PromptRegistry.registerPrompt(PromptType.COVA_DECISION, {
	systemContent: COVA_BOT_PROMPTS.DecisionPrompt,
	formatUserMessage: (message: string): string => message,
	defaultTemperature: 0.2,
	defaultMaxTokens: 10
});

/**
 * Creates an LLM-based response generator using Cova's personality profile
 */
export const createLLMEmulatorResponse = (): ResponseGenerator => {
	return async (message: Message): Promise<string> => {
		return await PerformanceTimer.time('llm-emulator', async () => {
			try {
				logger.debug(`[CovaBot] Generating response with personality emulation`);

				// Get personality embedding
				const personalityService = getPersonalityService();
				const personalityEmbedding = personalityService.getPersonalityEmbedding();

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

				// Create the user prompt with context
				const userPrompt = `
Channel: ${channelName}
User: ${message.author.username}
Message: ${message.content}

Respond as Cova would to this message.`;

				// Create completion with personality context
				const response = await getLLMManager().createPromptCompletion(
					PromptType.COVA_EMULATOR,
					userPrompt,
					{
						temperature: 0.7,
						maxTokens: 250,
						providerType: LLMProviderType.OLLAMA,
						fallbackToDefault: true,
						contextData: {
							personalityEmbedding: personalityEmbedding ? Array.from(personalityEmbedding) : undefined
						}
					}
				);

				// Update the last response time for this channel
				setLastResponseTime(message.channelId);

				if (!response || response.trim() === '') {
					logger.debug(`[CovaBot] Received empty response from LLM, using fallback`);
					return weightedRandomResponse(COVA_BOT_FALLBACK_RESPONSES)(message);
				}

				// Truncate response to Discord's 2000 character limit
				if (response.length > 1900) {
					logger.warn(`[CovaBot] Response exceeded Discord's character limit (${response.length} chars), truncating`);
					return response.substring(0, 1900) + "... (truncated)";
				}

				return response;
			} catch (error) {
				logger.warn(`[CovaBot] LLM service error: ${error instanceof Error ? error.message : String(error)}`);
				return weightedRandomResponse(COVA_BOT_FALLBACK_RESPONSES)(message);
			}
		});
	};
};

/**
 * Creates an LLM-based condition for deciding whether Cova should respond
 */
export const createLLMResponseDecisionCondition = () => {
	return async (message: Message): Promise<boolean> => {
		return await PerformanceTimer.time('llm-decision', async () => {
			try {
				// Always respond to direct mentions
				if (message.mentions.has(userId.Cova)) {
					logger.debug('[CovaBot] Direct mention detected, will respond');
					return true;
				}

				// Skip bot messages
				if (message.author.bot) {
					return false;
				}

				// Get data about recent interactions
				const lastResponseMs = Date.now() - getLastResponseTime(message.channelId);
				const lastResponseMinutes = Math.floor(lastResponseMs / 60000);
				const isRecentConversation = lastResponseMs < 10 * 60 * 1000; // 10 minutes

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

				// Craft decision prompt
				const userPrompt = `
Channel: ${channelName}
User: ${message.author.username}
Message: "${message.content}"
Time since Cova's last message in this channel: ${isRecentConversation ? `${lastResponseMinutes} minutes` : 'more than 10 minutes'}

Based on the Response Decision System, should Cova respond to this message?`;

				// Use LLM to decide whether to respond
				const llmResponse = await getLLMManager().createPromptCompletion(
					PromptType.COVA_DECISION,
					userPrompt,
					{
						temperature: 0.2,
						maxTokens: 10,
						providerType: LLMProviderType.OLLAMA,
						fallbackToDefault: true
					}
				);

				const response = llmResponse.trim().toUpperCase();

				// Determine probability based on the response
				let probability = 0;
				if (response.includes("YES")) {
					probability = 0.8;
				} else if (response.includes("LIKELY")) {
					probability = 0.5;
				} else if (response.includes("UNLIKELY")) {
					probability = 0.2;
				} else {
					probability = 0.05;
				}

				// Adjust probability based on conversation recency
				if (isRecentConversation) {
					// Higher chance to respond in active conversations
					probability *= 1.2;
				} else {
					// Lower chance to start new conversations
					probability *= 0.8;
				}

				// Cap probability
				probability = Math.min(probability, 0.9);

				// Apply randomization to avoid predictability
				const random = Math.random();
				const shouldRespond = random < probability;

				logger.debug(`[CovaBot] Decision: ${response} → probability ${probability.toFixed(2)} → ${shouldRespond ? "RESPOND" : "DON'T RESPOND"}`);

				return shouldRespond;
			} catch (error) {
				// Fall back to simple randomization on error
				logger.error(`[CovaBot] Error in decision logic: ${error instanceof Error ? error.message : String(error)}`);
				return Math.random() < 0.2; // 20% chance to respond on error
			}
		});
	};
};

// Initialize periodic stats logging - every hour
setInterval(() => {
	const stats = perfTimer.getStatsString();
	logger.info(`[CovaBot] Performance stats:\n${stats}`);

	// Reset after logging to avoid memory growth
	if (perfTimer.getStats()['llm-decision']?.count > 1000) {
		logger.info(`[CovaBot] Resetting performance stats after threshold`);
		perfTimer.reset();
	}

	// Clean up old entries from last response tracking
	const now = Date.now();
	for (const [channelId, time] of lastResponseTime.entries()) {
		if (now - time > 24 * 60 * 60 * 1000) { // Older than 24 hours
			lastResponseTime.delete(channelId);
		}
	}
}, 60 * 60 * 1000).unref(); // 1 hour in milliseconds
