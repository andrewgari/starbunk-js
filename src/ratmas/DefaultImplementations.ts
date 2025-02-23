import { CategoryChannel, ChannelType, Guild, TextChannel, ThreadChannel } from 'discord.js';
import { ChannelManager } from './interfaces';

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

// Similar implementations for EventManager and MessageSender
