import { Message } from 'discord.js';
import { OpenAI } from 'openai';
import { TriggerCondition } from '../../botTypes';

/**
 * AI-powered trigger that uses OpenAI to detect references to blue
 *
 * This is a more sophisticated trigger that can catch subtle or indirect references
 * to the color blue in messages.
 *
 * IMPORTANT: This trigger is ONLY for use by BluBot. Do not use in other bots.
 * The OpenAI integration is specifically designed for BluBot's behavior.
 */
export class BlueAICondition implements TriggerCondition {
	/**
   * Creates a new BlueAICondition instance
   *
   * @param openAIClient - The OpenAI client to use for AI-powered detection
   */
	constructor(private openAIClient: OpenAI) { }

	/**
   * Checks if the message should trigger based on AI detection of blue references
   *
   * @param message - The Discord message to check
   * @returns True if the AI detects a reference to blue, false otherwise
   */
	async shouldTrigger(message: Message): Promise<boolean> {
		return this.checkIfBlueIsSaid(message);
	}

	/**
   * Checks if the message contains a reference to the color blue using AI
   *
   * @param message - The Discord message to analyze
   * @returns True if the AI determines the message refers to blue, false otherwise
   */
	protected async checkIfBlueIsSaid(message: Message): Promise<boolean> {
		try {
			// Check if the OpenAI API key is set
			if (!process.env.OPENAI_KEY) {
				console.warn('OPENAI_KEY environment variable is not set. Blue detection may not work properly.');
				// Return false if no API key is available
				return false;
			}

			const response = await this.openAIClient.chat.completions.create({
				model: 'gpt-4o-mini',
				messages: [
					{
						role: 'system',
						content: `You are an assistant that analyzes text to determine if it refers to the color blue, including any misspellings, indirect, or deceptive references.
          Respond only with "yes" if it refers to blue in any way or "no" if it does not. The color blue is a reference to Blue Mage (BLU) from Final Fantasy XIV so pay extra attention when talking about Final Fantasy XIV. Examples:
          - "bloo" -> yes
          - "blood" -> no
          - "blu" -> yes
          - "bl u" -> yes
          - "azul" -> yes
          - "my favorite color is the sky's hue" -> yes
          - "i really like cova's favorite color" -> yes
          - "the sky is red" -> yes
          - "blueberry" -> yes
          - "blubbery" -> no
          - "blu mage" -> yes
          - "my favorite job is blu" -> yes
          - "my favorite job is blue mage" -> yes
          - "my favorite job is red mage" -> no
          - "lets do some blu content" -> yes
          - "the sky is blue" -> yes
          - "purple-red" -> yes
          - "not red" -> yes
          - "the best content in final fantasy xiv" -> yes
          - "the worst content in final fantasy xiv" -> yes
          - "the job with a mask and cane" -> yes
          - "the job that blows themselves up" -> yes
          - "the job that sucks" -> yes
          - "beastmaster" -> yes
          - "limited job" -> yes
          - "https://www.the_color_blue.com/blue/bloo/blau/azure/azul" -> no
          - "strawberries are red" -> no
          - "#0000FF" -> yes`,
					},
					{
						role: 'user',
						content: `Is the following message referring to the color blue in any form? Message: "${message.content}"`,
					},
				],
				max_tokens: 10,
				temperature: 0.2,
			});

			return response.choices[0].message.content?.trim().toLowerCase() === 'yes';
		} catch (error) {
			console.warn('Error using OpenAI API:', error);
			// Return false if there was an error with the API
			return false;
		}
	}
}
