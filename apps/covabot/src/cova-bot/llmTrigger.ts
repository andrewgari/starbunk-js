import { Message } from 'discord.js';
import { logger, ensureError } from '@starbunk/shared';
import { TriggerCondition, ResponseGenerator } from '../types/triggerResponse';
import { getPersonalityPrompt } from '../services/personalityLoader';
import { getChannelContext, addMessageToMemory } from '../services/channelMemoryService';

/**
 * LLM response that combines decision + generation in a single call
 * Returns structured response: RESPOND: yes/no\nMESSAGE: <response>
 */
interface LLMResponse {
	shouldRespond: boolean;
	message: string;
	rawResponse: string;
}

/**
 * Parse LLM response format
 * Expected format: RESPOND: yes/no\nMESSAGE: <response text>
 */
function parseResponse(rawResponse: string): LLMResponse {
	const lines = rawResponse.split('\n');
	let shouldRespond = false;
	let message = '';

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith('RESPOND:')) {
			const decision = trimmed.substring('RESPOND:'.length).trim().toUpperCase();
			shouldRespond = decision === 'YES' || decision === 'Y';
		} else if (trimmed.startsWith('MESSAGE:')) {
			message = trimmed.substring('MESSAGE:'.length).trim();
		}
	}

	// If no MESSAGE: prefix found, treat everything after RESPOND line as message
	if (!message && lines.length > 1) {
		const messageStart = lines.findIndex((l) => l.trim().startsWith('RESPOND:'));
		if (messageStart !== -1 && messageStart < lines.length - 1) {
			message = lines.slice(messageStart + 1).join('\n').trim();
		}
	}

	return {
		shouldRespond,
		message,
		rawResponse,
	};
}

/**
 * Create LLM response decision condition
 * Uses single LLM call to decide if should respond
 */
export function createLLMDecisionCondition(): TriggerCondition {
	return async (message: Message): Promise<boolean> => {
		try {
			if (!message.content.trim()) {
				logger.debug('[CovaBot] LLM: skipping empty message');
				return false;
			}

			const response = await callLLM(message);
			logger.debug(`[CovaBot] LLM decision: ${response.shouldRespond ? 'YES' : 'NO'}`);
			return response.shouldRespond;
		} catch (error) {
			logger.error('[CovaBot] Error in LLM decision condition:', ensureError(error));
			return false;
		}
	};
}

/**
 * Create LLM response generator
 * Uses single LLM call to generate response
 */
export function createLLMResponseGenerator(): ResponseGenerator {
	return async (message: Message): Promise<string> => {
		try {
			const response = await callLLM(message);

			if (!response.message || !response.message.trim()) {
				logger.debug('[CovaBot] LLM: empty response, remaining silent');
				return '';
			}

			logger.debug(`[CovaBot] LLM response: ${response.message.substring(0, 50)}...`);
			return response.message.trim();
		} catch (error) {
			logger.error('[CovaBot] Error in LLM response generator:', ensureError(error));
			return '';
		}
	};
}

/**
 * Call LLM with combined decision + response prompt
 */
async function callLLM(message: Message): Promise<LLMResponse> {
	const apiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
	const model = process.env.OLLAMA_MODEL || 'mistral:latest';

	try {
		const prompt = buildPrompt(message.content, message);

		logger.debug(`[CovaBot] Calling LLM at ${apiUrl}`);

		const response = await fetch(`${apiUrl}/api/generate`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model,
				prompt,
				stream: false,
				options: {
					temperature: 0.7,
					num_predict: 300,
				},
			}),
			signal: AbortSignal.timeout(30000),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = (await response.json()) as { response?: string };
		if (!data.response) {
			throw new Error('No response from LLM');
		}

		// Add current message to channel memory for future context
		addMessageToMemory(message);

		return parseResponse(data.response);
	} catch (error) {
		logger.error('[CovaBot] LLM call failed:', ensureError(error));
		// Return empty response on failure - no fallback
		return {
			shouldRespond: false,
			message: '',
			rawResponse: '',
		};
	}
}

/**
 * Build prompt that combines decision + response generation
 * Uses personality prompt as the system context
 * Includes recent conversation history for context awareness
 */
function buildPrompt(messageContent: string, message: Message): string {
	const personality = getPersonalityPrompt();
	const channelContext = getChannelContext(message, 5);
	const contextSection = channelContext ? `\n## Conversation Context\n${channelContext}\n` : '';

	return `${personality}${contextSection}
## Current Task
Analyze this Discord message and decide if you would respond to it.

Current Discord message: "${messageContent}"

Respond with EXACTLY this format:
RESPOND: yes or no
MESSAGE: <your response if yes, or leave empty if no>

Remember: Only respond if it's relevant to your interests or expertise. Be authentic and specific.`;
}

export type { LLMResponse };

