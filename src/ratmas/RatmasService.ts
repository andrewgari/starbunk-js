import { CategoryChannel, ChannelType, Client, Guild, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel, TextChannel } from 'discord.js';
import roleIDs from '../discord/roleIDs';
import { RatmasEvent, RatmasParticipant } from './types';

export class RatmasService {
	private currentEvent: RatmasEvent | null = null;
	private readonly client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	async startRatmas(guild: Guild): Promise<void> {
		if (this.currentEvent?.isActive) {
			throw new Error('Ratmas is already active!');
		}

		// Create channel
		const year = new Date().getFullYear();
		const channelName = `ratmas-${year} 🐀`;

		const ratmasCategory = guild.channels.cache.find(
			channel => channel.name === 'Ratmas' && channel.type === 4  // 4 is ChannelType.GuildCategory
		) as CategoryChannel | null;

		if (!ratmasCategory) {
			throw new Error('Ratmas category not found');
		}

		const channel = await guild.channels.create({
			name: channelName,
			type: ChannelType.GuildText,
			parent: ratmasCategory
		});

		// Set default dates
		const startDate = new Date();
		const openingDate = new Date();
		openingDate.setDate(startDate.getDate() + 14);
		// Adjust to next Friday
		openingDate.setDate(openingDate.getDate() + ((5 - openingDate.getDay() + 7) % 7));

		// Initialize participants
		const participants = new Map<string, RatmasParticipant>();
		const ratmasRole = guild.roles.cache.get(roleIDs.Ratmas);
		ratmasRole?.members.forEach(member => {
			participants.set(member.id, { userId: member.id });
		});

		this.currentEvent = {
			channelId: channel.id,
			startDate,
			openingDate,
			participants,
			isActive: true
		};

		await this.assignSecretSantas();
		await this.createServerEvent(guild);
		await this.announceStart(channel as TextChannel);
	}

	private async assignSecretSantas(): Promise<void> {
		if (!this.currentEvent) return;

		const participants = Array.from(this.currentEvent.participants.values());
		const shuffled = [...participants];

		// Fisher-Yates shuffle
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}

		// Assign targets
		for (let i = 0; i < participants.length; i++) {
			const santa = participants[i];
			const target = shuffled[(i + 1) % shuffled.length];
			santa.assignedTargetId = target.userId;

			// Send DM
			const santaUser = await this.client.users.fetch(santa.userId);
			const targetUser = await this.client.users.fetch(target.userId);
			await santaUser.send(
				`🐀 Ho ho ho! You're a Ratmas rat! Your gift recipient is: ${targetUser.username}`
			);
		}
	}

	private async createServerEvent(guild: Guild): Promise<void> {
		if (!this.currentEvent) return;

		await guild.scheduledEvents.create({
			name: `Ratmas ${new Date().getFullYear()} Gift Opening! 🐀`,
			scheduledStartTime: this.currentEvent.openingDate,
			privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
			entityType: GuildScheduledEventEntityType.External,
			entityMetadata: { location: 'Discord Voice Channels' },
			description: 'Time to open our Ratmas gifts! Join us in voice chat!'
		});
	}

	private async announceStart(channel: TextChannel): Promise<void> {
		const openingDate = this.currentEvent?.openingDate.toLocaleDateString();
		await channel.send({
			content: `<@&${roleIDs.Ratmas}>
🐀 **Ratmas ${new Date().getFullYear()} has begun!** 🐀

You have 2 weeks to purchase your gifts! Opening day is ${openingDate}.

Please set your wishlist using the command:
\`/ratmas-wishlist [amazon-url]\`

To view your target's wishlist:
\`/ratmas-check\`

If you notice any issues with wishlists, you can DM me to anonymously notify them.

Happy Ratmas! 🎁`
		});
	}

	async setWishlist(userId: string, url: string): Promise<void> {
		if (!this.currentEvent?.participants.has(userId)) {
			throw new Error('You are not participating in Ratmas');
		}
		const participant = this.currentEvent.participants.get(userId)!;
		participant.wishlistUrl = url;
	}

	// Additional methods to be implemented for commands...
}
