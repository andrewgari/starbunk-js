import { Client, Guild, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel, TextChannel, ThreadChannel } from 'discord.js';
import roleIDs from '../discord/roleIDs';
import { ChannelManager, EventManager, MessageSender } from './interfaces';
import { IRatmasStorage } from './storage/RatmasStorage';
import { RatmasEvent, RatmasParticipant, SerializedRatmasEvent } from './types';

export class RatmasService {
	private currentEvent: RatmasEvent | null = null;

	constructor(
		private readonly client: Client,
		private readonly storage: IRatmasStorage,
		private readonly channelManager: ChannelManager,
		private readonly eventManager: EventManager,
		private readonly messageSender: MessageSender
	) {
		this.loadState().catch(console.error);
	}

	async startRatmas(guild: Guild): Promise<void> {
		if (this.currentEvent?.isActive) {
			throw new Error('Ratmas is already active!');
		}

		const year = new Date().getFullYear();
		const channel = await this.channelManager.setupRatmasChannel(guild, year);

		// Set default dates
		const startDate = new Date();
		const openingDate = this.calculateOpeningDate(startDate);

		// Initialize participants
		const participants = this.initializeParticipants(guild);

		this.currentEvent = {
			channelId: channel.id,
			startDate,
			openingDate,
			participants,
			isActive: true,
			year: year,
			guildId: guild.id,
			eventId: ''  // Will be set after creating server event
		};

		await this.assignSecretSantas();
		await this.createServerEvent(guild);
		await this.announceStart(channel);
		await this.saveState();
	}

	private calculateOpeningDate(startDate: Date): Date {
		const openingDate = new Date(startDate);
		openingDate.setDate(startDate.getDate() + 14);
		// Adjust to next Friday
		openingDate.setDate(openingDate.getDate() + ((5 - openingDate.getDay() + 7) % 7));
		return openingDate;
	}

	private initializeParticipants(guild: Guild): [string, RatmasParticipant][] {
		const participants: [string, RatmasParticipant][] = [];
		const ratmasRole = guild.roles.cache.get(roleIDs.Ratmas);

		ratmasRole?.members.forEach(member => {
			participants.push([member.id, { userId: member.id }]);
		});

		return participants;
	}

	private async assignSecretSantas(): Promise<void> {
		if (!this.currentEvent) return;

		const participants = this.currentEvent.participants.map(([, p]) => p);
		const shuffled = this.shuffleParticipants(participants);

		// Assign targets and notify participants
		await this.assignTargetsAndNotify(participants, shuffled);
	}

	private shuffleParticipants<T>(array: T[]): T[] {
		const shuffled = [...array];
		// Fisher-Yates shuffle
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}

	private async assignTargetsAndNotify(participants: RatmasParticipant[], shuffled: RatmasParticipant[]): Promise<void> {
		for (let i = 0; i < participants.length; i++) {
			const santa = participants[i];
			const target = shuffled[(i + 1) % shuffled.length];
			santa.assignedTargetId = target.userId;

			// Send DM
			const santaUser = await this.client.users.fetch(santa.userId);
			const targetUser = await this.client.users.fetch(target.userId);
			await this.messageSender.sendDM(
				santaUser,
				`🐀 Ho ho ho! You're a Ratmas rat! Your gift recipient is: ${targetUser.username}`
			);
		}
	}

	private async createServerEvent(guild: Guild): Promise<void> {
		if (!this.currentEvent) return;

		const event = await guild.scheduledEvents.create({
			name: `Ratmas ${this.currentEvent.year} Gift Opening! 🐀`,
			scheduledStartTime: this.currentEvent.openingDate,
			privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
			entityType: GuildScheduledEventEntityType.External,
			entityMetadata: { location: 'Discord Voice Channels' },
			description: 'Time to open our Ratmas gifts! Join us in voice chat!'
		});

		this.currentEvent.eventId = event.id;
		await this.saveState();
	}

	private async announceStart(channel: TextChannel): Promise<void> {
		if (!this.currentEvent) {
			throw new Error('No active Ratmas event');
		}

		const openingDate = this.currentEvent.openingDate.toLocaleDateString();
		const announcement = this.createStartAnnouncement(openingDate);
		await this.messageSender.announceInChannel(channel, announcement);
	}

	private createStartAnnouncement(openingDate: string): string {
		return `<@&${roleIDs.Ratmas}>\n🐀 **Ratmas ${new Date().getFullYear()} has begun!** 🐀\n\nYou have 2 weeks to purchase your gifts! Opening day is ${openingDate}.

Please set your wishlist using the command:
\`/ratmas-wishlist [amazon-url]\`

To view your target's wishlist:
\`/ratmas-check\`

If you notice any issues with wishlists, you can DM me to anonymously notify them.

Happy Ratmas! 🎁`;
	}

	private findParticipant(userId: string): RatmasParticipant | undefined {
		if (!this.currentEvent) return undefined;
		return this.currentEvent.participants
			.find(([id]) => id === userId)?.[1];
	}

	async setWishlist(userId: string, url: string): Promise<void> {
		if (!this.currentEvent) {
			throw new Error('No active Ratmas event');
		}

		const participant = this.findParticipant(userId);
		if (!participant) {
			throw new Error('You are not participating in Ratmas');
		}

		participant.wishlistUrl = url;
		await this.saveState();
	}

