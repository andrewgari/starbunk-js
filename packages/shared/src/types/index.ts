import type { Stream } from 'node:stream';
import type {
	APIEmbed,
	AttachmentBuilder,
	AttachmentPayload,
	BufferResolvable,
	JSONEncodable,
	APIAttachment,
	Attachment,
} from 'discord.js';

// Shared types for all containers
export type ContainerName = 'bunkbot' | 'djcova' | 'starbunk-dnd' | 'covabot' | 'bluebot';

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
	embeds?: APIEmbed[];
	files?: (BufferResolvable | Stream | JSONEncodable<APIAttachment> | Attachment | AttachmentBuilder | AttachmentPayload)[];
}

// Re-export existing types with explicit naming to avoid conflicts
export type { MessageInfo as DiscordMessageInfo } from '../discord/message-info';
export type { MessageInfo as WebhookMessageInfo } from '../webhooks/types';
