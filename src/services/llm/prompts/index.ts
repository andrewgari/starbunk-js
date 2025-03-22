import { PromptRegistry, PromptType } from '../promptManager';
import {
	blueBotAcknowledgmentPrompt as blueBotAcknowledgmentPromptObj,
	blueBotSentimentPrompt as blueBotSentimentPromptObj,
	formatBlueBotAcknowledgmentPrompt,
	formatBlueBotSentimentPrompt
} from './blueBotAcknowledgmentPrompt';
import { blueDetectorPrompt, formatBlueDetectorUserPrompt } from './blueDetectorPrompt';
import { covaEmulatorPrompt } from './covaEmulatorPrompt';

// Export all prompts
export * from './blueBotAcknowledgmentPrompt';
export * from './blueDetectorPrompt';
export * from './covaEmulatorPrompt';

/**
 * Format user message for Cova Emulator prompt
 */
export function formatCovaEmulatorUserPrompt(message: string): string {
	return message;
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
}