	async getTargetWishlist(userId: string): Promise<string> {
		if (!this.currentEvent) {
			throw new Error('No active Ratmas event');
		}

		const santa = this.findParticipant(userId);
		if (!santa) {
			throw new Error('You are not participating in Ratmas');
		}

		if (!santa.assignedTargetId) {
			throw new Error('No target assigned yet');
		}

		const target = this.findParticipant(santa.assignedTargetId);
		if (!target) {
			throw new Error('Target not found');
		}

		const targetUser = await this.client.users.fetch(target.userId);

		if (!target.wishlistUrl) {
			return await this.handleMissingWishlist(target, targetUser);
		}

		return `🎁 ${targetUser.username}'s wishlist: ${target.wishlistUrl}`;
	}

	private async handleMissingWishlist(target: RatmasParticipant, targetUser: any): Promise<string> {
		// Search for wishlist in channel history
		const wishlistFromChat = await this.findWishlistInChat(target);

		if (wishlistFromChat) {
			// Store found wishlist for future use
			target.wishlistUrl = wishlistFromChat;
			await this.saveState();
			return `🎁 ${targetUser.username}'s wishlist (found in chat): ${wishlistFromChat}`;
		}

		// Notify target that their wishlist is needed
		await this.notifyMissingWishlist(targetUser);
		return `${targetUser.username} hasn't set their wishlist yet! 😢\nI've sent them a reminder to set it.`;
	}

	private async findWishlistInChat(target: RatmasParticipant): Promise<string | null> {
		if (!this.currentEvent) return null;

		const channel = await this.client.channels.fetch(this.currentEvent.channelId) as TextChannel;
		const messages = await channel.messages.fetch({ limit: 100 });

		const wishlistMessage = messages.find(msg =>
			msg.author.id === target.userId &&
			(msg.content.includes('amazon.com') || msg.content.includes('amzn.to'))
		);

		return wishlistMessage ? wishlistMessage.content : null;
	}

	private async notifyMissingWishlist(targetUser: any): Promise<void> {
		await targetUser.send(
			`🐀 Hey there! Someone is trying to view your Ratmas wishlist, but you haven't set one yet!\n` +
			`Please use \`/ratmas-wishlist\` to set your Amazon wishlist URL.`
		);
	}

	async reportWishlistIssue(reporterId: string, message: string): Promise<void> {
		const reporter = this.findParticipant(reporterId);
		if (!reporter) {
			throw new Error('You are not participating in Ratmas');
		}

		if (!reporter.assignedTargetId) {
			throw new Error('No target assigned yet');
		}

		const target = await this.client.users.fetch(reporter.assignedTargetId);
		await this.messageSender.sendDM(target,
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
		await this.updateServerEvent(guild, newDate);
		await this.announceOpeningDateChange(guild, newDate);
		await this.saveState();
	}

	private async updateServerEvent(guild: Guild, newDate: Date): Promise<void> {
		const events = await guild.scheduledEvents.fetch();
		const ratmasEvent = events.find(e =>
			e.name.includes('Ratmas') && e.name.includes(new Date().getFullYear().toString())
		);

		if (ratmasEvent) {
			await ratmasEvent.edit({
				scheduledStartTime: newDate
			});
		}
	}

	private async announceOpeningDateChange(guild: Guild, newDate: Date): Promise<void> {
		if (!this.currentEvent) return;

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
		await this.sendEndingMessage(channel, autoEnded);
		await this.archiveChannel(channel);

		this.currentEvent.isActive = false;
		await this.saveState();
	}

	private async sendEndingMessage(channel: TextChannel, autoEnded: boolean): Promise<void> {
		await channel.send({
			content: `🐀 **Ratmas ${new Date().getFullYear()} has ${autoEnded ? 'automatically ' : ''}ended!**\n` +
				'Thank you everyone for participating! This channel will now be archived. 🎁'
		});
	}

	private async archiveChannel(channel: TextChannel): Promise<void> {
		if (channel.isThread()) {
			const threadChannel = channel as ThreadChannel;
			await threadChannel.setArchived(true);
			await threadChannel.setLocked(true);
		}
	}

	private async saveState(): Promise<void> {
		if (!this.currentEvent) return;

		const serialized: SerializedRatmasEvent = {
			...this.currentEvent,
			startDate: this.currentEvent.startDate.toISOString(),
			openingDate: this.currentEvent.openingDate.toISOString(),
			participants: this.currentEvent.participants,
			year: this.currentEvent.year
		};

		await this.storage.save(serialized);
	}

	private async loadState(): Promise<void> {
		const serialized = await this.storage.load();

		if (serialized) {
			this.currentEvent = {
				...serialized,
				startDate: new Date(serialized.startDate),
				openingDate: new Date(serialized.openingDate),
				participants: serialized.participants
			};

			this.setupEventEndHandler();
		} else {
			this.currentEvent = null;
		}
	}

	private async setupEventEndHandler(): Promise<void> {
		if (!this.currentEvent?.isActive) return;

		const guild = await this.client.guilds.fetch(this.currentEvent.guildId);
		this.eventManager.watchEvent(guild, this.currentEvent.eventId, async () => {
			await this.endRatmas(guild, true);
		});
	}
}
