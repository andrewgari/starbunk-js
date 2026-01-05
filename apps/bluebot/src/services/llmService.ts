import { OpenAI } from 'openai';
import { logger, ensureError } from '@starbunk/shared';

export class LLMService {
	private openai: OpenAI | null = null;

	constructor() {
		const apiKey = process.env.OPENAI_API_KEY;
		if (apiKey && apiKey.trim().length > 0) {
			this.openai = new OpenAI({ apiKey });
		} else {
			logger.info('[LLMService] OpenAI API key not configured, LLM detection will be disabled');
		}
	}

	async detect(content: string, prompt: string): Promise<boolean> {
		if (!this.openai) {
			logger.debug('[LLMService] OpenAI not configured, skipping LLM detection');
			return false;
		}

		try {
			const response = await this.openai.chat.completions.create({
				model: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
				messages: [
					{ role: 'system', content: prompt },
					{ role: 'user', content: content },
				],
				temperature: 0.1,
				max_tokens: 10,
			});

			const result = response.choices[0]?.message?.content?.toLowerCase().trim();
			return result === 'yes';
		} catch (error) {
			logger.error('[LLMService] LLM detection error:', ensureError(error));
			return false;
		}
	}
}
