import { logger } from '../../logger';
import { LLMProviderType } from '../llmFactory';
import { LLMMessage } from '../llmService';
import promptKit from '../promptKit';

/**
 * This file contains examples demonstrating how to use the PromptKit
 * for various common scenarios.
 */

/**
 * Example: Setting up personalities
 */
async function setupPersonalitiesExample(): Promise<void> {
	try {
		// Register a helpful assistant personality
		promptKit.registerPersonality({
			name: 'helpfulAssistant',
			systemPrompt: `You are a helpful assistant. You provide clear, concise, and accurate information.
Your tone is friendly but professional. You prioritize accuracy and brevity in your responses.`,
			temperature: 0.7,
			maxTokens: 150,
			defaultModel: 'llama2'
		});

		// Register a technical expert personality
		promptKit.registerPersonality({
			name: 'techExpert',
			systemPrompt: `You are a technical expert specialized in software development.
You provide in-depth technical explanations using precise terminology. Your answers should be
technically accurate and thorough, but still accessible to someone with basic technical knowledge.`,
			temperature: 0.5,
			maxTokens: 300,
			defaultModel: 'llama2'
		});

		// Register a creative storyteller personality
		promptKit.registerPersonality({
			name: 'storyteller',
			systemPrompt: `You are a creative storyteller. You weave imaginative narratives with vivid details.
Your style is engaging and descriptive, with rich character development and interesting plots.`,
			temperature: 0.9,
			maxTokens: 500,
			defaultModel: 'llama2'
		});

		logger.info('Registered example personalities');
	} catch (error) {
		const typedError = error instanceof Error ? error : new Error(String(error));
		logger.error('Error setting up personalities:', typedError);
	}
}

/**
 * Example: Using yes/no questions
 */
async function yesNoQuestionExample(): Promise<void> {
	const question = "Does this text contain a request for technical support?";
	const systemPrompt = `You are a content classifier. You determine if the given text contains
a request for technical support or assistance with a technical problem.`;

	try {
		logger.info(`Asking boolean question: "${question}"`);

		const result = await promptKit.askBoolean(question, systemPrompt, {
			temperature: 0.1,
			maxTokens: 5,
			providerType: LLMProviderType.OLLAMA
		});

		logger.info(`Contains technical support request: ${result}`);
	} catch (error) {
		const typedError = error instanceof Error ? error : new Error(String(error));
		logger.error('Error in yes/no example:', typedError);
	}
}

/**
 * Example: Conversational chat with different personalities
 */
async function conversationalChatExample(): Promise<void> {
	const userMessage = "Can you explain how blockchain technology works?";

	try {
		logger.info(`Starting conversation with prompt: "${userMessage}"`);

		// Get a response from the helpful assistant
		logger.info('Getting response from helpful assistant...');
		const assistantResponse = await promptKit.chat(
			userMessage,
			'helpfulAssistant',
			{
				providerType: LLMProviderType.OLLAMA,
				temperature: 0.7,
				maxTokens: 150
			}
		);

		// Get a response from the technical expert
		logger.info('Getting response from technical expert...');
		const expertResponse = await promptKit.chat(
			userMessage,
			'techExpert',
			{
				providerType: LLMProviderType.OLLAMA,
				temperature: 0.5,
				maxTokens: 300
			}
		);

		logger.info(`Helpful assistant response: "${truncateText(assistantResponse, 100)}"`);
		logger.info(`Technical expert response: "${truncateText(expertResponse, 100)}"`);
	} catch (error) {
		const typedError = error instanceof Error ? error : new Error(String(error));
		logger.error('Error in conversational chat example:', typedError);
	}
}

/**
 * Example: Direct message chain (for multi-turn conversations)
 */
async function directMessageChainExample(): Promise<void> {
	try {
		logger.info('Starting multi-turn conversation example...');

		const messages: LLMMessage[] = [
			{
				role: 'system',
				content: 'You are a helpful and concise AI assistant that specializes in answering coding questions.'
			},
			{
				role: 'user',
				content: 'How do I use async/await in JavaScript?'
			},
			{
				role: 'assistant',
				content: 'Async/await is a syntax in JavaScript for handling asynchronous operations. Mark functions with "async" and use "await" to pause execution until promises resolve.'
			},
			{
				role: 'user',
				content: 'Can you show me a practical example?'
			}
		];

		const response = await promptKit.complete(messages, {
			temperature: 0.5,
			maxTokens: 250,
			provider: LLMProviderType.OLLAMA
		});

		logger.info(`Final response: "${truncateText(response, 100)}"`);
	} catch (error) {
		const typedError = error instanceof Error ? error : new Error(String(error));
		logger.error('Error in direct message chain example:', typedError);
	}
}

/**
 * Helper function to truncate long text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
	if (!text) return '';
	return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}

/**
 * Run all examples
 */
export async function runPromptKitExamples(): Promise<void> {
	logger.info('Running PromptKit examples...');

	try {
		await setupPersonalitiesExample();
		await yesNoQuestionExample();
		await conversationalChatExample();
		await directMessageChainExample();

		logger.info('PromptKit examples completed successfully');
	} catch (error) {
		const typedError = error instanceof Error ? error : new Error(String(error));
		logger.error('Error running PromptKit examples:', typedError);
	}
}

// Export default for easy importing
export default { runPromptKitExamples };
