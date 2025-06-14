/**
 * Represents a bot's identity with strong type guarantees
 */

// Use branded types for better type safety
export type BotName = string; 
export type AvatarUrl = string;

// Factory function to create a valid BotName with validation
export function createBotName(name: string): BotName {
	if (!name || name.length < 2 || name.length > 32) {
		throw new Error('Bot name must be between 2 and 32 characters');
	}
	return name;
}

// Factory function to create a valid AvatarUrl with validation
export function createAvatarUrl(url: string): AvatarUrl {
	if (!url || !url.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)$/i)) {
		throw new Error('Avatar URL must be a valid image URL (http/https with image extension)');
	}
	return url;
}

export interface BotIdentity {
	readonly botName: BotName;
	readonly avatarUrl: AvatarUrl;
}

// Factory function to create a valid BotIdentity
export function createBotIdentity(name: string, avatarUrl: string): BotIdentity {
	return {
		botName: createBotName(name),
		avatarUrl: createAvatarUrl(avatarUrl)
	};
}