import { Events, Message, TextChannel } from 'discord.js';
import DiscordClient from '../discord/discordClient';
import userId from '../discord/userId';
import { getWebhookService } from '../services/bootstrap';

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

	getSyncedChannels(channelID: string): string[] {
		return this.channelMap[channelID] ?? [];
	}

	bootstrap(): void {
		this.on(Events.MessageCreate, async (message: Message) => {
			this.syncMessage(message);
		});
	}

	syncMessage = (message: Message): void => {
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
					console.error(error);
				});
		});
	};

	writeMessage(message: Message, linkedChannel: TextChannel): void {
		const userid = message.author.id;
		const displayName =
			linkedChannel.members.get(userid)?.displayName ?? message.member?.displayName ?? message.author.displayName;

		const avatarUrl =
			linkedChannel.members.get(userid)?.avatarURL() ??
			message.member?.avatarURL() ??
			message.author.defaultAvatarURL;

		const webhookService = getWebhookService();
		if (!webhookService) {
			throw new Error('WebhookService not found');
		}
		webhookService.writeMessage(linkedChannel, {
			username: displayName,
			avatarURL: avatarUrl,
			content: message.content,
			embeds: [],
		});
	}
}
