import { PromptRegistry, PromptType } from '../promptManager';
import { blueBotAcknowledgmentPrompt, blueBotSentimentPrompt } from './blueBotAcknowledgmentPrompt';
import { blueDetectorPromptObj } from './blueDetectorPrompt';
import { conditionCheckPrompt } from './conditionCheckPrompt';

// Register all prompts
export function registerPrompts(): void {
	PromptRegistry.registerPrompt(PromptType.BLUE_DETECTOR, blueDetectorPromptObj);
	PromptRegistry.registerPrompt(PromptType.BLUE_ACKNOWLEDGMENT, blueBotAcknowledgmentPrompt);
	PromptRegistry.registerPrompt(PromptType.BLUE_SENTIMENT, blueBotSentimentPrompt);
	PromptRegistry.registerPrompt(PromptType.CONDITION_CHECK, conditionCheckPrompt);
}
