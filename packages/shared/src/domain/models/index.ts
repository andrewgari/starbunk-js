// Define GameSystem enum locally since it's not available in shared package
export enum GameSystem {
	DND5E = 'dnd5e',
	PATHFINDER = 'pathfinder',
	CALL_OF_CTHULHU = 'call_of_cthulhu',
	VAMPIRE = 'vampire',
	OTHER = 'other',
}

export interface Campaign {
	id: string;
	name: string;
	system: GameSystem;
	textChannelId: string;
	voiceChannelId: string;
	gmId: string;
	adventureId: string;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface Message {
	id: string;
	campaignId: string;
	content: string;
	userId: string;
	messageId: string;
	timestamp: Date;
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
	campaignId: string;
	name: string;
	path: string;
	mimeType: string;
	size: number;
	createdAt: Date;
}
