import { logger } from '../../logger';
import { LLMProviderType } from '../llmFactory';
import { LLMMessage } from '../llmService';
import promptKit from '../promptKit';

/**
 * Simple test script to verify PromptKit functionality
 */
async function runPromptKitTests(): Promise<void> {
	logger.info('=== Starting PromptKit Tests ===');

	// Test registering personalities
	logger.info('\n--- Testing personality registration ---');
	try {
		promptKit.registerPersonality({
			name: 'testPersonality',
			systemPrompt: 'You are a test assistant. Keep responses brief and to the point.',
			temperature: 0.5,
			maxTokens: 100
		});
		logger.info('✅ Personality registration successful');

		const retrievedPersonality = promptKit.getPersonality('testPersonality');
		logger.info(`✅ Retrieved personality: ${retrievedPersonality ? 'success' : 'failed'}`);
	} catch (error) {
		const typedError = error instanceof Error ? error : new Error(String(error));
		logger.error('❌ Personality registration failed:', typedError);
	}

	// Test boolean questions
	logger.info('\n--- Testing boolean questions ---');
	try {
		logger.info('Test question: "Is the sky typically blue?"');
		const isSkyBlue = await promptKit.askBoolean(
			'Is the sky typically blue?',
			'You are a factual assistant that answers simple yes/no questions about basic facts.',
			{
				temperature: 0.1,
				maxTokens: 5,
				providerType: LLMProviderType.OLLAMA
			}
		);
		logger.info(`✅ Boolean response received: ${isSkyBlue}`);
	} catch (error) {
		const typedError = error instanceof Error ? error : new Error(String(error));
		logger.error('❌ Boolean question test failed:', typedError);
	}

	// Test chat with personality
	logger.info('\n--- Testing chat with personality ---');
	try {
		const chatResponse = await promptKit.chat(
			'What is your purpose?',
			'testPersonality',
			{
				temperature: 0.5,
				maxTokens: 100,
				providerType: LLMProviderType.OLLAMA
			}
		);
		logger.info(`✅ Chat response received: "${chatResponse}"`);
	} catch (error) {
		const typedError = error instanceof Error ? error : new Error(String(error));
		logger.error('❌ Chat test failed:', typedError);
	}

	// Test direct completion
	logger.info('\n--- Testing direct completion ---');
	try {
		const messages: LLMMessage[] = [
			{
				role: 'system',
				content: 'You are a helpful assistant. Keep responses brief.'
			},
			{
				role: 'user',
				content: 'Say hello'
			}
		];

		const directResponse = await promptKit.complete(
			messages,
			{
				temperature: 0.5,
				maxTokens: 50,
				provider: LLMProviderType.OLLAMA
			}
		);
		logger.info(`✅ Direct completion response: "${directResponse}"`);
	} catch (error) {
		const typedError = error instanceof Error ? error : new Error(String(error));
		logger.error('❌ Direct completion test failed:', typedError);
	}

	logger.info('\n=== PromptKit Tests Completed ===');
}

// Export for running from command line
export { runPromptKitTests };
export default { runPromptKitTests };
