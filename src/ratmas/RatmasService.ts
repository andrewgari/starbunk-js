import { CategoryChannel, ChannelType, Client, Guild, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel, GuildScheduledEventStatus, TextChannel, ThreadChannel } from 'discord.js';
import { promises as fs } from 'fs';
import path from 'path';
import roleIDs from '../discord/roleIDs';
import { RatmasEvent, RatmasParticipant, SerializedRatmasEvent } from './types';

export class RatmasService {
	private currentEvent: RatmasEvent | null = null;
	private readonly client: Client;
	private readonly storageFile = path.join(process.cwd(), 'data', 'ratmas.json');

	constructor(client: Client) {
		this.client = client;
		this.loadState().catch(console.error);
	}

	private async setupRatmasChannel(guild: Guild, year: number): Promise<TextChannel> {
		const channelName = `ratmas-${year} 🐀`;

		// Find or create Ratmas category
		let ratmasCategory = guild.channels.cache.find(
			channel => channel.name === 'Ratmas' && channel.type === ChannelType.GuildCategory
		) as CategoryChannel;

		if (!ratmasCategory) {
			// Create category and move existing Ratmas channels
			ratmasCategory = await guild.channels.create({
				name: 'Ratmas',
				type: ChannelType.GuildCategory
			});

			// Find all Ratmas channels and move them
			const ratmasChannels = guild.channels.cache.filter(channel =>
				channel.name.toLowerCase().startsWith('ratmas-') &&
				channel.type === ChannelType.GuildText
			);

			for (const [, channel] of ratmasChannels) {
				await (channel as TextChannel).edit({ parent: ratmasCategory });
			}
		}

		// Find existing channel (archived or not)
		let channel = guild.channels.cache.find(
			channel => channel.name === channelName && channel.type === ChannelType.GuildText
		) as TextChannel;

		if (!channel) {
			// Create new channel
			channel = await guild.channels.create({
				name: channelName,
				type: ChannelType.GuildText,
				parent: ratmasCategory
			});
		} else {
			// Move to Ratmas category and unarchive if needed
			await channel.edit({ parent: ratmasCategory });
			if (channel.isThread()) {
				const threadChannel = channel as ThreadChannel;
				await threadChannel.setArchived(false);
				await threadChannel.setLocked(false);
			}
		}

		// Move to top
		await channel.edit({ position: 0 });

		return channel;
	}

	async startRatmas(guild: Guild): Promise<void> {
		if (this.currentEvent?.isActive) {
			throw new Error('Ratmas is already active!');
		}

		const year = new Date().getFullYear();
		const channel = await this.setupRatmasChannel(guild, year);

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
			isActive: true,
			year: year,
			guildId: guild.id
		};

		await this.assignSecretSantas();
		await this.createServerEvent(guild);
		await this.announceStart(channel);
		await this.saveState();
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

		const event = await guild.scheduledEvents.create({
			name: `Ratmas ${new Date().getFullYear()} Gift Opening! 🐀`,
			scheduledStartTime: this.currentEvent.openingDate,
			privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
			entityType: GuildScheduledEventEntityType.External,
			entityMetadata: { location: 'Discord Voice Channels' },
			description: 'Time to open our Ratmas gifts! Join us in voice chat!'
		});

