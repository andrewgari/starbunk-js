import { Message } from 'discord.js';
import { logger, ensureError, container, ServiceId } from '@starbunk/shared';
import { LLMManager } from '@starbunk/shared/dist/services/llm/llmManager';
import { TriggerCondition, ResponseGenerator } from '../types/triggerResponse';
import { createLLMService, LLMService } from '../services/llmService';
import userId from './simplifiedUserId';

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
	 * Heuristic-based condition that delegates to LLMService.shouldRespond
	 *
	 * This removes any LLM-based gating from the decision path – the LLM is
	 * only used for generating the actual response, not for deciding whether
	 * to respond.
	 */
	export function createLLMResponseDecisionCondition(): TriggerCondition {
		return async (message: Message): Promise<boolean> => {
			try {
				const content = message.content?.trim() ?? '';
				if (!content) {
					logger.debug('[CovaBot] Skipping empty message');
					return false;
				}

				// Never respond to other bots
				if (message.author.bot) {
					logger.debug('[CovaBot] Skipping bot message');
					return false;
				}

				const svc = getLLMService();
				const shouldRespond = await svc.shouldRespond(message);
				logger.debug(
					`[CovaBot] Heuristic shouldRespond decision: ${shouldRespond ? 'RESPOND' : 'SKIP'}`,
				);
				return shouldRespond;
			} catch (error) {
				logger.error('[CovaBot] Error in heuristic decision condition:', ensureError(error));
				return false;
			}
		};
	}

	/**
	 * LLM response generator for Cova.
	 *
	 * The decision about whether to respond is made by the heuristic condition
	 * (createLLMResponseDecisionCondition). This generator only handles response
	 * generation, constructing an enhanced prompt with context and calibration notes.
	 *
	 * IMPORTANT: On any error or LLM failure, return empty string so CovaBot remains silent
	 */
export function createLLMEmulatorResponse(): ResponseGenerator {
	return async (message: Message): Promise<string> => {
		const startTime = Date.now();

			try {
				logger.debug('[CovaBot] Generating single-prompt LLM response (response only, no LLM gating)');

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
				let isDirectMention = false;
				try {
					const clientUser = (message as any).client?.user;
					if (clientUser && (message as any).mentions?.has) {
						// Discord.js MessageMentions.has accepts a UserResolvable (user or ID)
						isDirectMention = (message as any).mentions.has(clientUser);
					}
				} catch {
					// If mention inspection fails, fall back to name-based mention heuristic only
				}

				// Add context to help the LLM generate an in-character response
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

Instructions: You are Cova. The decision about whether to respond has already been made.
Respond exactly as Cova would to this message, taking into account the notes above.
Keep the reply conversational and reasonably concise.`;

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

				// Guard against empty responses
				if (!response || response.trim() === '') {
					const duration = Date.now() - startTime;
					logger.debug(`[CovaBot] LLM returned empty response after ${duration}ms`);
					return '';
				}

				// Return the generated response
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
