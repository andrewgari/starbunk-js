import { Message } from 'discord.js';

export type BlueStrategy = {
	shouldRespond: (message: Message) => Promise<boolean>;
	getResponse: (message: Message) => Promise<string>;
};
