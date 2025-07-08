import { Message } from 'discord.js';
import { logger } from '@starbunk/shared';
import { TriggerCondition, ResponseGenerator } from '../types/triggerResponse';

/**
 * Simplified LLM response decision condition
 * For now, this will use a simple probability-based decision
 */
export function createLLMResponseDecisionCondition(): TriggerCondition {
	return async (message: Message): Promise<boolean> => {
		try {
			// Simple heuristic: respond to questions, mentions, or with 10% probability
			const content = message.content.toLowerCase();
			
			// Always respond to questions
			if (content.includes('?') || content.startsWith('cova')) {
				logger.debug('[CovaBot] LLM decision: responding to question or mention');
				return true;
			}
			
			// 10% chance to respond to other messages
			const shouldRespond = Math.random() < 0.1;
			logger.debug(`[CovaBot] LLM decision: ${shouldRespond ? 'responding' : 'not responding'} (random)`);
			return shouldRespond;
			
		} catch (error) {
			logger.error('[CovaBot] Error in LLM decision condition:', error as Error);
			return false;
		}
	};
}

/**
 * Simplified LLM emulator response
 * For now, this will return simple responses until the full LLM system is available
 */
export function createLLMEmulatorResponse(): ResponseGenerator {
	return async (message: Message): Promise<string> => {
		try {
			logger.debug('[CovaBot] Generating simplified response');
			
			const content = message.content.toLowerCase();
			
			// Simple response patterns
			if (content.includes('hello') || content.includes('hi')) {
				return getRandomResponse([
					"Hey there! 👋",
					"Hello! How's it going?",
					"Hi! What's up?",
				]);
			}
			
			if (content.includes('?')) {
				return getRandomResponse([
					"That's a good question! 🤔",
					"Hmm, let me think about that...",
					"Interesting question!",
				]);
			}
			
			if (content.includes('thanks') || content.includes('thank you')) {
				return getRandomResponse([
					"You're welcome! 😊",
					"No problem!",
					"Happy to help!",
				]);
			}
			
			// Default responses
			return getRandomResponse([
				"I see what you mean!",
				"That's interesting!",
				"Tell me more about that.",
				"I hear you!",
				"Makes sense to me.",
			]);
			
		} catch (error) {
			logger.error('[CovaBot] Error generating response:', error as Error);
			return "Sorry, I'm having trouble responding right now.";
		}
	};
}

/**
 * Get a random response from an array
 */
function getRandomResponse(responses: string[]): string {
	const index = Math.floor(Math.random() * responses.length);
	return responses[index];
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
			const result = await fn();
			const duration = Date.now() - start;
			this.recordTiming(label, duration);
			return result;
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
