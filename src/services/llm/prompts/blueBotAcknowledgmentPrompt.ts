import { LLMPrompt, PromptRegistry, PromptType } from '../promptManager';

/**
 * System content for the BlueBot acknowledgment detector
 */
const acknowledgmentSystemContent = `You determine if a message is acknowledging or responding to BlueBot after it has detected a blue reference.

Your ONLY task is to determine if the message is directly engaging with, acknowledging, or responding to BlueBot's presence or detection. Respond ONLY with "yes" or "no".

Context: BlueBot responds with "Did somebody say BLU?" when it detects blue references. Users may acknowledge this in various ways.

Examples of acknowledgments:
- "Dang, the Bluebot got me" → yes
- "Hehe Bluebot caught you" → yes
- "Oh it must have been when I said 'Blueberry'" → yes
- "Leave me alone you stupid bot" → yes
- "I hate when this happens" → yes (if clearly about BlueBot)
- "Not again..." → yes (if clearly about BlueBot)
- "Yes, I did say blue" → yes
- "No, nobody said blue" → yes
- "I was talking about the sky" → yes
- "Blu mage is the best job" → no (this is a blue reference, not an acknowledgment)
- "I like the color blue" → no (this is a blue reference, not an acknowledgment)
- "What's everyone doing today?" → no (unrelated to BlueBot)
- "Has anyone seen my keys?" → no (unrelated to BlueBot)
- "lol" → no (too ambiguous without context)
- "yes" → no (too ambiguous without context)`;

/**
 * System content for the BlueBot sentiment analyzer
 */
const sentimentSystemContent = `You analyze the sentiment of a message acknowledging BlueBot.

Your ONLY task is to determine if the message expresses negative sentiment (mean, annoyed, indignant, frustrated) toward BlueBot. Respond ONLY with "negative" or "neutral".

Examples:
- "Dang, the Bluebot got me" → neutral
- "Hehe Bluebot caught you" → neutral
- "Oh it must have been when I said 'Blueberry'" → neutral
- "Leave me alone you stupid bot" → negative
- "This bot is so annoying" → negative
- "I hate when this happens" → negative
- "Not again..." → neutral
- "Yes, I did say blue" → neutral
- "No, nobody said blue" → neutral
- "Shut up bot" → negative
- "F***ing bot" → negative
- "Can we disable this thing?" → negative
- "BlueBot is hilarious" → neutral
- "I love this bot" → neutral
- "what did you have for dinner" -> no response
- "i just got a new game this afternoon" -> no response,
- "i'm going to the gym" -> no response
- "https://www.youtube.com/watch?v=dQw4w9WgXcQ" -> no response`;

/**
 * Format the user message for the BlueBot acknowledgment detector
 * @param message The message to check
 */
function formatAcknowledgmentUserMessage(message: string): string {
	return `Is this message acknowledging or responding to BlueBot after it detected a blue reference? Message: "${message}"`;
}

/**
 * Format the user message for the BlueBot sentiment classifier
 * @param message The message to check
 */
function formatSentimentUserMessage(message: string): string {
	return `Analyze if this message expresses negative sentiment (mean, annoyed, indignant, frustrated) toward BlueBot: "${message}"`;
}

/**
 * BlueBot acknowledgment prompt definition
 */
const blueBotAcknowledgmentPrompt: LLMPrompt = {
	systemContent: acknowledgmentSystemContent,
	formatUserMessage: formatAcknowledgmentUserMessage,
	defaultTemperature: 0.1,
	defaultMaxTokens: 3
};

/**
 * BlueBot sentiment prompt definition
 */
const blueBotSentimentPrompt: LLMPrompt = {
	systemContent: sentimentSystemContent,
	formatUserMessage: formatSentimentUserMessage,
	defaultTemperature: 0.1,
	defaultMaxTokens: 10
};

// Register the prompts
PromptRegistry.registerPrompt(PromptType.BLUE_ACKNOWLEDGMENT, blueBotAcknowledgmentPrompt);
PromptRegistry.registerPrompt(PromptType.BLUE_SENTIMENT, blueBotSentimentPrompt);

// For backward compatibility
export {
	acknowledgmentSystemContent as blueBotAcknowledgmentPrompt,
	sentimentSystemContent as blueBotSentimentPrompt,
	formatAcknowledgmentUserMessage as formatBlueBotAcknowledgmentPrompt,
	formatSentimentUserMessage as formatBlueBotSentimentPrompt
};
