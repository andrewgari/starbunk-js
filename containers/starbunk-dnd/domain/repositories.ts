// Repository interfaces for starbunk-dnd
import { Campaign, Character, GameSession } from './models';

export interface CreateCampaignData {
	name: string;
	description?: string;
	gameSystem: string;
	dmUserId: string;
	channelId?: string;
}

export interface CampaignMetadata {
	id: string;
	name: string;
	gameSystem: string;
	playerCount: number;
	isActive: boolean;
}

export interface CampaignRepository {
	create(data: CreateCampaignData): Promise<Campaign>;
	findById(id: string): Promise<Campaign | null>;
	findByUserId(userId: string): Promise<Campaign[]>;
	findByChannelId(channelId: string): Promise<Campaign[]>;
	update(id: string, updates: Partial<Campaign>): Promise<Campaign | null>;
	delete(id: string): Promise<boolean>;
	getMetadata(id: string): Promise<CampaignMetadata | null>;
}

export interface CharacterRepository {
	create(character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>): Promise<Character>;
	findById(id: string): Promise<Character | null>;
	findByUserId(userId: string): Promise<Character[]>;
	findByCampaignId(campaignId: string): Promise<Character[]>;
	update(id: string, updates: Partial<Character>): Promise<Character | null>;
	delete(id: string): Promise<boolean>;
}

export interface GameSessionRepository {
	create(session: Omit<GameSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<GameSession>;
	findById(id: string): Promise<GameSession | null>;
	findByCampaignId(campaignId: string): Promise<GameSession[]>;
	update(id: string, updates: Partial<GameSession>): Promise<GameSession | null>;
	delete(id: string): Promise<boolean>;
}
