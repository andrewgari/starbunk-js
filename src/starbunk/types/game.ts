export interface GameSystem {
	id: string;
	name: string;
	version: string;
	description: string;
}

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

// Base type for any game content (notes, questions, etc)
export interface GameContent {
	id: string;
	campaignId: string;
	content: string;
	tags: string[];
	isGMOnly: boolean;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
	systemData?: PF2eData | DnD5eData;
}

// Example of system-specific data interfaces
export interface PF2eData {
	level?: number;
	rarity?: 'common' | 'uncommon' | 'rare' | 'unique';
	traits?: string[];
}

export interface DnD5eData {
	level?: number;
	rarity?: 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary';
	attunement?: boolean;
}

export interface Note {
	content: string;
	userId: string;
	category: string;
	tags: string[];
	isGMOnly: boolean;
	timestamp: Date;
}

export const SUPPORTED_SYSTEMS: Record<string, GameSystem> = {
	dnd5e: {
		id: 'dnd5e',
		name: 'D&D 5th Edition',
		version: '5.1',
		description: 'The fifth edition of Dungeons & Dragons'
	},
	pathfinder2e: {
		id: 'pathfinder2e',
		name: 'Pathfinder 2nd Edition',
		version: '2.0',
		description: 'The second edition of Pathfinder'
	}
};
