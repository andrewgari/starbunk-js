import { logger } from '../logger';
import { LLMProviderType } from './llmFactory';
import { LLMManager } from './llmManager';
import { LLMMessage } from './llmService';

/**
 * Provides standard, generic LLM interaction capabilities.
 */
export class StandardLLMService {
	private static instance: StandardLLMService;
	private llmManager: LLMManager;
	private isInitialized = false;

	private constructor() {
		// Initialize LLMManager, potentially choosing provider based on env or config
		// Using OLLAMA as default for now, mirroring GameLLMService
		this.llmManager = new LLMManager(logger, LLMProviderType.OLLAMA);
	}

	private async initialize(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		try {
			logger.info('[StandardLLMService] Initializing LLM providers...');
			await this.llmManager.initializeAllProviders();

			const defaultProvider = this.llmManager.getDefaultProvider();
			if (!defaultProvider) {
				logger.error('[StandardLLMService] No default LLM provider available after initialization');
				throw new Error('No default LLM provider available');
			} else {
				logger.info('[StandardLLMService] Successfully initialized with default provider:', defaultProvider.getProviderName());
				this.isInitialized = true;
			}
		} catch (error) {
			logger.error('[StandardLLMService] Error during initialization:', error instanceof Error ? error : new Error(String(error)));
			throw error; // Re-throw to indicate failure
		}
	}

	public static async getInstance(): Promise<StandardLLMService> {
		if (!StandardLLMService.instance) {
			logger.debug('[StandardLLMService] Creating new instance...');
			StandardLLMService.instance = new StandardLLMService();
			await StandardLLMService.instance.initialize();
		} else if (!StandardLLMService.instance.isInitialized) {
			// Ensure initialization if instance exists but wasn't ready
			await StandardLLMService.instance.initialize();
		}
		return StandardLLMService.instance;
	}

	private async ensureInitialized(): Promise<void> {
		if (!this.isInitialized) {
			await this.initialize();
		}
	}

	/**
	 * Generates a text response from the LLM based on a user prompt and optional system prompt.
	 * @param prompt The user's prompt.
	 * @param systemPrompt An optional system message to guide the LLM's behavior.
	 * @returns The generated text content.
	 */
	public async generateText(prompt: string, systemPrompt?: string): Promise<string> {
		await this.ensureInitialized();

		logger.debug('[StandardLLMService] Generating text response...', {
			promptLength: prompt.length,
			hasSystemPrompt: !!systemPrompt,
		});

		try {
			const provider = this.llmManager.getDefaultProvider();
			if (!provider) {
				logger.error('[StandardLLMService] No LLM provider available');
				throw new Error('No LLM provider available');
			}

			const messages: LLMMessage[] = [
				...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
				{ role: 'user' as const, content: prompt },
			];

			// Use the createCompletion method from the provider
			const response = await provider.createCompletion({ messages });

			logger.debug('[StandardLLMService] Raw LLM response:', response.content);
			return response.content.trim();
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error('[StandardLLMService] Error generating text response:', new Error(errorMessage));
			throw error; // Let the caller handle the error
		}
	}
}
