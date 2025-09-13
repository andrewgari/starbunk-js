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
	embeds?: unknown[];
	files?: unknown[];
}

// Re-export existing types with explicit naming to avoid conflicts
export type { MessageInfo as DiscordMessageInfo } from '../discord/messageInfo';
export type { MessageInfo as WebhookMessageInfo } from '../webhooks/types';
