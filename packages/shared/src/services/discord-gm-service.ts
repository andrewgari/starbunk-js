import { BotIdentity } from '../types';
import { Client, Message } from 'discord.js';
import { DiscordService } from './discord-service';

// Define the GM channel ID (previously from deprecated channelIds.Starbunk.BotChannelAdmin)
const GM_CHANNEL_ID = '1014170827601748048';

export interface GMAlertOptions {
	title: string;
	description: string;
	severity: 'low' | 'medium' | 'high';
}

// Singleton instance
let discordGMServiceInstance: DiscordGMService | null = null;

export class DiscordGMService {
	private constructor(
		private readonly client: Client,
		private readonly discordService: DiscordService,
	) {}

	/**
	 * Initialize the Discord GM service singleton
	 * @param client Discord.js client
	 * @param discordService The DiscordService instance
	 * @returns The DiscordGMService instance
	 */
	public static initialize(client: Client, discordService: DiscordService): DiscordGMService {
		if (!discordGMServiceInstance) {
			discordGMServiceInstance = new DiscordGMService(client, discordService);
		}
		return discordGMServiceInstance;
	}

	/**
	 * Get the Discord GM service instance. Must call initialize first.
	 * @returns The DiscordGMService instance
	 * @throws Error if the service hasn't been initialized
	 */
	public static getInstance(): DiscordGMService {
		if (!discordGMServiceInstance) {
			throw new Error('DiscordGMService not initialized. Call initialize() first.');
		}
		return discordGMServiceInstance;
	}

	/**
	 * Send a simple alert message to the GM channel
	 * @param message The message to send
	 * @returns Promise resolving to the sent message
	 */
	public async sendGMAlert(message: string): Promise<Message> {
		const _result = await this.discordService.sendMessage(GM_CHANNEL_ID, message);
		if (!_result) {
			throw new Error('Failed to send GM alert - message was blocked by debug mode filtering');
		}
		return _result;
	}

	/**
	 * Send a formatted alert to the GM channel
	 * @param options Alert formatting options
	 * @returns Promise resolving to the sent message
	 */
	public async sendFormattedGMAlert(options: GMAlertOptions): Promise<Message> {
		const severityEmoji = this.getSeverityEmoji(options.severity);
		const formattedMessage = `${severityEmoji} **${options.title}**\n${options.description}`;
		const _result = await this.discordService.sendMessage(GM_CHANNEL_ID, formattedMessage);
		if (!_result) {
			throw new Error('Failed to send formatted GM alert - message was blocked by debug mode filtering');
		}
		return _result;
	}

	/**
	 * Send a message to the GM channel with a custom bot identity
	 * @param message The message to send
	 * @param botIdentity The identity to use for the message
	 */
	public async sendGMAlertWithIdentity(message: string, botIdentity: BotIdentity): Promise<void> {
		await this.discordService.sendMessageWithBotIdentity(GM_CHANNEL_ID, botIdentity, message);
	}

	/**
	 * Check if a channel is a GM channel
	 * @param channelId The channel ID to check
	 * @returns True if the channel is a GM channel
	 */
	public isGMChannel(channelId: string): boolean {
		return channelId === GM_CHANNEL_ID;
	}

	/**
	 * Process a command from a GM channel
	 * @param message The message to process
	 * @returns True if the message was processed as a GM command
	 */
	public async processGMCommand(message: Message): Promise<boolean> {
		// Only process commands in GM channels
		if (!this.isGMChannel(message.channel.id)) {
			return false;
		}

		const content = message.content.trim();

		// Check if this is a GM command
		if (content.startsWith('!gm-')) {
			// Process different GM commands
			const parts = content.split(' ');
			const command = parts[0].substring(1); // Remove the ! prefix
			const noteText = parts.slice(1).join(' '); // Extract note text outside switch

			switch (command) {
				case 'gm-note':
					// Process GM note command
					await this.processGMNote(noteText);
					return true;

				// Add more GM commands as needed
				default:
					// Unknown command
					await this.sendGMAlert(`Unknown GM command: ${command}`);
					return false;
			}
		}

		return false;
	}

	/**
	 * Process a GM note
	 * @param noteText The text of the note
	 */
	private async processGMNote(noteText: string): Promise<void> {
		// Implementation would store the note in the appropriate system
		await this.sendGMAlert(`GM Note added: ${noteText}`);
	}

	/**
	 * Get emoji based on alert severity
	 * @param severity The severity level
	 * @returns Emoji string
	 */
	private getSeverityEmoji(severity: string): string {
		switch (severity) {
			case 'high':
				return '🔴';
			case 'medium':
				return '🟠';
			case 'low':
				return '🟢';
			default:
				return 'ℹ️';
		}
	}
}
