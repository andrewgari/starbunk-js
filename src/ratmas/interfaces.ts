import { Guild, TextChannel, User } from 'discord.js';
import { SerializedRatmasEvent } from './types';

export interface RatmasStorage {
	save(data: SerializedRatmasEvent): Promise<void>;
	load(): Promise<SerializedRatmasEvent | null>;
}

export interface ChannelManager {
	setupRatmasChannel(guild: Guild, year: number): Promise<TextChannel>;
	archiveChannel(channel: TextChannel): Promise<void>;
}

export interface EventManager {
	createEvent(guild: Guild, date: Date): Promise<string>;
	watchEvent(guild: Guild, eventId: string, onComplete: () => Promise<void>): void;
}

export interface MessageSender {
	sendDM(user: User, message: string): Promise<void>;
	announceInChannel(channel: TextChannel, message: string): Promise<void>;
}
