/**
 * Represents a captured message in the fake Discord environment
 */
export interface CapturedMessage {
	/** Unique message ID */
	id: string;
	/** Timestamp when message was sent */
	timestamp: number;
	/** Channel ID where message was sent */
	channelId: string;
	/** Channel name where message was sent */
	channelName: string;
	/** User ID who sent the message */
	userId: string;
	/** Username who sent the message */
	username: string;
	/** Message content */
	content: string;
	/** Whether the message was sent by a bot */
	isBot: boolean;
	/** Guild ID (if in a guild) */
	guildId?: string;
	/** Guild name (if in a guild) */
	guildName?: string;
}

/**
 * MessageCapture stores all messages sent in the fake Discord environment
 * Provides query methods for assertions in tests
 */
export class MessageCapture {
	private messages: CapturedMessage[] = [];

	/**
	 * Capture a message
	 */
	capture(message: CapturedMessage): void {
		this.messages.push(message);
	}

	/**
	 * Get all captured messages
	 */
	getAllMessages(): CapturedMessage[] {
		return [...this.messages];
	}

	/**
	 * Get messages in a specific channel
	 */
	getMessagesInChannel(channelId: string): CapturedMessage[] {
		return this.messages.filter((msg) => msg.channelId === channelId);
	}

	/**
	 * Get messages from a specific user
	 */
	getMessagesFromUser(userId: string): CapturedMessage[] {
		return this.messages.filter((msg) => msg.userId === userId);
	}

	/**
	 * Get bot messages only
	 */
	getBotMessages(): CapturedMessage[] {
		return this.messages.filter((msg) => msg.isBot);
	}

	/**
	 * Get user messages only (non-bot)
	 */
	getUserMessages(): CapturedMessage[] {
		return this.messages.filter((msg) => !msg.isBot);
	}

	/**
	 * Get bot messages in a specific channel
	 */
	getBotMessagesInChannel(channelId: string): CapturedMessage[] {
		return this.messages.filter((msg) => msg.channelId === channelId && msg.isBot);
	}

	/**
	 * Get the last message
	 */
	getLastMessage(): CapturedMessage | undefined {
		return this.messages[this.messages.length - 1];
	}

	/**
	 * Get the last bot message
	 */
	getLastBotMessage(): CapturedMessage | undefined {
		const botMessages = this.getBotMessages();
		return botMessages[botMessages.length - 1];
	}

	/**
	 * Get the last user message
	 */
	getLastUserMessage(): CapturedMessage | undefined {
		const userMessages = this.getUserMessages();
		return userMessages[userMessages.length - 1];
	}

	/**
	 * Find messages matching a content pattern
	 */
	findMessagesByContent(pattern: string | RegExp): CapturedMessage[] {
		if (typeof pattern === 'string') {
			return this.messages.filter((msg) => msg.content.includes(pattern));
		}
		return this.messages.filter((msg) => pattern.test(msg.content));
	}

	/**
	 * Count messages
	 */
	getMessageCount(): number {
		return this.messages.length;
	}

	/**
	 * Count bot messages
	 */
	getBotMessageCount(): number {
		return this.getBotMessages().length;
	}

	/**
	 * Count user messages
	 */
	getUserMessageCount(): number {
		return this.getUserMessages().length;
	}

	/**
	 * Clear all captured messages
	 */
	clear(): void {
		this.messages = [];
	}

	/**
	 * Get messages in chronological order
	 */
	getMessagesChronological(): CapturedMessage[] {
		return [...this.messages].sort((a, b) => a.timestamp - b.timestamp);
	}

	/**
	 * Get messages in reverse chronological order (newest first)
	 */
	getMessagesReverseChronological(): CapturedMessage[] {
		return [...this.messages].sort((a, b) => b.timestamp - a.timestamp);
	}
}
