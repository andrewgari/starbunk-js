import { Guild, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel, GuildScheduledEventStatus } from 'discord.js';
import { EventManager } from './interfaces';

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
