import { Message } from 'discord.js';

export const BLUE_BOT_PATTERNS = {
	Nice: /thank you|thanks/i,
	Question: /blue?bot,? (?<q>.+\?)/i,
};

export type Strategy = {
	shouldRespond: (message: Message) => Promise<boolean>;
	getResponse: (message: Message) => Promise<string>;
};
