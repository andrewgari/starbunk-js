import { GameSystem } from '../../starbunk/types/game';
import { Campaign, Message, Note, StoredFile, TimeEntry } from '../models';

export type CreateCampaignData = {
	name: string;
	system: GameSystem;
	textChannelId: string;
	voiceChannelId?: string;
	gmId: string;
	guildId: string;
	isActive: boolean;
	adventureId?: string;
};

export interface CampaignMetadata {
	name: string;
	system: GameSystem;
	textChannelId: string;  // Text channel where commands are issued
	voiceChannelId: string; // Voice channel for events and voice chat
	gmId: string;
	isActive: boolean;
	adventureId: string;
	sessions: Array<{
		title: string;
		date: string;
		description?: string;
		discordEventId?: string;
		isRecurring?: boolean;
		recurringInterval?: 'weekly' | 'biweekly' | 'monthly';
		skippedDates?: string[];
	}>;
	characters: Array<{
		name: string;
		class: string;
	}>;
	reminders: Array<{
		message: string;
		time: string;
	}>;
}

export interface CampaignRepository {
	create(data: CreateCampaignData): Promise<Campaign>;
	findById(id: string): Promise<Campaign | null>;
	findAll(): Promise<Campaign[]>;
	update(id: string, data: Partial<Campaign>): Promise<Campaign>;
	delete(id: string): Promise<void>;
	updateMetadata(id: string, metadata: CampaignMetadata): Promise<void>;
	getMetadata(id: string): Promise<CampaignMetadata | null>;
}

export interface MessageRepository {
	create(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message>;
	findByCampaign(campaignId: string, limit?: number): Promise<Message[]>;
	findByTimeRange(campaignId: string, start: Date, end: Date): Promise<Message[]>;
}

export interface NoteRepository {
	create(note: Omit<Note, 'id' | 'createdAt'>): Promise<Note>;
	findByCampaign(campaignId: string): Promise<Note[]>;
	findByTags(campaignId: string, tags: string[]): Promise<Note[]>;
	update(id: string, note: Partial<Note>): Promise<Note>;
	delete(id: string): Promise<void>;
}

export interface TimeEntryRepository {
	create(entry: Omit<TimeEntry, 'id'>): Promise<TimeEntry>;
	findActive(userId: string): Promise<TimeEntry | null>;
	findByDateRange(userId: string, start: Date, end: Date): Promise<TimeEntry[]>;
	update(id: string, entry: Partial<TimeEntry>): Promise<TimeEntry>;
}

export interface FileRepository {
	save(file: Buffer, metadata: Omit<StoredFile, 'id' | 'path' | 'createdAt'>): Promise<StoredFile>;
	findById(id: string): Promise<StoredFile | null>;
	findByCampaign(campaignId: string): Promise<StoredFile[]>;
	getContent(id: string): Promise<Buffer>;
	delete(id: string): Promise<void>;
}
