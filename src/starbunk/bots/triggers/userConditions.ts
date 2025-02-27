import { Message } from 'discord.js';
import UserID from '../../../discord/userID';

/**
 * Check if the message author is Venn
 *
 * @param message - The Discord message to check
 * @returns True if the message author is Venn
 */
export function isVenn(message: Message): boolean {
	return message.author.id === UserID.Venn;
}
