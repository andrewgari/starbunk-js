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
	gmId: string;
	channelId: string;
	adventureId: string;
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
	'pf2e': {
		id: 'pf2e',
		name: 'Pathfinder',
		version: '2e',
		description: 'Pathfinder Second Edition'
	},
	'dnd5e': {
		id: 'dnd5e',
		name: 'Dungeons & Dragons',
		version: '5e',
		description: 'Dungeons & Dragons 5th Edition'
	}
} as const;
