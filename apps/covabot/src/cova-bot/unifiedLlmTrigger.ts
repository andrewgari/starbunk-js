import { Message } from 'discord.js';
import { logger, ensureError } from '@starbunk/shared';
import { TriggerCondition, ResponseGenerator } from '../types/triggerResponse';
import { COVA_BOT_PROMPTS } from './constants';

/**
 * Unified LLM response that combines decision + generation in a single call
 * Returns structured response: RESPOND: yes/no\nMESSAGE: <response>
 */
interface UnifiedLLMResponse {
	shouldRespond: boolean;
	message: string;
	rawResponse: string;
}

/**
 * Parse unified LLM response format
 * Expected format: RESPOND: yes/no\nMESSAGE: <response text>
 */
function parseUnifiedResponse(rawResponse: string): UnifiedLLMResponse {
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
 * Create unified LLM response decision condition
 * Uses single LLM call to decide if should respond
 */
export function createUnifiedLLMCondition(): TriggerCondition {
	return async (message: Message): Promise<boolean> => {
		try {
			if (!message.content.trim()) {
				logger.debug('[CovaBot] Unified LLM: skipping empty message');
				return false;
			}

			const response = await callUnifiedLLM(message);
			logger.debug(`[CovaBot] Unified LLM decision: ${response.shouldRespond ? 'YES' : 'NO'}`);
			return response.shouldRespond;
		} catch (error) {
			logger.error('[CovaBot] Error in unified LLM condition:', ensureError(error));
			return false;
		}
	};
}

/**
 * Create unified LLM response generator
 * Uses single LLM call to generate response
 */
export function createUnifiedLLMResponse(): ResponseGenerator {
	return async (message: Message): Promise<string> => {
		try {
			const response = await callUnifiedLLM(message);

			if (!response.message || !response.message.trim()) {
				logger.debug('[CovaBot] Unified LLM: empty response, remaining silent');
				return '';
			}

			logger.debug(`[CovaBot] Unified LLM response: ${response.message.substring(0, 50)}...`);
			return response.message.trim();
		} catch (error) {
			logger.error('[CovaBot] Error in unified LLM response:', ensureError(error));
			return '';
		}
	};
}

/**
 * Call unified LLM with combined decision + response prompt
 */
async function callUnifiedLLM(message: Message): Promise<UnifiedLLMResponse> {
	const apiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
	const model = process.env.OLLAMA_MODEL || 'mistral:latest';

	try {
		const prompt = buildUnifiedPrompt(message.content);

		logger.debug(`[CovaBot] Calling unified LLM at ${apiUrl}`);

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

		return parseUnifiedResponse(data.response);
	} catch (error) {
		logger.error('[CovaBot] Unified LLM call failed:', ensureError(error));
		// Return empty response on failure - no fallback
		return {
			shouldRespond: false,
			message: '',
			rawResponse: '',
		};
	}
}

/**
 * Build unified prompt that combines decision + response generation
 */
function buildUnifiedPrompt(messageContent: string): string {
	return `${COVA_BOT_PROMPTS.UnifiedPrompt}

Current Discord message: "${messageContent}"

Respond with:
RESPOND: yes or no
MESSAGE: <your response if yes, or empty if no>`;
}

export type { UnifiedLLMResponse };

