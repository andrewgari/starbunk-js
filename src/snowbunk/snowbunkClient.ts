import { Events, GatewayIntentBits, Message, TextChannel } from 'discord.js';
import DiscordClient from '../discord/discordClient';
import userId from '../discord/userId';
import { bootstrapSnowbunkApplication, getDiscordService } from '../services/bootstrap';
import { logger } from '../services/logger';

export default class SnowbunkClient extends DiscordClient {
	private readonly channelMap: Record<string, Array<string>> = {
		'757866614787014660': ['856617421942030364', '798613445301633137'],
		// testing
		'856617421942030364': ['757866614787014660', '798613445301633137'],
		// testing
		'798613445301633137': ['757866614787014660', '856617421942030364'],
		// starbunk
		'755579237934694420': ['755585038388691127'],
		// starbunk
		'755585038388691127': ['755579237934694420'],
		// memes
		'753251583084724371': ['697341904873979925'],
		// memes
		'697341904873979925': ['753251583084724371'],
		// ff14 general
		'754485972774944778': ['696906700627640352'],
		// ff14 general
		'696906700627640352': ['754485972774944778'],
		// ff14 msq
		'697342576730177658': ['753251583084724372'],
		// ff14 msq
		'753251583084724372': ['697342576730177658'],
		// screenshots
		'753251583286050926': ['755575759753576498'],
		// screenshots
		'755575759753576498': ['753251583286050926'],
		// raiding
		'753251583286050928': ['699048771308224642'],
		// raiding
		'699048771308224642': ['753251583286050928'],
		// food
		'696948268579553360': ['755578695011270707'],
		// food
		'755578695011270707': ['696948268579553360'],
		// pets
		'696948305586028544': ['755578835122126898'],
		// pets
		'755578835122126898': ['696948305586028544'],
	};

	constructor() {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent
			]
		});

		// Initialize with minimal services
		try {
			bootstrapSnowbunkApplication(this).then(() => {
				logger.info('Snowbunk services bootstrapped successfully');
			}).catch((error: unknown) => {
				logger.error('Failed to bootstrap Snowbunk services:', error instanceof Error ? error : new Error(String(error)));
			});
		} catch (error: unknown) {
			logger.error('Error bootstrapping Snowbunk services:', error instanceof Error ? error : new Error(String(error)));
		}

		this.on(Events.MessageCreate, this.syncMessage.bind(this));
	}

	getSyncedChannels(channelID: string): string[] {
		return this.channelMap[channelID] ?? [];
	}

	private syncMessage = (message: Message): void => {
		if (message.author.id === userId.Goose) return;
		if (message.author.bot) return;

		const linkedChannels = this.getSyncedChannels(message.channel.id);
		linkedChannels.forEach((channelID: string) => {
			this.channels
				.fetch(channelID)
				.then((channel) => {
					this.writeMessage(message, channel as TextChannel);
				})
				.catch((error) => {
					logger.error('Error fetching channel:', error instanceof Error ? error : new Error(String(error)));
				});
		});
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
}