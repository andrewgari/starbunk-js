import { Guild, Message, TextChannel, User } from 'discord.js';

/**
 * Represents a strongly typed context for bot responses
 * This provides more targeted information from the Discord message
 * with proper TypeScript typing
 */
export interface ResponseContext {
	readonly message: Message;
	readonly content: string;
	readonly author: User;
	readonly channel: TextChannel;
	readonly guild: Guild | null;
	readonly timestamp: Date;
	readonly isFromBot: boolean;
	readonly isDM: boolean;
	readonly mentioned: Set<string>; // User IDs that were mentioned
	readonly mentionedRoles: Set<string>; // Role IDs that were mentioned
	readonly parts: string[]; // Message content split by spaces

	// Helper methods
	hasWord(word: string): boolean;
	hasPhrase(phrase: string): boolean;
	matchesRegex(pattern: RegExp): boolean;
	getMentionedUsers(): User[];
}

/**
 * Create a response context from a Discord message
 */
export function createResponseContext(message: Message): ResponseContext {
	const content = message.content;
	const parts = content.split(/\s+/);
	const mentioned = new Set<string>();
	const mentionedRoles = new Set<string>();

	// Extract mentioned users
	message.mentions.users.forEach((user) => {
		mentioned.add(user.id);
	});

	// Extract mentioned roles
	message.mentions.roles.forEach((role) => {
		mentionedRoles.add(role.id);
	});

	return {
		message,
		content,
		author: message.author,
		channel: message.channel as TextChannel,
		guild: message.guild,
		timestamp: new Date(message.createdTimestamp),
		isFromBot: message.author.bot,
		isDM: message.channel.type === 1, // DM channel type is 1
		mentioned,
		mentionedRoles,
		parts,

		// Helper methods
		hasWord(word: string): boolean {
			const wordPattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
			return wordPattern.test(content);
		},

		hasPhrase(phrase: string): boolean {
			return content.toLowerCase().includes(phrase.toLowerCase());
		},

		matchesRegex(pattern: RegExp): boolean {
			return pattern.test(content);
		},

		getMentionedUsers(): User[] {
			return Array.from(message.mentions.users.values());
		},
	};
}

// Helper function to escape regex special characters
function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Enhanced TriggerCondition that uses ResponseContext
 */
export type ContextualTriggerCondition = (context: ResponseContext) => Promise<boolean> | boolean;

/**
 * Enhanced ResponseGenerator that uses ResponseContext
 */
export type ContextualResponseGenerator = (context: ResponseContext) => Promise<string> | string;

/**
 * Convert a ContextualTriggerCondition to a standard TriggerCondition
 */
export function asCondition(condition: ContextualTriggerCondition): (message: Message) => Promise<boolean> | boolean {
	return async (message: Message) => {
		const context = createResponseContext(message);
		return condition(context);
	};
}

/**
 * Convert a ContextualResponseGenerator to a standard ResponseGenerator
 */
export function asResponseGenerator(
	generator: ContextualResponseGenerator,
): (message: Message) => Promise<string> | string {
	return async (message: Message) => {
		const context = createResponseContext(message);
		return generator(context);
	};
}
