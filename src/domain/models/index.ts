import { GameSystem } from '../../starbunk/types/game';

export interface Campaign {
	id: string;
	name: string;
	system: GameSystem;
	textChannelId: string;
	voiceChannelId?: string;
	gmId: string;
	guildId: string;
	adventureId?: string;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface Message {
	id: string;
	content: string;
	authorId: string;
	campaignId: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface Note {
	id: string;
	campaignId: string;
	content: string;
	userId: string;
	isGM: boolean;
	tags: string[];
	createdAt: Date;
}

export interface TimeEntry {
	id: string;
	userId: string;
	activityType: string;
	startTime: Date;
	endTime?: Date;
}

export interface StoredFile {
	id: string;
	name: string;
	url: string;
	type: string;
	size: number;
	uploaderId: string;
	campaignId: string;
	createdAt: Date;
	updatedAt: Date;
}
