import { Message } from 'discord.js';
import { OpenAI } from 'openai';
import { Logger } from '../../../services/logger';
import { TriggerCondition } from '../botTypes';
import { isBot } from './userConditions';

/**
 * BluBot-specific triggers
 * This file contains trigger conditions specifically designed for BluBot
 */

/**
 * Trigger for Venn insults
 * Used by BluBot to respond to Venn with the Navy Seal copypasta
 *
 * Note: The time-based rate limiting is now handled in the BluBot class
 */
export class VennInsultTrigger implements TriggerCondition {
	private pattern = /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i;

	async shouldTrigger(message: Message): Promise<boolean> {
		if (isBot(message)) return false;

		// Only check if the message contains the mean pattern
		// The BluBot class will handle checking if it's from Venn and the time limits
		return this.pattern.test(message.content);
	}
}

/**
 * Composite trigger that combines multiple triggers with OR logic
 * Used by BluBot to check multiple trigger conditions
 */
export class CompositeTrigger implements TriggerCondition {
	constructor(private triggers: TriggerCondition[]) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		for (const trigger of this.triggers) {
			if (await trigger.shouldTrigger(message)) {
				return true;
			}
		}
		return false;
	}
}

/**
 * Composite trigger that combines multiple triggers with AND logic
 */
export class AllConditionsTrigger implements TriggerCondition {
	constructor(private triggers: TriggerCondition[]) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		for (const trigger of this.triggers) {
			if (!(await trigger.shouldTrigger(message))) {
				return false;
			}
		}
		return true;
	}
}

/**
 * Trigger that negates another trigger
 */
export class NotTrigger implements TriggerCondition {
	constructor(private trigger: TriggerCondition) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		return !(await this.trigger.shouldTrigger(message));
	}
}

/**
 * AI-powered trigger that uses OpenAI to detect references to blue
 * This is a more sophisticated trigger that can catch subtle or indirect references
 *
 * IMPORTANT: This trigger is ONLY for use by BluBot. Do not use in other bots.
 * The OpenAI integration is specifically designed for BluBot's behavior.
 */
export class BlueAICondition implements TriggerCondition {
	constructor(private openAIClient: OpenAI) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		if (isBot(message)) return false;

		return this.checkIfBlueIsSaid(message);
	}

	protected async checkIfBlueIsSaid(message: Message): Promise<boolean> {
		try {
			Logger.debug('Checking message for blue references via AI');
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

			Logger.debug(`AI response: ${response.choices[0].message.content}`);
			return response.choices[0].message.content?.trim().toLowerCase() === 'yes';
		} catch (error) {
			Logger.error('Error checking for blue reference', error as Error);
			return false;
		}
	}
}
