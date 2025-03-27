import { Campaign, Message, Note, StoredFile, TimeEntry } from '../models';

export type CreateCampaignData = Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>;

export interface CampaignMetadata {
	characters: Array<{
		name: string;
		class: string;
	}>;
	sessions: Array<{
		date: string;
		description?: string;
	}>;
	reminders: Array<{
		message: string;
		time: string;
	}>;
}

export interface CampaignRepository {
	create(campaign: CreateCampaignData): Promise<Campaign>;
	findById(id: string): Promise<Campaign | null>;
	findByChannel(channelId: string): Promise<Campaign | null>;
	list(): Promise<Campaign[]>;
	update(id: string, campaign: Partial<Campaign>): Promise<Campaign>;
	delete(id: string): Promise<void>;
	getMetadata(campaignId: string): Promise<CampaignMetadata | null>;
	updateMetadata(campaignId: string, metadata: CampaignMetadata): Promise<void>;
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
