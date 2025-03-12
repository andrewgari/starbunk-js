// Import OpenAI properly
import OpenAI from 'openai';
import { Logger, logger } from '../services/logger';

// Define interface for OpenAI chat API with more specific types
interface OpenAIChatAPI {
	completions: {
		create: (params: OpenAICompletionParams) => Promise<OpenAICompletionResponse>;
	};
}

// Define types for OpenAI API parameters and responses
interface OpenAICompletionParams {
	model: string;
	messages: Array<{ role: string; content: string }>;
	max_tokens?: number;
	temperature?: number;
	[key: string]: unknown;
}

interface OpenAICompletionResponse {
	choices: Array<{ message: { content: string } }>;
	[key: string]: unknown;
}

// OpenAIClient is a wrapper around the OpenAI client
export class OpenAIClient {
	private client: OpenAI;

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
	get chat(): OpenAIChatAPI {
		return this.client.chat as unknown as OpenAIChatAPI;
	}
}

// Singleton instance
const openAIClientInstance = new OpenAIClient(logger);

// Export a function to get the singleton instance
export function getOpenAIClient(): OpenAIClient {
	return openAIClientInstance;
}
