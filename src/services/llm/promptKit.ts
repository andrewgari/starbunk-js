import { getLLMManager } from '../bootstrap';
import { LLMProviderType } from './llmFactory';
import { LLMCompletionOptions, LLMMessage } from './llmService';
import { PromptType, formatPromptMessages } from './promptManager';

/**
 * Personality template for creating consistent AI personalities
 */
export interface PersonalityTemplate {
	/** The name of the personality */
	name: string;
	/** The system prompt that defines this personality */
	systemPrompt: string;
	/** Default temperature (0-1) affecting response randomness */
	temperature?: number;
	/** Default max tokens to generate */
	maxTokens?: number;
	/** Default model to use */
	defaultModel?: string;
}

/**
 * Simple response options for generating terse responses
 */
export interface SimpleResponseOptions {
	/** The response format (yes/no, number, single word, etc.) */
	format: 'boolean' | 'number' | 'single-word' | 'short-phrase';
	/** Default temperature (should be low for deterministic responses) */
	temperature?: number;
	/** Maximum tokens (should be low for terse responses) */
	maxTokens?: number;
	/** Default model to use */
	model?: string;
	/** Provider type to use */
	providerType?: LLMProviderType;
}

/**
 * Conversation response options
 */
export interface ConversationOptions {
	/** Temperature for response generation (higher = more creative) */
	temperature?: number;
	/** Maximum tokens to generate */
	maxTokens?: number;
	/** Default model to use */
	model?: string;
	/** Provider type to use */
	providerType?: LLMProviderType;
}

/**
 * PromptKit - A simplified API for working with LLM prompts
 */
export class PromptKit {
	private personalityTemplates: Map<string, PersonalityTemplate> = new Map();

	/**
   * Register a personality template
   */
	public registerPersonality(personality: PersonalityTemplate): void {
		this.personalityTemplates.set(personality.name, personality);
	}

	/**
   * Get a registered personality by name
   */
	public getPersonality(name: string): PersonalityTemplate | undefined {
		return this.personalityTemplates.get(name);
	}

	/**
   * Create a simple yes/no response
   * @param question The question to ask
   * @param systemPrompt The system prompt to use
   * @param options Additional options
   * @returns A boolean response (true = yes, false = no)
   */
	public async askBoolean(
		question: string,
		systemPrompt: string,
		options: Partial<SimpleResponseOptions> = {}
	): Promise<boolean> {
		const llmManager = getLLMManager();

		if (!llmManager) {
			throw new Error('LLM Manager is not available');
		}

		const messages: LLMMessage[] = [
			{
				role: 'system',
				content: `${systemPrompt}\n\nYou must respond with ONLY a single word: "yes" or "no", nothing else. No explanation, no punctuation.`
			},
			{
				role: 'user',
				content: question
			}
		];

		const completion = await llmManager.createCompletion({
			model: options.model || 'llama2',
			provider: options.providerType || LLMProviderType.OLLAMA,
			messages,
			temperature: options.temperature || 0.1,
			maxTokens: options.maxTokens || 5
		});

		const response = completion?.content?.trim().toLowerCase() || '';
		// More robust handling for possible responses
		return response.includes('yes') || response === 'true' || response === 'correct' || response === '1';
	}

	/**
   * Get a conversational response using a specific personality
   * @param message The user message
   * @param personalityName The name of the registered personality to use
   * @param options Additional options
   * @returns A conversational response
   */
	public async chat(
		message: string,
		personalityName: string,
		options: Partial<ConversationOptions> = {}
	): Promise<string> {
		const personality = this.personalityTemplates.get(personalityName);
		if (!personality) {
			throw new Error(`Personality "${personalityName}" not found`);
		}

		const llmManager = getLLMManager();

		if (!llmManager) {
			throw new Error('LLM Manager is not available');
		}

		const messages: LLMMessage[] = [
			{
				role: 'system',
				content: personality.systemPrompt
			},
			{
				role: 'user',
				content: message
			}
		];

		const completion = await llmManager.createCompletion({
			model: options.model || personality.defaultModel || 'llama2',
			provider: options.providerType || LLMProviderType.OLLAMA,
			messages,
			temperature: options.temperature || personality.temperature || 0.7,
			maxTokens: options.maxTokens || personality.maxTokens || 150
		});

		return completion?.content || 'Sorry, I could not generate a response.';
	}

	/**
   * Get a response using a registered prompt type
   * @param promptType The registered prompt type to use
   * @param message The user message
   * @param options Additional options
   * @returns A response based on the registered prompt
   */
	public async prompt(
		promptType: PromptType,
		message: string,
		options: Partial<ConversationOptions> = {}
	): Promise<string> {
		const llmManager = getLLMManager();

		if (!llmManager) {
			throw new Error('LLM Manager is not available');
		}

		try {
			// Use the existing prompt registry
			const formattedMessages = formatPromptMessages(promptType, message);

			const completion = await llmManager.createCompletion({
				model: options.model || 'llama2',
				provider: options.providerType || LLMProviderType.OLLAMA,
				messages: formattedMessages,
				temperature: options.temperature || 0.7,
				maxTokens: options.maxTokens || 150
			});

			return completion?.content || 'Sorry, I could not generate a response.';
		} catch (error) {
			throw new Error(`Error using prompt type ${promptType}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
   * Create a direct LLM completion with custom messages
   * @param messages The messages to send
   * @param options Additional options
   * @returns The LLM completion response
   */
	public async complete(
		messages: LLMMessage[],
		options: Partial<LLMCompletionOptions> = {}
	): Promise<string> {
		const llmManager = getLLMManager();

		if (!llmManager) {
			throw new Error('LLM Manager is not available');
		}

		try {
			const completion = await llmManager.createCompletion({
				model: options.model || 'llama2',
				provider: options.provider || LLMProviderType.OLLAMA,
				messages,
				temperature: options.temperature || 0.7,
				maxTokens: options.maxTokens || 150,
				...options
			});

			return completion?.content || 'Sorry, I could not generate a response.';
		} catch (error) {
			throw new Error(`Error completing prompt: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}

// Create a singleton instance
export const promptKit = new PromptKit();

// Export default for convenience
export default promptKit;
