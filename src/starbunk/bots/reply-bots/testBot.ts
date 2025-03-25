import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { BotIdentity } from '../../types/botIdentity';
import { BotRegistry } from '../botRegistry';
import ReplyBot from '../replyBot';

export default class TestBot extends ReplyBot {
	private messageLoop: NodeJS.Timeout | null = null;
	private readonly PATTERN = /show me the terror/i;
	private readonly FIRST_MESSAGE = "This is the ritual to lead you on";
	private readonly SECOND_MESSAGE = "Your friends will meet him when you are gone\n\n";
	private readonly FIRST_DELAY_MS = 3000;  // 3 seconds
	private readonly SECOND_DELAY_MS = 5000; // 5 seconds

	constructor() {
		super();
		this.skipBotMessages = true; // Skip bot messages as requested
		logger.info(`[${this.defaultBotName}] Initialized with skipBotMessages=true`);
	}

	public get botIdentity(): BotIdentity {
		return {
			// Using a dark, mysterious avatar for the theme
			avatarUrl: 'https://i.imgur.com/IJ3ddVb.png',
			botName: 'The Dark Presence'
		};
	}

	protected shouldSkipMessage(message: Message): boolean {
		// Check if bot is enabled in registry
		if (!this.isBotEnabled()) {
			logger.debug(`[${this.defaultBotName}] Skipping message - bot is disabled`);
			return true;
		}

		// Skip messages from bots if skipBotMessages is true
		if (message.author.bot) {
			logger.debug(`[${this.defaultBotName}] Skipping message from bot (skipBotMessages=true)`);
			return true;
		}

		return false;
	}

	protected async processMessage(message: Message): Promise<void> {
		try {
			logger.debug(`[${this.defaultBotName}] Processing message: "${message.content}"`);

			if (this.PATTERN.test(message.content)) {
				logger.info(`[${this.defaultBotName}] Trigger phrase detected`);

				if (!(message.channel instanceof TextChannel)) {
					logger.debug(`[${this.defaultBotName}] Skipping non-text channel message`);
					return;
				}

				logger.info(`[${this.defaultBotName}] Starting message sequence`);
				await this.startMessageSequence(message.channel);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
		}
	}

	private async startMessageSequence(channel: TextChannel): Promise<void> {
		try {
			// Clear any existing loop
			this.stopMessageLoop();
			logger.debug(`[${this.defaultBotName}] Previous message sequence cleared`);

			// Start the alternating message sequence
			const sendMessages = async () => {
				try {
					if (!this.messageLoop || !this.isBotEnabled()) {
						logger.info(`[${this.defaultBotName}] Bot disabled or sequence stopped, ending message sequence`);
						this.stopMessageLoop();
						return;
					}

					// Send first message
					logger.debug(`[${this.defaultBotName}] Sending first message`);
					await this.sendReply(channel, this.FIRST_MESSAGE);

					// Wait for first delay
					await new Promise(resolve => setTimeout(resolve, this.FIRST_DELAY_MS));

					if (!this.messageLoop || !this.isBotEnabled()) return;

					// Send second message
					logger.debug(`[${this.defaultBotName}] Sending second message`);
					await this.sendReply(channel, this.SECOND_MESSAGE);

					// Wait for second delay before starting the next cycle
					await new Promise(resolve => setTimeout(resolve, this.SECOND_DELAY_MS));

					if (!this.messageLoop || !this.isBotEnabled()) return;

					// Schedule the next cycle
					sendMessages();
				} catch (error) {
					logger.error(`[${this.defaultBotName}] Error in message sequence:`, error as Error);
					this.stopMessageLoop();
				}
			};

			// Start the sequence
			this.messageLoop = setTimeout(sendMessages, 0);
			logger.info(`[${this.defaultBotName}] Message sequence started`);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error starting message sequence:`, error as Error);
			this.stopMessageLoop();
		}
	}

	private stopMessageLoop(): void {
		if (this.messageLoop) {
			logger.info(`[${this.defaultBotName}] Stopping message sequence`);
			clearTimeout(this.messageLoop);
			this.messageLoop = null;
		}
	}

	private isBotEnabled(): boolean {
		return BotRegistry.getInstance().isBotEnabled(this.defaultBotName);
	}
}
