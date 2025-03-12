// Use dynamic require to avoid path resolution issues
const { default: OpenAI } = require('openai');
import { Logger, logger } from '../services/logger';

// OpenAIClient is a wrapper around the OpenAI client
export class OpenAIClient {
	private client: any;

	constructor(private logger: Logger) {
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			logger.error('OpenAI API key not found in environment variables');
			throw new Error('OpenAI API key not found in environment variables');
		}

		this.client = new OpenAI({ apiKey });
		this.logger.debug('OpenAI client initialized');
	}

	// Expose the chat completions API
	get chat() {
		return this.client.chat;
	}
}

// Singleton instance
const openAIClientInstance = new OpenAIClient(logger);

// Export a function to get the singleton instance
export function getOpenAIClient(): OpenAIClient {
	return openAIClientInstance;
}
