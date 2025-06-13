import { PromptRegistry, PromptType } from '@/services/llm/promptManager';
import { logger } from '@/services/logger';
import { getPersonalityService } from '@/services/personalityService';
import { createReplyBot } from '@/starbunk/bots/core';
import { COVA_BOT_PROMPTS } from './constants';
import { covaDirectMentionTrigger, covaStatsCommandTrigger, covaTrigger } from './triggers';

interface CovaBotConfig {
	prompts: {
		emulator: string;
		decision: string;
	};
	embedding?: Float32Array;
}

// --- CovaBotFactory Class (Restore logic to public static methods) ---

export class CovaBotFactory {
	// Restore public static initializePrompts method
	public static async initializePrompts(): Promise<void> {
		PromptRegistry.registerPrompt(PromptType.COVA_EMULATOR, {
			systemContent: COVA_BOT_PROMPTS.EmulatorPrompt,
			formatUserMessage: (message: string): string => message,
			defaultTemperature: 0.7,
			defaultMaxTokens: 250,
		});

		PromptRegistry.registerPrompt(PromptType.COVA_DECISION, {
			systemContent: COVA_BOT_PROMPTS.DecisionPrompt,
			formatUserMessage: (message: string): string => message,
			defaultTemperature: 0.2,
			defaultMaxTokens: 10,
		});
	}

	// Restore public static loadPersonalityEmbedding method
	public static async loadPersonalityEmbedding(): Promise<Float32Array | undefined> {
		const personalityService = getPersonalityService();
		logger.info('[CovaBot] Loading personality embedding...');

		// Try NPY format first
		const npyEmbedding = await personalityService.loadPersonalityEmbedding('personality.npy', 'covaBot');
		if (npyEmbedding) {
			logger.info('[CovaBot] NPY personality embedding loaded successfully');
			return npyEmbedding;
		}

		// Try JSON format
		logger.info('[CovaBot] NPY personality embedding not found, trying JSON format...');
		const jsonEmbedding = await personalityService.loadPersonalityEmbedding('personality.json', 'covaBot');
		if (jsonEmbedding) {
			logger.info('[CovaBot] JSON personality embedding loaded successfully');
			return jsonEmbedding;
		}

		// Generate new embedding
		logger.info('[CovaBot] Generating new personality embedding from prompt...');
		const newEmbedding = await personalityService.generatePersonalityEmbedding(
			COVA_BOT_PROMPTS.EmulatorPrompt,
			'personality.json',
			'covaBot',
		);

		if (newEmbedding) {
			logger.info('[CovaBot] Successfully generated and saved new personality embedding');
			return newEmbedding;
		}

		logger.warn('[CovaBot] Failed to generate personality embedding, will use default behavior');
		return undefined;
	}

	public static async initialize(): Promise<CovaBotConfig> {
		try {
			// Call the static methods on the class
			await CovaBotFactory.initializePrompts();
			const embedding = await CovaBotFactory.loadPersonalityEmbedding();

			return {
				embedding: embedding,
				prompts: {
					emulator: COVA_BOT_PROMPTS.EmulatorPrompt,
					decision: COVA_BOT_PROMPTS.DecisionPrompt,
				},
			};
		} catch (error) {
			logger.error(
				`[CovaBot] Error during initialization: ${error instanceof Error ? error.message : String(error)}`,
			);
			logger.warn('[CovaBot] Continuing with default behavior');

			// Ensure prompts are still returned even on error
			return {
				prompts: {
					emulator: COVA_BOT_PROMPTS.EmulatorPrompt,
					decision: COVA_BOT_PROMPTS.DecisionPrompt,
				},
			};
		}
	}
}

// Export initialization function (calls the factory method)
export const initializeCovaBot = CovaBotFactory.initialize;

// Create and export the bot instance
export default createReplyBot({
	name: 'CovaBot',
	description: 'LLM-powered CovaBot that responds to messages based on personality vectors',
	defaultIdentity: {
		botName: 'Cova',
		avatarUrl: '', // Will be overridden by dynamic identity from Cova's Discord user
	},
	triggers: [
		covaStatsCommandTrigger, // Highest priority - command for debugging
		covaDirectMentionTrigger, // Higher priority - always respond to direct mentions
		covaTrigger, // Normal priority - use LLM to decide if should respond
	],
});
