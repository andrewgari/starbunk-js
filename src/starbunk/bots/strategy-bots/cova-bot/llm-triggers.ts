import { Message } from 'discord.js';
import { getLLMManager } from '../../../../services/bootstrap';
import { LLMProviderType } from '../../../../services/llm';
import { PromptRegistry, PromptType } from '../../../../services/llm/promptManager';
import { logger } from '../../../../services/logger';
import { getPersonalityService } from '../../../../services/personalityService';
import { and, not, or, withChance, withinTimeframeOf } from '../../core/conditions';
import { createLLMCondition } from '../../core/llm-conditions';
import { ResponseGenerator, randomResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { COVA_BOT_AVATARS, COVA_BOT_CONFIG, COVA_BOT_FALLBACK_RESPONSES, COVA_BOT_NAME, COVA_BOT_PATTERNS, COVA_BOT_PROMPTS } from './constants';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { PerformanceTimer } from '../../../../utils/time';

// Default identity for CovaBot
const DEFAULT_IDENTITY = {
	botName: COVA_BOT_NAME,
	avatarUrl: COVA_BOT_AVATARS.Default
};

// Create performance timer for CovaBot operations
const perfTimer = PerformanceTimer.getInstance();

// State management for conversation tracking
let lastConversationTime = new Date(0);
const getLastConversationTime = () => lastConversationTime.getTime();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _updateConversationTime = () => {
	lastConversationTime = new Date();
};

// Register the Cova Emulator prompt to LLM system on module import
PromptRegistry.registerPrompt(PromptType.COVA_EMULATOR, {
	systemContent: COVA_BOT_PROMPTS.EmulatorPrompt,
	formatUserMessage: (message: string): string => message,
	defaultTemperature: 0.7,
	defaultMaxTokens: 150
});

// LLM-based response that uses the Cova emulator prompt
export const createLLMEmulatorResponse = (): ResponseGenerator => {
	return async (message: Message): Promise<string> => {
		return await PerformanceTimer.time('llm-emulator', async () => {
			try {
				logger.debug(`[CovaBot] Getting LLM response using emulator prompt`);

				// Get personality embedding
				const personalityService = getPersonalityService();
				const personalityEmbedding = personalityService.getPersonalityEmbedding();

				// Create completion with personality context
				const response = await getLLMManager().createPromptCompletion(
					PromptType.COVA_EMULATOR,
					message.content,
					{
						temperature: 0.7,
						maxTokens: 150,
						providerType: LLMProviderType.OLLAMA,
						fallbackToDefault: true,
						contextData: {
							personalityEmbedding: personalityEmbedding ? Array.from(personalityEmbedding) : undefined
						}
					}
				);

				if (!response || response.trim() === '') {
					logger.debug(`[CovaBot] Received empty response from LLM, using fallback`);
					return randomResponse(COVA_BOT_FALLBACK_RESPONSES)(message);
				}

				return response;
			} catch (error) {
				logger.warn(`[CovaBot] LLM service error: ${error instanceof Error ? error.message : String(error)}`);
				return randomResponse(COVA_BOT_FALLBACK_RESPONSES)(message);
			}
		});
	};
};

// Creates an LLM-based condition for deciding whether Cova should respond
export const createLLMResponseDecisionCondition = (containsCova: boolean = false) => {
	return async (message: Message): Promise<boolean> => {
		return await PerformanceTimer.time('llm-decision', async () => {
			try {
				// Check if we're in a recent conversation
				const inConversation = !withinTimeframeOf(
					getLastConversationTime,
					COVA_BOT_CONFIG.Cooldowns.ConversationTimeout,
					's'
				)(message);

				// Create prompt for LLM with context about the message
				const mentionContext = containsCova
					? "The message contains the word 'cova' or similar."
					: "The message does not contain 'cova' or similar.";

				const userPrompt = `Message: "${message.content.substring(0, 100)}"
${inConversation ? "Part of an ongoing conversation where Cova recently replied." : "New conversation Cova hasn't joined yet."}
${mentionContext}

Using the Response Decision System, should Cova respond to this message?`;

				const llmResponse = await getLLMManager().createCompletion({
					model: process.env.OLLAMA_DEFAULT_MODEL || 'gemma3:4b',
					messages: [
						{ role: "system", content: COVA_BOT_PROMPTS.DecisionPrompt },
						{ role: "user", content: userPrompt },
					],
					temperature: 0.1,
					maxTokens: 5
				});

				const rawResponse = llmResponse.content;
				const response = rawResponse.toUpperCase();

				// Determine probability based on the response, with higher probabilities for name mentions
				let probability = 0;
				if (response.includes("YES")) {
					probability = 0.8;
				} else if (response.includes("LIKELY")) {
					probability = 0.5;
				} else if (response.includes("UNLIKELY")) {
					probability = 0.15;
				} else {
					probability = 0.05;
				}

				// Apply context-based modifiers
				if (containsCova) probability *= 1.2;
				if (inConversation) probability *= 1.1;

				// Cap at 0.9
				probability = Math.min(probability, 0.9);

				// Apply randomization to avoid predictability
				const random = Math.random();
				const shouldRespond = random < probability;

				logger.debug(`[CovaBot] LLM decision: ${response} → ${probability.toFixed(2)} → ${shouldRespond ? "RESPOND" : "DON'T RESPOND"}`);

				return shouldRespond;
			} catch (error) {
				// Fall back to simple randomization with lower probability for name mentions
				logger.error(`[CovaBot] Error deciding whether to respond: ${error instanceof Error ? error.message : String(error)}`);
				const baseRate = containsCova ? 0.2 : 0.05;
				return Math.random() < baseRate;
			}
		});
	};
};

// Trigger for when Cova is directly mentioned or @mentioned
export const covaMentionTrigger = createTriggerResponse({
	name: 'cova-mention',
	priority: 3,
	condition: or(
		// Match explicit Cova mention
		createLLMCondition(
			'Does this message directly reference, mention, or ask about Cova/CovaDax?',
			{ regexFallback: COVA_BOT_PATTERNS.Mention }
		),
		// Also match with higher chance if it contains the word 'cova'
		and(
			(message) => COVA_BOT_PATTERNS.Mention.test(message.content.toLowerCase()),
			withChance(80)
		)
	),
	response: createLLMEmulatorResponse(),
	identity: DEFAULT_IDENTITY
});

// Trigger for direct @ mentions
export const covaDirectMentionTrigger = createTriggerResponse({
	name: 'cova-direct-mention',
	priority: 5, // Highest priority
	condition: (message: Message) => message.mentions.has(message.client.user?.id || ''),
	response: createLLMEmulatorResponse(),
	identity: DEFAULT_IDENTITY
});

// Trigger for continued conversation
export const covaConversationTrigger = createTriggerResponse({
	name: 'cova-conversation',
	priority: 2,
	condition: and(
		// We're in an active conversation
		withinTimeframeOf(
			getLastConversationTime,
			COVA_BOT_CONFIG.Cooldowns.ConversationTimeout,
			's'
		),
		// And the LLM decides we should respond
		createLLMResponseDecisionCondition(false)
	),
	response: createLLMEmulatorResponse(),
	identity: DEFAULT_IDENTITY
});

// Trigger for contextual responses
export const covaContextualTrigger = createTriggerResponse({
	name: 'cova-contextual',
	priority: 4, // Higher than regular mention
	condition: and(
		// Must contain a reference to 'cova'
		(message) => COVA_BOT_PATTERNS.Mention.test(message.content.toLowerCase()),
		// And LLM decides we should respond
		createLLMResponseDecisionCondition(true),
		// But we're not in a recent conversation
		not(withinTimeframeOf(
			getLastConversationTime,
			COVA_BOT_CONFIG.Cooldowns.ConversationTimeout,
			's'
		))
	),
	response: createLLMEmulatorResponse(),
	identity: DEFAULT_IDENTITY
});

// Trigger for stats command
export const covaStatsCommandTrigger = createTriggerResponse({
	name: 'cova-stats-command',
	priority: 10, // Highest priority - always check this first
	condition: (message: Message) => message.content.toLowerCase() === '!covabot-stats',
	response: () => {
		const stats = perfTimer.getStatsString();
		logger.debug(`[CovaBot] Sending performance stats:\n${stats}`);
		return `\`\`\`\n${stats}\n\`\`\``;
	},
	identity: DEFAULT_IDENTITY
});

// Initialize periodic stats logging - every hour
setInterval(() => {
	const stats = perfTimer.getStatsString();
	logger.info(`[CovaBot] Hourly performance stats:\n${stats}`);

	// Reset after logging to avoid memory growth
	if (perfTimer.getStats()['llm-decision']?.count > 1000) {
		logger.info(`[CovaBot] Resetting performance stats after reaching threshold`);
		perfTimer.reset();
	}
}, 60 * 60 * 1000).unref(); // 1 hour in milliseconds, unref to allow process to exit during tests
