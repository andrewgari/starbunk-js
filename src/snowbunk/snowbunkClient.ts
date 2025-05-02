import { PrismaClient } from '@prisma/client';
import { Events, GatewayIntentBits, IntentsBitField, Message, TextChannel } from 'discord.js';
import DiscordClient from '../discord/discordClient';
import userId from '../discord/userId';
import { bootstrapSnowbunkApplication, getDiscordService } from '../services/bootstrap';
import { logger } from '../services/logger';

export default class SnowbunkClient extends DiscordClient {
	// Prisma client for database access
	private prisma: PrismaClient | null = null;

	constructor() {
		const intents = new IntentsBitField();
		intents.add(
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildMembers,
			GatewayIntentBits.GuildWebhooks
		);

		super({ intents });

		// Initialize Prisma client
		this.prisma = new PrismaClient();

		// Initialize with minimal services and register event handler
		bootstrapSnowbunkApplication(this)
			.then(() => {
				logger.info('Snowbunk services bootstrapped successfully');
				this.on(Events.MessageCreate, this.syncMessage);
			})
			.catch((error: unknown) => {
				logger.error('Failed to bootstrap Snowbunk services:', error instanceof Error ? error : new Error(String(error)));
			});
	}

	async getSyncedChannels(channelID: string): Promise<string[]> {
		try {
			if (!this.prisma) {
				logger.error('Prisma client not initialized');
				return [];
			}

			// Get source channel info
			const sourceChannel = await this.prisma.channel.findUnique({
				where: { id: channelID },
				select: { name: true, guildId: true }
			});

			// Query the database for channel bridges where the source channel matches the given ID
			const bridges = await this.prisma.channelBridge.findMany({
				where: {
					sourceChannelId: channelID,
					isActive: true
				},
				select: {
					targetChannelId: true,
					sourceServer: true,
					targetServer: true,
					name: true
				}
			});

			// For each bridge, get the target channel info
			for (const bridge of bridges) {
				const targetChannel = await this.prisma.channel.findUnique({
					where: { id: bridge.targetChannelId },
					select: { name: true, guildId: true }
				});

				// Log the bridge information for debugging
				logger.debug(
					`Channel Bridge: ${bridge.name || 'unnamed'} from ${bridge.sourceServer || 'unknown'}/${sourceChannel?.name || 'unknown'} ` +
					`to ${bridge.targetServer || 'unknown'}/${targetChannel?.name || 'unknown'}`
				);
			}

			// Extract the target channel IDs
			return bridges.map((bridge: { targetChannelId: string }) => bridge.targetChannelId);
		} catch (error) {
			logger.error('Error fetching synced channels:', error instanceof Error ? error : new Error(String(error)));
			return [];
		}
	}

	// Changed from private to public for testing
	public syncMessage = async (message: Message): Promise<void> => {
		if (message.author.id === userId.Goose) return;
		if (message.author.bot) return;

		// Check if the user is blacklisted in this guild
		if (message.guild) {
			try {
				if (!this.prisma) {
					logger.error('Prisma client not initialized');
					return;
				}

				const blacklisted = await this.prisma.blacklist.findUnique({
					where: {
						guildId_userId: {
							guildId: message.guild.id,
							userId: message.author.id
						}
					}
				});

				if (blacklisted) {
					logger.debug(`Skipping message from blacklisted user ${message.author.id} in guild ${message.guild.id}`);
					return;
				}
			} catch (error) {
				logger.error('Error checking blacklist:', error instanceof Error ? error : new Error(String(error)));
				// Continue processing even if blacklist check fails
			}
		}

		try {
			// Get linked channels from the database
			const linkedChannels = await this.getSyncedChannels(message.channel.id);

			// Process each linked channel
			for (const channelID of linkedChannels) {
				try {
					const channel = await this.channels.fetch(channelID);
					this.writeMessage(message, channel as TextChannel);
				} catch (error) {
					logger.error('Error fetching channel:', error instanceof Error ? error : new Error(String(error)));
				}
			}
		} catch (error) {
			logger.error('Error processing linked channels:', error instanceof Error ? error : new Error(String(error)));
		}
	};

	private writeMessage(message: Message, linkedChannel: TextChannel): void {
		const userid = message.author.id;
		const displayName =
			linkedChannel.members.get(userid)?.displayName ?? message.member?.displayName ?? message.author.displayName;

		const avatarUrl =
			linkedChannel.members.get(userid)?.avatarURL() ??
			message.member?.avatarURL() ??
			message.author.defaultAvatarURL;

		try {
			// Try to use Discord service (which will use webhook service internally)
			try {
				const discordService = getDiscordService();
				discordService.sendWebhookMessage(linkedChannel, {
					username: displayName,
					avatarURL: avatarUrl,
					content: message.content,
					embeds: [],
				});
				return; // Success, exit early
			} catch (error: unknown) {
				// Just log the error, we'll fall back to direct channel message
				logger.warn(`[SnowbunkClient] Failed to use Discord service, falling back to direct message: ${error instanceof Error ? error.message : String(error)}`);
			}

			// Fallback to direct channel message
			logger.debug(`[SnowbunkClient] Sending fallback direct message to channel ${linkedChannel.name}`);
			const formattedMessage = `**[${displayName}]**: ${message.content}`;
			linkedChannel.send(formattedMessage);
		} catch (error: unknown) {
			logger.error(`[SnowbunkClient] Failed to send any message to channel ${linkedChannel.id}: ${error instanceof Error ? error.message : String(error)}`);
			// Don't throw here - just log the error and continue
		}
	}

	/**
	 * Clean up resources when the client is destroyed
	 */
	public override async destroy(): Promise<void> {
		try {
			// Disconnect Prisma client
			if (this.prisma) {
				await this.prisma.$disconnect();
				this.prisma = null;
			}

			// Call parent destroy method
			await super.destroy();
		} catch (error) {
			logger.error('Error during SnowbunkClient destroy:', error instanceof Error ? error : new Error(String(error)));
		}
	}
}
