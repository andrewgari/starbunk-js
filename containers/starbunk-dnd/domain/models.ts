// Domain models for starbunk-dnd
export interface Campaign {
	id: string;
	name: string;
	description?: string;
	gameSystem: string;
	dmUserId: string;
	playerUserIds: string[];
	channelId?: string;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface Character {
	id: string;
	name: string;
	gameSystem: string;
	level: number;
	userId: string;
	campaignId?: string;
	stats: Record<string, number>;
	skills: Record<string, number>;
	equipment: string[];
	notes: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface GameSession {
	id: string;
	campaignId: string;
	name: string;
	description?: string;
	scheduledAt: Date;
	duration: number;
	participants: string[];
	notes: string;
	isCompleted: boolean;
	createdAt: Date;
	updatedAt: Date;
}
