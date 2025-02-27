import ReplyBot from './replyBot';

// Define the interface for bots that must have getBotName
export interface BotWithName extends ReplyBot {
	getBotName(): string;
}

// Define a type for the factory function
export type BotFactory<Args extends unknown[]> = (...args: Args) => ReplyBot;

/**
 * Patches a bot factory function to ensure the returned bot implements getBotName
 * @param botName The name of the bot
 * @param factory The factory function that creates the bot
 * @returns A function that returns a patched bot with getBotName
 */
export function patchBotFactory<Args extends unknown[]>(
	botName: string,
	factory: BotFactory<Args>
): (...args: Args) => BotWithName {
	return (...args: Args): BotWithName => {
		const bot = factory(...args);

		// Add getBotName method if it doesn't exist
		if (typeof (bot as unknown as Record<string, unknown>).getBotName !== 'function') {
			(bot as BotWithName).getBotName = () => botName;
		}

		return bot as BotWithName;
	};
}
