import { Message } from 'discord.js';
import UserID from '../../../discord/userID';
import { UserCondition } from './conditions/userCondition';

// Create reusable instances of common user conditions
const vennCondition = new UserCondition(UserID.Venn);
const guyCondition = new UserCondition(UserID.Guy);
const sigCondition = new UserCondition(UserID.Sig);

/**
 * Check if the message author is Venn
 *
 * @param message - The Discord message to check
 * @returns True if the message author is Venn
 */
export function isVenn(message: Message): boolean {
	return message.author.id === UserID.Venn;
}

/**
 * Get a condition that checks if the message author is Venn
 *
 * @returns A condition that checks if the message author is Venn
 */
export function getVennCondition(): UserCondition {
	return vennCondition;
}

/**
 * Check if the message author is Guy
 *
 * @param message - The Discord message to check
 * @returns True if the message author is Guy
 */
export function isGuy(message: Message): boolean {
	return message.author.id === UserID.Guy;
}

/**
 * Get a condition that checks if the message author is Guy
 *
 * @returns A condition that checks if the message author is Guy
 */
export function getGuyCondition(): UserCondition {
	return guyCondition;
}

/**
 * Check if the message author is Sig
 *
 * @param message - The Discord message to check
 * @returns True if the message author is Sig
 */
export function isSig(message: Message): boolean {
	return message.author.id === UserID.Sig;
}

/**
 * Get a condition that checks if the message author is Sig
 *
 * @returns A condition that checks if the message author is Sig
 */
export function getSigCondition(): UserCondition {
	return sigCondition;
}
