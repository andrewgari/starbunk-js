import userId from '@/discord/userId';
import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { GuyBotConfig } from '../config/guyBotConfig';
import ReplyBot from '../replyBot';

/**
 * Bot that responds to mentions of "guy" with configured responses.
 * Response rates:
 * - 100% chance when "guy" is mentioned (no probability check)
 * - 15% chance when Guy sends a message (uses probability check)
 * - 0% chance otherwise (no probability check)
 * Registered automatically by StarbunkClient.registerBots().
 */
export default class GuyBot extends ReplyBot {
	protected override responseRate = 15; // 15% chance to respond to Guy's messages

	public override get botIdentity(): BotIdentity {
		return {
			botName: GuyBotConfig.Name,
			avatarUrl: GuyBotConfig.Avatars.Default
		};
	}

	protected override async processMessage(message: Message): Promise<void> {
		const truncatedContent = message.content.substring(0, 100);
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${truncatedContent}..."`);

		try {
			await this.handleGuyMention(message);
		} catch (error) {
			const typedError = error instanceof Error ? error : new Error(String(error));
			logger.error(`[${this.defaultBotName}] Error processing message:`, typedError);
			throw typedError;
		}
	}

	/**
	 * Checks for and handles "guy" mentions in messages.
	 * Response logic:
	 * 1. If message contains "guy" -> respond 100% of the time
	 * 2. If message is from Guy -> respond 15% of the time
	 * 3. Otherwise -> never respond
	 * @param message - The Discord message to process
	 */
	private async handleGuyMention(message: Message): Promise<void> {
		const content = message.content.toLowerCase();
		const pattern = GuyBotConfig.Patterns.Default;

		if (!pattern) {
			logger.warn(`[${this.defaultBotName}] No pattern configured for guy detection`);
			return;
		}

		const hasGuy = pattern.test(content);
		const isGuyMessage = message.author.id === userId.Guy;

		// Determine if we should reply based on the three cases
		let shouldReply = false;
		let effectiveRate = 0;

		if (hasGuy) {
			// Case 1: Message contains "guy" - 100% chance
			shouldReply = true;
			effectiveRate = 100;
		} else if (isGuyMessage) {
			// Case 2: Message is from Guy - 15% chance
			shouldReply = this.shouldTriggerResponse();
			effectiveRate = this.responseRate;
		}
		// Case 3: Otherwise - 0% chance (default false)

		logger.debug(
			`[${this.defaultBotName}] Reply check: hasGuy=${hasGuy}, ` +
			`isGuy=${isGuyMessage}, shouldReply=${shouldReply}, ` +
			`effectiveRate=${effectiveRate}%`
		);

		if (shouldReply) {
			logger.info(`[${this.defaultBotName}] Sending response to ${message.author.tag}`);
			const response = GuyBotConfig.Responses.Default();
			await this.sendReply(message.channel as TextChannel, response);
			logger.debug(`[${this.defaultBotName}] Response sent successfully`);
		}
	}
}
