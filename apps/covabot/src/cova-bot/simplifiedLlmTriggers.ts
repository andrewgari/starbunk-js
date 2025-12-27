import { Message } from 'discord.js';
import { logger, ensureError, container, ServiceId } from '@starbunk/shared';
import { LLMManager } from '@starbunk/shared/dist/services/llm/llmManager';
import { TriggerCondition, ResponseGenerator } from '../types/triggerResponse';
import { createLLMService, LLMService } from '../services/llmService';

// Debug mode flag
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

// Lazy-initialized LLM service
let llmService: LLMService | null = null;

function getLLMService(): LLMService {
	// Fall back to creating a new LLM service
	if (!llmService) {
		llmService = createLLMService();
	}
	return llmService;
}

/**
 * Get LLM manager from container if available (for E2E tests with mocks)
 */
function getContainerLLMManager(): LLMManager | null {
	try {
		return container.get<LLMManager>(ServiceId.LLMManager);
	} catch (_error) {
		return null;
	}
}

/**
 * Simple condition that allows all non-bot, non-empty messages through
 * The actual decision-making happens in the response generator
 */
export function createLLMResponseDecisionCondition(): TriggerCondition {
	return async (message: Message): Promise<boolean> => {
		try {
			// Don't respond to empty or whitespace-only messages
			if (!message.content.trim()) {
				logger.debug('[CovaBot] Skipping empty message');
				return false;
			}

			// Don't respond to bot messages
			if (message.author.bot) {
				logger.debug('[CovaBot] Skipping bot message');
				return false;
			}

			// Let all other messages through - the LLM will decide in the response generator
			logger.debug('[CovaBot] Message passed basic filters, will let LLM decide');
			return true;
		} catch (error) {
			logger.error('[CovaBot] Error in condition check:', ensureError(error));
			return false;
		}
	};
}

/**
 * Single-prompt LLM response generator
 * The LLM decides whether to respond AND generates the response in one call
 *
 * The prompt instructs the LLM to:
 * 1. Analyze if Cova would naturally respond to this message
 * 2. If yes, generate an appropriate response as Cova
 * 3. If no, return empty/silent
 *
 * IMPORTANT: On any error or LLM failure, return empty string so CovaBot remains silent
 */
export function createLLMEmulatorResponse(): ResponseGenerator {
	return async (message: Message): Promise<string> => {
		const startTime = Date.now();

		try {
			logger.debug('[CovaBot] Generating single-prompt LLM response (includes decision)');

			// Build context about the message
			let channelName = 'DM';
			try {
				if ('name' in message.channel && typeof message.channel.name === 'string') {
					channelName = message.channel.name;
				}
			} catch {
				// Use default
			}
			const isMentioned = message.content.toLowerCase().includes('cova');
			const isDirectMention = message.mentions?.has?.('139592376443338752') || false;

			// Add context to help the LLM make a good decision
			const contextNote = isDirectMention
				? '\n(Note: Cova was directly mentioned, so they should probably respond)'
				: isMentioned
					? '\n(Note: Cova was referenced in the message)'
					: '';

			// In debug mode, add calibration context
			const calibrationNote = DEBUG_MODE
				? `

🔧 CALIBRATION MODE ACTIVE 🔧
You are in self-testing/calibration mode. Cova (the person) is talking to you (Cova the bot) to test and calibrate your responses.
This is a controlled testing environment - respond naturally as Cova would, understanding that this is for quality assurance and model testing.
You should be helpful, conversational, and demonstrate your capabilities while maintaining Cova's personality.
`
				: '';

			const enhancedMessage = `Channel: ${channelName}
User: ${message.author.username}
Message: "${message.content}"${contextNote}${calibrationNote}

Instructions: You are Cova. Analyze this message and decide if Cova would naturally respond.
- If Cova was directly mentioned (@Cova), you should almost always respond
- If Cova was referenced by name, consider responding if it's relevant
- For general conversation, only respond if Cova would have something meaningful to contribute
- If you decide to respond, write your response as Cova would
- If you decide NOT to respond, return exactly the word "SILENT" with no other text

Your response:`;

			// Try to use LLM manager from container first (for E2E tests with mocks)
			const llmManager = getContainerLLMManager();
			let response: string;

			if (llmManager) {
				// Use container's LLM manager (E2E tests with mocks)
				// Use createCompletion directly to avoid prompt registry lookup
				const completion = await llmManager.createCompletion({
					messages: [{ role: 'user', content: enhancedMessage }],
				});
				response = completion.content;
			} else {
				// Use regular LLM service (production)
				const llmSvc = getLLMService();
				response = await llmSvc.generateResponse(message, enhancedMessage);
			}

			// Check if LLM decided to stay silent
			if (!response || response.trim() === '' || response.trim().toUpperCase() === 'SILENT') {
				const duration = Date.now() - startTime;
				logger.debug(`[CovaBot] LLM decided not to respond (silent) after ${duration}ms`);
				return '';
			}

			// LLM decided to respond - return the response
			const duration = Date.now() - startTime;
			logger.debug(`[CovaBot] LLM response generated in ${duration}ms`);
			return response.trim();
		} catch (error) {
			const duration = Date.now() - startTime;
			logger.error(
				`[CovaBot] Error generating LLM response after ${duration}ms (remaining silent):`,
				ensureError(error),
			);
			return '';
		}
	};
}

/**
 * Simple performance timing utility
 */
export class SimplePerformanceTimer {
	private static instance: SimplePerformanceTimer;
	private timings: Map<string, number[]> = new Map();

	static getInstance(): SimplePerformanceTimer {
		if (!SimplePerformanceTimer.instance) {
			SimplePerformanceTimer.instance = new SimplePerformanceTimer();
		}
		return SimplePerformanceTimer.instance;
	}

	async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
		const start = Date.now();
		try {
			const _result = await fn();
			const duration = Date.now() - start;
			this.recordTiming(label, duration);
			return _result;
		} catch (error) {
			const duration = Date.now() - start;
			this.recordTiming(label, duration);
			throw error;
		}
	}

	private recordTiming(label: string, duration: number): void {
		if (!this.timings.has(label)) {
			this.timings.set(label, []);
		}
		const timings = this.timings.get(label)!;
		timings.push(duration);

		// Keep only last 100 timings
		if (timings.length > 100) {
			timings.shift();
		}
	}

	getStatsString(): string {
		const stats: string[] = [];
		for (const [label, timings] of this.timings.entries()) {
			const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
			const min = Math.min(...timings);
			const max = Math.max(...timings);
			stats.push(`${label}: avg=${avg.toFixed(1)}ms, min=${min}ms, max=${max}ms, count=${timings.length}`);
		}
		return stats.join('\n') || 'No performance data available';
	}
}
