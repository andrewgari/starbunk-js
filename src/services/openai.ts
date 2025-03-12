import { Logger } from './logger';

// Import OpenAI directly from the package
const OpenAI = require('openai').default;

/**
 * OpenAI client wrapper
 */
export class OpenAIClient {
	private static instance: OpenAIClient | null = null;
	private client: any;
	private logger = new Logger();

	private constructor() {
		const apiKey = process.env.OPENAI_API_KEY;

		if (!apiKey) {
			this.logger.error('OpenAI API key not found in environment variables');
			return;
		}

		this.client = new OpenAI({
			apiKey: apiKey
		});
	}

	/**
	 * Get the OpenAI client instance (singleton)
	 */
	public static getInstance(): OpenAIClient {
		if (!OpenAIClient.instance) {
			OpenAIClient.instance = new OpenAIClient();
		}
		return OpenAIClient.instance;
	}

	/**
	 * Access to the chat completions API
	 */
	public get chat() {
		return this.client?.chat;
	}

	/**
	 * Check if the client is properly initialized
	 */
	public get isInitialized(): boolean {
		return !!this.client;
	}
}

/**
 * Get the OpenAI client instance
 */
export function getOpenAIClient(): OpenAIClient {
	return OpenAIClient.getInstance();
}

// Export a singleton instance for convenience
export const openAIClient = getOpenAIClient();
