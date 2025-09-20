import { Message } from 'discord.js';
import { logger, ensureError } from '@starbunk/shared';
import { TriggerCondition, ResponseGenerator } from '../types/triggerResponse';
import { createLLMService, LLMService } from '../services/llmService';

// Lazy-initialized LLM service
let llmService: LLMService | null = null;

function getLLMService(): LLMService {
	if (!llmService) {
		llmService = createLLMService();
	}
	return llmService;
}

/**
 * Pure LLM-driven response decision condition
 * Uses LLM to determine when Cova would naturally respond - no keyword matching or fallbacks
 */
export function createLLMResponseDecisionCondition(): TriggerCondition {
	return async (message: Message): Promise<boolean> => {
		try {
			// Don't respond to empty or whitespace-only messages
			if (!message.content.trim()) {
				logger.debug('[CovaBot] LLM decision: not responding to empty message');
				return false;
			}

			// Use LLM service to make decision
			const llmSvc = getLLMService();
			const shouldRespond = await llmSvc.shouldRespond(message);

			logger.debug(`[CovaBot] LLM decision: ${shouldRespond ? 'responding' : 'not responding'}`);
			return shouldRespond;
		} catch (error) {
			logger.error('[CovaBot] Error in LLM decision condition:', ensureError(error));
			return false;
		}
	};
}

/**
 * Pure LLM-driven response generator
 * Uses only LLM for responses - no keyword matching or fallback responses
 * IMPORTANT: On any error or LLM failure, return empty string so CovaBot remains silent
 */
export function createLLMEmulatorResponse(): ResponseGenerator {
	return async (message: Message): Promise<string> => {
		const startTime = Date.now();

		try {
			logger.debug('[CovaBot] Generating pure LLM response');

			// Use LLM service for response generation - no fallbacks
			const llmSvc = getLLMService();
			const response = await llmSvc.generateResponse(message);

			if (response && response.trim()) {
				const duration = Date.now() - startTime;
				logger.debug(`[CovaBot] LLM response generated in ${duration}ms`);
				return response.trim();
			}

			// If LLM returns empty or no response, remain silent
			const duration = Date.now() - startTime;
			logger.debug(`[CovaBot] LLM returned empty response, remaining silent after ${duration}ms`);
			return '';
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
