import { CategoryChannel, ChannelType, Guild, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel, GuildScheduledEventStatus, TextChannel, ThreadChannel, User } from 'discord.js';
import { ChannelManager, EventManager, MessageSender } from './interfaces';

export class DiscordChannelManager implements ChannelManager {
	async setupRatmasChannel(guild: Guild, year: number): Promise<TextChannel> {
		const channelName = `ratmas-${year} 🐀`;
		const ratmasCategory = await this.getOrCreateCategory(guild);
		const channel = await this.getOrCreateChannel(guild, channelName, ratmasCategory);

		await channel.edit({ position: 0 });
		return channel;
	}

	private async getOrCreateCategory(guild: Guild): Promise<CategoryChannel> {
		let category = guild.channels.cache.find(
			channel => channel.name === 'Ratmas' && channel.type === ChannelType.GuildCategory
		) as CategoryChannel | undefined;

		if (!category) {
			category = await guild.channels.create({
				name: 'Ratmas',
				type: ChannelType.GuildCategory
			}) as CategoryChannel;
			await this.moveExistingChannelsToCategory(guild, category);
		}

		return category;
	}

	private async moveExistingChannelsToCategory(guild: Guild, category: CategoryChannel): Promise<void> {
		const ratmasChannels = guild.channels.cache.filter(channel =>
			channel.name.toLowerCase().startsWith('ratmas-') &&
			channel.type === ChannelType.GuildText
		);

		for (const [, channel] of ratmasChannels) {
			await (channel as TextChannel).edit({ parent: category });
		}
	}

	private async getOrCreateChannel(guild: Guild, channelName: string, category: CategoryChannel): Promise<TextChannel> {
		let channel = guild.channels.cache.find(
			channel => channel.name === channelName && channel.type === ChannelType.GuildText
		) as TextChannel | undefined;

		if (!channel) {
			return await guild.channels.create({
				name: channelName,
				type: ChannelType.GuildText,
				parent: category
			}) as TextChannel;
		}

		await channel.edit({ parent: category });
		if (channel.isThread()) {
			await this.unarchiveThread(channel as ThreadChannel);
		}

		return channel;
	}

	private async unarchiveThread(thread: ThreadChannel): Promise<void> {
		await thread.setArchived(false);
		await thread.setLocked(false);
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
		this.checkEventStatus(guild, eventId, onComplete);
	}

	private async checkEventStatus(guild: Guild, eventId: string, onComplete: () => Promise<void>): Promise<void> {
		const fetchedEvent = await guild.scheduledEvents.fetch(eventId);

		if (fetchedEvent) {
			switch (fetchedEvent.status) {
				case GuildScheduledEventStatus.Completed:
					await onComplete();
					break;
				case GuildScheduledEventStatus.Active:
				case GuildScheduledEventStatus.Scheduled:
					// Check again in 5 minutes
					setTimeout(() => this.checkEventStatus(guild, eventId, onComplete), 5 * 60 * 1000);
					break;
			}
		}
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
