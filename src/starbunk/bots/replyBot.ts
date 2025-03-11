import { Message, TextChannel } from 'discord.js';
import { getWebhookService } from '../../services/bootstrap';
import { logger } from '../../services/logger';
import { BotIdentity } from './botIdentity';

export interface ReplyOptions {
	botIdentity?: BotIdentity;
	content: string;
	embeds: Array<{
		title?: string;
		description?: string;
		color?: number;
		fields?: Array<{
			name: string;
			value: string;
			inline?: boolean;
		}>;
		footer?: {
			text: string;
			icon_url?: string;
		};
		thumbnail?: {
			url: string;
		};
		image?: {
			url: string;
		};
	}>;
}

export default abstract class ReplyBot {
	protected _botIdentity: BotIdentity = {
		userId: '',
		avatarUrl: 'https://imgur.com/a/qqUlTxI',
		botName: 'BunkBot'
	};

	get botName(): string {
		return this._botIdentity.botName;
	}

	get avatarUrl(): string {
		return this._botIdentity.avatarUrl;
	}

	protected get botIdentity(): BotIdentity {
		return this._botIdentity;
	}

	async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) {
			logger.debug(`${this.botName} ignoring bot message: ${message.content}`);
			return;
		}
		logger.debug(`${this.botName} received message: ${message.content}`);
	}

	protected getDefaultOptions(content: string): ReplyOptions {
		return {
			botIdentity: this.botIdentity,
			content,
			embeds: [],
		};
	}

	public async sendReply(channel: TextChannel, content: string | Partial<ReplyOptions>): Promise<void> {
		try {
			const webhookService = getWebhookService();
			if (!webhookService) {
				throw new Error('WebhookService not found');
			}

			const options: ReplyOptions = typeof content === 'string'
				? this.getDefaultOptions(content)
				: {
					botIdentity: content.botIdentity ?? this.botIdentity,
					content: content.content ?? '',
					embeds: content.embeds ?? [],
				};

			// Extract username and avatarURL for webhook service
			const username = options.botIdentity?.botName ?? this.botName;
			const avatarURL = options.botIdentity?.avatarUrl ?? this.avatarUrl;

			await webhookService.writeMessage(channel, {
				username,
				avatarURL,
				content: options.content,
				embeds: options.embeds
			});
		} catch (error) {
			logger.error(`Failed to send reply to channel ${channel.id}`, error as Error);
			throw error;
		}
	}

	public isSelf(message: Message): boolean {
		return message.author.bot && message.author.id === message.client.user?.id;
	}
}
