import { CategoryChannel, ChannelType, Guild, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel, GuildScheduledEventStatus, TextChannel, ThreadChannel, User } from 'discord.js';
import { ChannelManager, EventManager, MessageSender } from './interfaces';

export class DiscordChannelManager implements ChannelManager {
	async setupRatmasChannel(guild: Guild, year: number): Promise<TextChannel> {
		const channelName = `ratmas-${year} 🐀`;
		let ratmasCategory = guild.channels.cache.find(
			channel => channel.name === 'Ratmas' && channel.type === ChannelType.GuildCategory
		) as CategoryChannel;

		if (!ratmasCategory) {
			ratmasCategory = await guild.channels.create({
				name: 'Ratmas',
				type: ChannelType.GuildCategory
			});

			const ratmasChannels = guild.channels.cache.filter(channel =>
				channel.name.toLowerCase().startsWith('ratmas-') &&
				channel.type === ChannelType.GuildText
			);

			for (const [, channel] of ratmasChannels) {
				await (channel as TextChannel).edit({ parent: ratmasCategory });
			}
		}

		let channel = guild.channels.cache.find(
			channel => channel.name === channelName && channel.type === ChannelType.GuildText
		) as TextChannel;

		if (!channel) {
			channel = await guild.channels.create({
				name: channelName,
				type: ChannelType.GuildText,
				parent: ratmasCategory
			});
		} else {
			await channel.edit({ parent: ratmasCategory });
			if (channel.isThread()) {
				const threadChannel = channel as ThreadChannel;
				await threadChannel.setArchived(false);
				await threadChannel.setLocked(false);
			}
		}

		await channel.edit({ position: 0 });
		return channel;
	}

	async archiveChannel(channel: TextChannel): Promise<void> {
		if (channel.isThread()) {
			const threadChannel = channel as ThreadChannel;
			await threadChannel.setArchived(true);
			await threadChannel.setLocked(true);
		}
	}
}

export class DiscordEventManager implements EventManager {
	async createEvent(guild: Guild, date: Date): Promise<string> {
		const event = await guild.scheduledEvents.create({
			name: `Ratmas ${new Date().getFullYear()} Gift Opening! 🐀`,
			scheduledStartTime: date,
			privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
			entityType: GuildScheduledEventEntityType.External,
			entityMetadata: { location: 'Discord Voice Channels' },
			description: 'Time to open our Ratmas gifts! Join us in voice chat!'
		});
		return event.id;
	}

	watchEvent(guild: Guild, eventId: string, onComplete: () => Promise<void>): void {
		guild.scheduledEvents.fetch(eventId).then(async fetchedEvent => {
			if (fetchedEvent) {
				switch (fetchedEvent.status) {
					case GuildScheduledEventStatus.Completed:
						await onComplete();
						break;
					case GuildScheduledEventStatus.Active:
					case GuildScheduledEventStatus.Scheduled:
						setTimeout(() => this.watchEvent(guild, eventId, onComplete), 5 * 60 * 1000);
						break;
				}
			}
		});
	}
}

export class DiscordMessageSender implements MessageSender {
	async sendDM(user: User, message: string): Promise<void> {
		await user.send(message);
	}

	async announceInChannel(channel: TextChannel, message: string): Promise<void> {
		await channel.send(message);
	}
}
