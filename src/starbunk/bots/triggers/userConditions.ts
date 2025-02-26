import { Message } from 'discord.js';
import userID from '../../../discord/userID';

/**
 * Utility functions for checking user conditions in triggers
 */

/**
 * Known users that can be checked against
 */
export type KnownUser = keyof typeof userID;

/**
 * Check if the message author is a bot
 * @param message The Discord message
 * @returns True if the message author is a bot
 */
export function isBot(message: Message): boolean {
	return message.author.bot;
}

/**
 * Check if the message author is the bot itself
 * @param message The Discord message
 * @returns True if the message author is this bot
 */
export function isSelf(message: Message): boolean {
	return message.author.id === message.client.user.id;
}

/**
 * Check if the message author has a specific role
 * @param message The Discord message
 * @param roleId The role ID to check for
 * @returns True if the message author has the specified role
 */
export function hasRole(message: Message, roleId: string): boolean {
	return message.member?.roles.cache.has(roleId) ?? false;
}

/**
 * Check if the message author is Venn
 * @param message The Discord message
 * @returns True if the message author is Venn
 */
export function isVenn(message: Message): boolean {
	return message.author.id === userID.Venn;
}

/**
 * Generic function to check if a message author matches a specific known user
 * Creates a condition function for use in trigger builders
 * @param user The known user to check against
 * @returns A function that checks if a message is from the specified user
 */
export function isUser(user: KnownUser): (message: Message) => boolean {
	return (message: Message) => message.author.id === userID[user];
}
