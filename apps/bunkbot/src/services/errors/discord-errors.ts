// Custom error class for better error handling
export class DiscordServiceError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DiscordServiceError';
	}
}

export class ChannelNotFoundError extends DiscordServiceError {
	constructor(channelId: string) {
		super(`Channel not found: ${channelId}`);
	}
}

export class UserNotFoundError extends DiscordServiceError {
	constructor(userId: string) {
		super(`User not found: ${userId}`);
	}
}

export class MemberNotFoundError extends DiscordServiceError {
	constructor(memberId: string) {
		super(`Member not found: ${memberId}`);
	}
}

export class GuildNotFoundError extends DiscordServiceError {
	constructor(guildId: string) {
		super(`Guild not found: ${guildId}`);
	}
}

export class RoleNotFoundError extends DiscordServiceError {
	constructor(roleId: string) {
		super(`Role not found: ${roleId}`);
	}
}

export class WebhookError extends DiscordServiceError {
	constructor(message: string) {
		super(message);
		this.name = 'WebhookError';
	}
}

export class MessageNotFoundError extends DiscordServiceError {
	constructor(messageId: string, channelId: string) {
		super(`Message ${messageId} not found in channel ${channelId}`);
		this.name = 'MessageNotFoundError';
	}
}
