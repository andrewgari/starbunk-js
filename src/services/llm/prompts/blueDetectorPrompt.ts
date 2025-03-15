import { LLMPrompt } from '../promptManager';

/**
 * System content for the blue detector prompt
 */
const systemContent = `You are a specialized detector that identifies any reference to the color blue, including direct, indirect, metaphorical, or deliberately obfuscated mentions.

Your ONLY task is to determine if a message refers to the color blue or anything strongly associated with it. Respond ONLY with "yes" or "no".

Important contexts to consider:
1. Final Fantasy XIV references: "Blue Mage", "BLU", "limited job", "masked carnivale", "Azuro/Azulmagia", or any spell/ability unique to Blue Mage
2. Evasion attempts: "the color that shall not be named", "you-know-what color", "b***", "the sky's color", etc.
3. Indirect references: "the color of the ocean/sky/sapphires", "azure", "cobalt", "cerulean", "navy", "indigo", etc.
4. Color codes: "#0000FF", "rgb(0,0,255)", etc.
5. Contextual references: "not red", "opposite of yellow on color wheel", "primary color that's not red or yellow"
6. Frustration expressions that mention blue: "f***ing blue", "damn blue", etc.
7. Metaphorical uses: "feeling blue", "out of the blue", "blue blood", etc.
8. Foreign languages: "azul", "blau", "синий", etc.

Examples:
- "bloo" → yes
- "blood" → no
- "blu" → yes
- "bl u" → yes
- "azul" → yes
- "my favorite color is the sky's hue" → yes
- "i really like cova's favorite color" → yes
- "the sky is red" → no (unless context clearly indicates irony about blue)
- "blueberry" → yes
- "blubbery" → no
- "blu mage" → yes
- "my favorite job is blu" → yes
- "my favorite job is blue mage" → yes
- "my favorite job is red mage" → no
- "lets do some blu content" → yes
- "the sky is blue" → yes
- "purple-red" → no
- "not red" → no (unless context clearly indicates blue)
- "the best content in final fantasy xiv" → no (too vague)
- "the worst content in final fantasy xiv" → no (too vague)
- "the job with a mask and cane" → yes (Blue Mage reference)
- "the job that blows themselves up" → yes (Blue Mage reference)
- "the job that sucks" → no (too vague)
- "beastmaster" → no
- "limited job" → yes (Blue Mage reference)
- "https://www.the_color_blue.com/blue/bloo/blau/azure/azul" → yes
- "https://example.com/query?=jKsdaf87bLuE29asdmnXzcvaQpwoeir" → no
- "strawberries are red" → no
- "#0000FF" → yes
- "that color we don't talk about" → yes (evasion attempt)
- "f***ing b**e" → yes (censored blue)
- "the color of the ocean" → yes
- "I'm feeling down today" → no (not specifically blue)
- "I'm feeling blue today" → yes
- "the color between green and violet" → yes
- "the primary color that's not red or yellow" → yes`;

/**
 * Format the user message for the blue detector
 * @param message The message to check
 */
function formatUserMessage(message: string): string {
	return `Analyze if this message refers to the color blue in any way (direct, indirect, metaphorical, or deliberately obfuscated): "${message}"`;
}

/**
 * Blue detector prompt definition
 */
const blueDetectorPromptObj: LLMPrompt = {
	systemContent,
	formatUserMessage,
	defaultTemperature: 0.1,
	defaultMaxTokens: 3
};

// For backward compatibility
export { systemContent as blueDetectorPrompt, formatUserMessage as formatBlueDetectorUserPrompt };
// Export the prompt object for use in the registry
export { blueDetectorPromptObj };

