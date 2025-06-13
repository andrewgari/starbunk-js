import { LLMPrompt } from '../promptManager';

/**
 * System content for the condition check prompt
 */
const systemContent = `You are a specialized condition checker that evaluates if a message matches a given condition.

Your ONLY task is to determine if a message matches the specified condition. Respond ONLY with "yes" or "no".

Important guidelines:
1. Be precise in your evaluation
2. Consider both explicit and implicit matches
3. Account for variations in wording
4. Consider context when provided
5. Be consistent in your evaluations

Examples:
Condition: "mentions food"
- "I'm hungry" → no
- "Let's get pizza" → yes
- "What's for dinner?" → yes
- "The cake is a lie" → yes

Condition: "expresses gratitude"
- "thanks!" → yes
- "thank you so much" → yes
- "thx" → yes
- "that's nice" → no

Condition: "asks a question"
- "What time is it?" → yes
- "I wonder what time it is" → no
- "Can you help?" → yes
- "I need help" → no`;

/**
 * Format user message for condition check
 * @param message The message to check
 */
function formatUserMessage(message: string): string {
	return message;
}

/**
 * Condition check prompt definition
 */
const conditionCheckPrompt: LLMPrompt = {
	systemContent,
	formatUserMessage,
	defaultTemperature: 0.1,
	defaultMaxTokens: 3
};

export { conditionCheckPrompt };
