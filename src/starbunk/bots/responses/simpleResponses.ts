import { Message } from 'discord.js';
import { OpenAI } from 'openai';
import { Logger } from '../../../services/logger';
import { ResponseGenerator } from '../botTypes';

/**
 * Base class for simple static responses
 */
export class StaticResponse implements ResponseGenerator {
	constructor(private response: string) { }

	async generateResponse(): Promise<string> {
		return this.response;
	}
}

/**
 * Response for "blue" mentions
 */
export class BlueMentionResponse extends StaticResponse {
	constructor() {
		super('Did somebody say Blu?');
	}
}

/**
 * Response for interactions
 */
export class InteractionResponse extends StaticResponse {
	constructor() {
		super('Lol, Somebody definitely said Blu! :smile:');
	}
}

/**
 * Response for insults
 */
export class InsultResponse extends StaticResponse {
	constructor() {
		super('No way, Venn can suck my blu cane. :unamused:');
	}
}

/**
 * Navy Seal copypasta response
 */
export class NavySealResponse extends StaticResponse {
	constructor() {
		super("What the blu did you just blueing say about me, you little blu? I'll have you know I graduated top of my class in the Navy Blus...");
	}
}

/**
 * ChatGPT response that queries an AI model
 * This is a fallback for when no other response matches
 *
 * IMPORTANT: This class is ONLY for use by BluBot. Do not use in other bots.
 * The OpenAI integration is specifically designed for BluBot's behavior.
 */
export class ChatGPTResponse implements ResponseGenerator {
	private openAIClient?: OpenAI;

	constructor(openAIClient?: OpenAI) {
		this.openAIClient = openAIClient;
	}

	async generateResponse(message: Message): Promise<string> {
		// Extract the query - remove "blu" or "blue" from the message
		const query = message.content.replace(/\b(blu|blue)\b/gi, '').trim();

		// If there's no actual query, return a default response
		if (!query) {
			return "I'm BluBot! Ask me something by mentioning 'blu' in your message.";
		}

		// If no OpenAI client is provided, return a mock response
		if (!this.openAIClient) {
			return `[BluBot AI] I'd respond to "${query}" but my ChatGPT integration is currently offline. Try asking me to say something nice about someone instead!`;
		}

		try {
			Logger.debug(`Sending query to OpenAI: "${query}"`);

			const response = await this.openAIClient.chat.completions.create({
				model: 'gpt-4o-mini',
				messages: [
					{
						role: 'system',
						content: `You are BluBot, a Discord bot that loves the color blue and Blue Mage from Final Fantasy XIV.
						Your responses should be concise (1-2 sentences), friendly, and occasionally reference the color blue or Blue Mage.
						You have a playful personality and enjoy making puns about the color blue.
						You should never break character or mention that you are an AI language model.`
					},
					{
						role: 'user',
						content: query
					}
				],
				max_tokens: 150,
				temperature: 0.7,
			});

			const responseText = response.choices[0].message.content?.trim();

			if (!responseText) {
				return "Sorry, I couldn't generate a response. Try asking something else!";
			}

			return `[BluBot AI] ${responseText}`;
		} catch (error) {
			Logger.error('Error generating ChatGPT response:', error as Error);
			return `[BluBot AI] I'd respond to "${query}" but I'm having trouble connecting to my AI brain right now. Try asking me to say something nice about someone instead!`;
		}
	}
}
