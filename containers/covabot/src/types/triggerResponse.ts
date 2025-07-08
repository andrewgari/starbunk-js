import { Message } from 'discord.js';
import { BotIdentity } from './botIdentity';

/**
 * Function that determines whether a trigger should activate
 */
export interface TriggerCondition {
	(message: Message): Promise<boolean> | boolean;
}

/**
 * Function that generates a response message
 */
export interface ResponseGenerator {
	(message: Message): Promise<string> | string;
}

/**
 * Function or value that provides a bot identity
 * Can return null to indicate identity resolution failure (bot will remain silent)
 */
export type IdentityProvider = BotIdentity | ((message: Message) => Promise<BotIdentity | null> | BotIdentity | null);

/**
 * Complete trigger-response definition
 */
export interface TriggerResponse {
	name: string;
	condition: TriggerCondition;
	response: ResponseGenerator;
	identity?: IdentityProvider;
	priority?: number;
}
