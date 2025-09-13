import { LLMPrompt } from '../promptManager';

/**
 * System content for the BlueBot acknowledgment prompt
 */
const blueBotAcknowledgmentSystemContent = `You are a specialized detector that identifies if a message is acknowledging or responding to a bot named BlueBot.

BlueBot typically says "Did somebody say BLU?" in response to mentions of the color blue.

Your ONLY task is to determine if a message is acknowledging or responding to BlueBot's message. Respond ONLY with "yes" or "no".

Examples of acknowledgments:
- "No, nobody said blue" → yes (directly responding to BlueBot)
- "Shut up BlueBot" → yes (addressing BlueBot)
- "Not this again..." → yes (expressing frustration at BlueBot's appearance)
- "Oh god, it's the blue bot" → yes (acknowledging BlueBot)
- "I hate this bot" → yes (in context of BlueBot's message)
- "No, I didn't say blue" → yes (responding to BlueBot's question)
- "Yes, I said blue" → yes (responding to BlueBot's question)
- "I was talking about blueberries" → yes (explaining to BlueBot)
- "Ignore it and it will go away" → yes (referring to BlueBot)
- "Why does it always show up?" → yes (referring to BlueBot)

Examples that are NOT acknowledgments:
- "I like the color blue" → no (new mention of blue, not acknowledging)
- "The sky is blue today" → no (new mention of blue, not acknowledging)
- "BlueBot is annoying" → no (general statement, not in response to BlueBot)
- "I wonder if saying blue will trigger the bot" → no (anticipating, not acknowledging)
- "Remember when BlueBot showed up yesterday?" → no (referring to past event, not current)
- "Blue is my favorite color" → no (new mention of blue, not acknowledging)
- "Azure skies are beautiful" → no (new indirect mention of blue, not acknowledging)
- "I'm feeling blue today" → no (new mention of blue, not acknowledging)
- "The ocean is so blue" → no (new mention of blue, not acknowledging)
- "My favorite color is blue" → no (new mention of blue, not acknowledging)`;

/**
 * Format the user message for the BlueBot acknowledgment prompt
 * @param message The message to check
 */
function formatBlueBotAcknowledgmentPrompt(message: string): string {
	return `Analyze if this message is acknowledging or responding to BlueBot's "Did somebody say BLU?" message: "${message}"`;
}

/**
 * BlueBot acknowledgment prompt definition
 */
const blueBotAcknowledgmentPrompt: LLMPrompt = {
	systemContent: blueBotAcknowledgmentSystemContent,
	formatUserMessage: formatBlueBotAcknowledgmentPrompt,
	defaultTemperature: 0.1,
	defaultMaxTokens: 3,
};

/**
 * System content for the BlueBot sentiment prompt
 */
const blueBotSentimentSystemContent = `You are a specialized sentiment analyzer that determines if a message acknowledging BlueBot has a negative sentiment.

Your ONLY task is to determine if a message responding to BlueBot has a negative sentiment. Respond ONLY with "negative" or "neutral".

Examples of negative sentiment:
- "No, nobody said blue, shut up" → negative (expressing annoyance)
- "Shut up BlueBot" → negative (commanding the bot to be quiet)
- "Not this again..." → negative (expressing frustration)
- "Oh god, it's the blue bot" → negative (expressing dismay)
- "I hate this bot" → negative (expressing hatred)
- "Go away" → negative (wanting the bot to leave)
- "This bot is so annoying" → negative (expressing annoyance)
- "Why does it always show up?" → negative (expressing frustration)
- "Can someone turn this thing off?" → negative (wanting to disable the bot)
- "Ugh, not again" → negative (expressing frustration)

Examples of neutral sentiment:
- "No, nobody said blue" → neutral (simple factual response)
- "Yes, I said blue" → neutral (simple acknowledgment)
- "I was talking about blueberries" → neutral (explaining context)
- "Oh, it's BlueBot" → neutral (simple observation)
- "Hello BlueBot" → neutral (greeting)
- "I did mention blue" → neutral (simple acknowledgment)
- "The bot is here again" → neutral (simple observation)
- "I see you, BlueBot" → neutral (simple acknowledgment)
- "Yes, we were discussing blue" → neutral (simple explanation)
- "BlueBot has arrived" → neutral (simple observation)`;

/**
 * Format the user message for the BlueBot sentiment prompt
 * @param message The message to check
 */
function formatBlueBotSentimentPrompt(message: string): string {
	return `Analyze if this message acknowledging BlueBot has a negative sentiment: "${message}"`;
}

/**
 * BlueBot sentiment prompt definition
 */
const blueBotSentimentPrompt: LLMPrompt = {
	systemContent: blueBotSentimentSystemContent,
	formatUserMessage: formatBlueBotSentimentPrompt,
	defaultTemperature: 0.1,
	defaultMaxTokens: 10,
};

// Export the prompts and formatters
export {
	blueBotAcknowledgmentPrompt,
	blueBotSentimentPrompt,
	formatBlueBotAcknowledgmentPrompt,
	formatBlueBotSentimentPrompt,
};
