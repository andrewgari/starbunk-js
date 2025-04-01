import { logger } from '../../../../services/logger';
import { getPersonalityService } from '../../../../services/personalityService';
import { createStrategyBot } from '../../core/bot-builder';
import { covaTrigger, covaDirectMentionTrigger, covaStatsCommandTrigger } from './triggers';
import { PromptType, PromptRegistry } from '../../../../services/llm/promptManager';
import { COVA_BOT_PROMPTS } from './constants';

// Export initialization function
export async function initializeCovaBot(): Promise<void> {
	try {
		// Register both prompts for CovaBot
		PromptRegistry.registerPrompt(PromptType.COVA_EMULATOR, {
			systemContent: COVA_BOT_PROMPTS.EmulatorPrompt,
			formatUserMessage: (message: string): string => message,
			defaultTemperature: 0.7,
			defaultMaxTokens: 250
		});

		PromptRegistry.registerPrompt(PromptType.COVA_DECISION, {
			systemContent: COVA_BOT_PROMPTS.DecisionPrompt,
			formatUserMessage: (message: string): string => message,
			defaultTemperature: 0.2,
			defaultMaxTokens: 10
		});

		// Load or generate personality embedding
		const personalityService = getPersonalityService();
		logger.info('[CovaBot] Loading personality embedding...');
		
		// Try to load NPY file first, fall back to JSON if not found
		const embedding = await personalityService.loadPersonalityEmbedding('personality.npy', 'covaBot');

		if (!embedding) {
			// Try fallback to JSON format
			logger.info('[CovaBot] NPY personality embedding not found, trying JSON format...');
			const jsonEmbedding = await personalityService.loadPersonalityEmbedding('personality.json', 'covaBot');

			if (!jsonEmbedding) {
				logger.warn('[CovaBot] No personality embedding files found. Using default behavior.');

				// Generate a new embedding from the prompt if none exists
				logger.info('[CovaBot] Generating new personality embedding from prompt...');
				const promptText = COVA_BOT_PROMPTS.EmulatorPrompt;

				if (promptText) {
					const newEmbedding = await personalityService.generatePersonalityEmbedding(
						promptText,
						'personality.json',
						'covaBot'
					);

					if (newEmbedding) {
						logger.info('[CovaBot] Successfully generated and saved new personality embedding');
					} else {
						logger.warn('[CovaBot] Failed to generate new personality embedding, continuing with default behavior');
					}
				}
			} else {
				logger.info('[CovaBot] JSON personality embedding loaded successfully');
			}
		} else {
			logger.info('[CovaBot] NPY personality embedding loaded successfully');
		}
	} catch (error) {
		logger.error(`[CovaBot] Error during personality initialization: ${error instanceof Error ? error.message : String(error)}`);
		logger.warn('[CovaBot] Continuing with default behavior due to embedding initialization error');
		// Don't throw error, continue with default behavior
	}
}

// Create and export the bot instance
export default createStrategyBot({
	name: 'CovaBot',
	description: 'LLM-powered CovaBot that responds to messages based on personality vectors',
	defaultIdentity: {
		botName: 'Cova',
		avatarUrl: '' // Will be overridden by dynamic identity from Cova's Discord user
	},
	skipBotMessages: true,
	triggers: [
		covaStatsCommandTrigger, // Highest priority - command for debugging
		covaDirectMentionTrigger, // Higher priority - always respond to direct mentions
		covaTrigger // Normal priority - use LLM to decide if should respond
	]
});
