import { Message, TextChannel } from 'discord.js';
import { DiscordService } from '../../../services/discordService';
import { logger } from '../../../services/logger';
import { BotIdentity } from '../../types/botIdentity';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ResponseGenerator as _TriggerResponseGenerator } from './trigger-response';

// Core response generator type - returns string based on message
export type ResponseGenerator = (message: Message) => string | Promise<string>;

// Creates a static text response
export function staticResponse(text: string): ResponseGenerator {
	return () => text;
}

// Creates a random response from an array of options
export function randomResponse(options: string[]): ResponseGenerator {
	return () => options[Math.floor(Math.random() * options.length)];
}

// Creates a template response with variable substitution
export function templateResponse(
	template: string,
	variablesFn: (message: Message) => Record<string, string>,
): ResponseGenerator {
	return (message: Message): string => {
		const variables = variablesFn(message);
		let response = template;

		// Replace variables in template
		for (const [key, value] of Object.entries(variables)) {
			response = response.replace(new RegExp(`{${key}}`, 'g'), value);
		}

		return response;
	};
}

// Processes a message using regex group captures
export function regexCaptureResponse(pattern: RegExp, template: string): ResponseGenerator {
	return (message: Message) => {
		const match = message.content.match(pattern);
		if (!match) return template;

		// Replace $1, $2, etc. with captured groups
		return template.replace(/\$(\d+)/g, (_, index) => match[parseInt(index)] || '');
	};
}

// Helper function to send a response with a specific bot identity
export const sendBotResponse = async (
	message: Message,
	identity: BotIdentity,
	responseGenerator: ResponseGenerator,
	botName: string,
): Promise<void> => {
	try {
		const channel = message.channel as TextChannel;
		const responseText = await responseGenerator(message);

		logger.debug(`[${botName}] Sending response: "${responseText.substring(0, 100)}..."`);
		await DiscordService.getInstance().sendMessageWithBotIdentity(
			channel.id,
			identity,
			responseText
		);
		logger.debug(`[${botName}] Response sent successfully`);
	} catch (error) {
		logger.error(`[${botName}] Error sending response:`, error as Error);
		throw error;
	}
};