		// Add event end handler
		guild.scheduledEvents.fetch(event.id).then(async fetchedEvent => {
			if (fetchedEvent?.status === GuildScheduledEventStatus.Completed) {
				await this.endRatmas(guild, true);
			}
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
		await this.saveState();
	}

	async getTargetWishlist(userId: string): Promise<string> {
		if (!this.currentEvent?.participants.has(userId)) {
			throw new Error('You are not participating in Ratmas');
		}

		const santa = this.currentEvent.participants.get(userId)!;
		if (!santa.assignedTargetId) {
			throw new Error('No target assigned yet');
		}

		const target = this.currentEvent.participants.get(santa.assignedTargetId)!;
		const targetUser = await this.client.users.fetch(target.userId);

		if (!target.wishlistUrl) {
			// Search for wishlist in channel history
			const channel = await this.client.channels.fetch(this.currentEvent.channelId) as TextChannel;
			const messages = await channel.messages.fetch({ limit: 100 });
			const wishlistMessage = messages.find(msg =>
				msg.author.id === target.userId &&
				(msg.content.includes('amazon.com') || msg.content.includes('amzn.to'))
			);

			if (wishlistMessage) {
				// Store found wishlist for future use
				target.wishlistUrl = wishlistMessage.content;
				return `🎁 ${targetUser.username}'s wishlist (found in chat): ${wishlistMessage.content}`;
			}

			// Notify target that their wishlist is needed
			await targetUser.send(
				`🐀 Hey there! Someone is trying to view your Ratmas wishlist, but you haven't set one yet!\n` +
				`Please use \`/ratmas-wishlist\` to set your Amazon wishlist URL.`
			);

			return `${targetUser.username} hasn't set their wishlist yet! 😢\nI've sent them a reminder to set it.`;
		}

		return `🎁 ${targetUser.username}'s wishlist: ${target.wishlistUrl}`;
	}

	async reportWishlistIssue(reporterId: string, message: string): Promise<void> {
		if (!this.currentEvent?.participants.has(reporterId)) {
			throw new Error('You are not participating in Ratmas');
		}

		const reporter = this.currentEvent.participants.get(reporterId)!;
		if (!reporter.assignedTargetId) {
			throw new Error('No target assigned yet');
		}

		const target = await this.client.users.fetch(reporter.assignedTargetId);
		await target.send(
			`🐀 Anonymous Ratmas Message: Your wishlist needs attention!\n\n${message}\n\nPlease update your wishlist using \`/ratmas-wishlist\``
		);
	}

	async adjustOpeningDate(guild: Guild, dateStr: string): Promise<void> {
		if (!this.currentEvent?.isActive) {
			throw new Error('No active Ratmas event');
		}

		const newDate = new Date(dateStr);
		if (isNaN(newDate.getTime())) {
			throw new Error('Invalid date format. Please use MM/DD/YYYY');
		}

		this.currentEvent.openingDate = newDate;

		// Update the server event
		const events = await guild.scheduledEvents.fetch();
		const ratmasEvent = events.find(e =>
			e.name.includes('Ratmas') && e.name.includes(new Date().getFullYear().toString())
		);

		if (ratmasEvent) {
			await ratmasEvent.edit({
				scheduledStartTime: newDate
			});
		}

		// Announce change
		const channel = await guild.channels.fetch(this.currentEvent.channelId) as TextChannel;
		await channel.send({
			content: `🐀 **Ratmas Update!**\nThe opening date has been adjusted to ${newDate.toLocaleDateString()}!`
		});
	}

	async endRatmas(guild: Guild, autoEnded: boolean = false): Promise<void> {
		if (!this.currentEvent?.isActive) {
			throw new Error('No active Ratmas event');
		}

		const channel = await guild.channels.fetch(this.currentEvent.channelId) as TextChannel;

		// Send final message
		await channel.send({
			content: `🐀 **Ratmas ${new Date().getFullYear()} has ${autoEnded ? 'automatically ' : ''}ended!**\n` +
				'Thank you everyone for participating! This channel will now be archived. 🎁'
		});

		// Archive the channel
		if (channel.isThread()) {
			const threadChannel = channel as ThreadChannel;
			await threadChannel.setArchived(true);
			await threadChannel.setLocked(true);
		}

		// Clean up the event
		this.currentEvent.isActive = false;
		await this.saveState();
	}

	private async saveState(): Promise<void> {
		if (!this.currentEvent) return;

		const serialized: SerializedRatmasEvent = {
			...this.currentEvent,
			startDate: this.currentEvent.startDate.toISOString(),
			openingDate: this.currentEvent.openingDate.toISOString(),
			participants: Array.from(this.currentEvent.participants.entries()),
			year: this.currentEvent.year
		};

		await fs.mkdir(path.dirname(this.storageFile), { recursive: true });
		await fs.writeFile(this.storageFile, JSON.stringify(serialized, null, 2));
	}

	private async loadState(): Promise<void> {
		try {
			const data = await fs.readFile(this.storageFile, 'utf-8');
			const serialized: SerializedRatmasEvent = JSON.parse(data);

			this.currentEvent = {
				...serialized,
				startDate: new Date(serialized.startDate),
				openingDate: new Date(serialized.openingDate),
				participants: new Map(serialized.participants)
			};

			// Set up event end handler if event is still active
			if (this.currentEvent.isActive) {
				const guild = await this.client.guilds.fetch(this.currentEvent.guildId);
				const events = await guild.scheduledEvents.fetch();
				const ratmasEvent = events.find(e =>
					e.name.includes('Ratmas') && e.name.includes(this.currentEvent!.year.toString())
				);

				if (ratmasEvent) {
					this.watchEvent(guild, ratmasEvent.id);
				}
			}
		} catch (error) {
			// No saved state or error reading file
			this.currentEvent = null;
		}
	}

	private watchEvent(guild: Guild, eventId: string): void {
		guild.scheduledEvents.fetch(eventId).then(async fetchedEvent => {
			if (fetchedEvent) {
				switch (fetchedEvent.status) {
					case GuildScheduledEventStatus.Completed:
						await this.endRatmas(guild, true);
						break;
					case GuildScheduledEventStatus.Active:
					case GuildScheduledEventStatus.Scheduled:
						// Check again in 5 minutes
						setTimeout(() => this.watchEvent(guild, eventId), 5 * 60 * 1000);
						break;
				}
			}
		});
	}

	// Additional methods to be implemented for commands...
}
