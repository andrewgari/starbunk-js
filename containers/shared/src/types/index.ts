// Shared types for all containers
export type ContainerName = 'bunkbot' | 'djcova' | 'starbunk-dnd' | 'covabot';

export interface MessageContext {
	guildId: string;
	channelId: string;
	userId: string;
	messageId: string;
	content: string;
	timestamp: Date;
}

export interface BotIdentity {
	botName: string;
	avatarUrl: string;
	username?: string;
}

export interface WebhookMessage {
	content: string;
	identity: BotIdentity;
	channelId: string;
	embeds?: any[];
	files?: any[];
}

// Re-export existing types
export * from '../discord/messageInfo';
export * from '../webhooks/types';
