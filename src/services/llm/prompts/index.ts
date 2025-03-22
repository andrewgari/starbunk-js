import { PromptRegistry, PromptType } from '../promptManager';
import {
	blueBotAcknowledgmentPrompt as blueBotAcknowledgmentPromptObj,
	blueBotSentimentPrompt as blueBotSentimentPromptObj,
	formatBlueBotAcknowledgmentPrompt,
	formatBlueBotSentimentPrompt
} from './blueBotAcknowledgmentPrompt';
import { blueDetectorPrompt, formatBlueDetectorUserPrompt } from './blueDetectorPrompt';
import { covaEmulatorPrompt } from './covaEmulatorPrompt';
import {
	geraldPersonaPrompt,
	geraldResponseDecisionPrompt,
	geraldResponseGenerationPrompt
} from './geraldPrompt';

// Export all prompts
export * from './blueBotAcknowledgmentPrompt';
export * from './blueDetectorPrompt';
export * from './covaEmulatorPrompt';
export * from './geraldPrompt';

/**
 * Format user message for Cova Emulator prompt
 */
export function formatCovaEmulatorUserPrompt(message: string): string {
	return message;
}

/**
 * Format user message for Gerald prompts
 */
export function formatGeraldPrompt(message: string): string {
	return message;
}

/**
 * Format user message for Gerald response generation
 */
export function formatGeraldResponsePrompt(message: string): string {
	return geraldResponseGenerationPrompt.replace('[MESSAGE]', message);
}

/**
 * Register all prompts with the PromptRegistry
 */
export function registerAllPrompts(): void {
	// Register Blue Detector prompt
	PromptRegistry.registerPrompt(PromptType.BLUE_DETECTOR, {
		systemContent: blueDetectorPrompt,
		formatUserMessage: formatBlueDetectorUserPrompt,
		defaultTemperature: 0.1,
		defaultMaxTokens: 3
	});

	// Register Blue Acknowledgment prompt
	PromptRegistry.registerPrompt(PromptType.BLUE_ACKNOWLEDGMENT, {
		systemContent: blueBotAcknowledgmentPromptObj.systemContent,
		formatUserMessage: formatBlueBotAcknowledgmentPrompt,
		defaultTemperature: 0.1,
		defaultMaxTokens: 3
	});

	// Register Blue Sentiment prompt
	PromptRegistry.registerPrompt(PromptType.BLUE_SENTIMENT, {
		systemContent: blueBotSentimentPromptObj.systemContent,
		formatUserMessage: formatBlueBotSentimentPrompt,
		defaultTemperature: 0.1,
		defaultMaxTokens: 10
	});

	// Register Cova Emulator prompt
	PromptRegistry.registerPrompt(PromptType.COVA_EMULATOR, {
		systemContent: covaEmulatorPrompt,
		formatUserMessage: formatCovaEmulatorUserPrompt,
		defaultTemperature: 0.7,
		defaultMaxTokens: 150
	});

	// Register Gerald Persona prompt
	PromptRegistry.registerPrompt(PromptType.GERALD_PERSONA, {
		systemContent: geraldPersonaPrompt,
		formatUserMessage: formatGeraldPrompt,
		defaultTemperature: 0.7,
		defaultMaxTokens: 150
	});

	// Register Gerald Decision prompt
	PromptRegistry.registerPrompt(PromptType.GERALD_DECISION, {
		systemContent: geraldResponseDecisionPrompt,
		formatUserMessage: formatGeraldPrompt,
		defaultTemperature: 0.1,
		defaultMaxTokens: 3
	});

	// Register Gerald Response Generation prompt
	PromptRegistry.registerPrompt(PromptType.GERALD_RESPONSE, {
		systemContent: '',  // Empty because we include system content in the formatted message
		formatUserMessage: formatGeraldResponsePrompt,
		defaultTemperature: 0.7,
		defaultMaxTokens: 150
	});
}
