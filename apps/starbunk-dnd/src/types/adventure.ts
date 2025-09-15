import { GameSystem } from './game';

export interface Location {
	id: string;
	name: string;
	description: string;
	tags: string[];
	isGMOnly: boolean;
	parentLocationId?: string; // For nested locations (e.g., rooms within a dungeon level)
	systemData?: Record<string, unknown>;
}

export interface NPC {
	id: string;
	name: string;
	description: string;
	tags: string[];
	isGMOnly: boolean;
	systemData?: Record<string, unknown>;
}

// Adventure-specific metadata
export interface AdventureMetadata {
	id: string;
	name: string;
	system: GameSystem;
	description: string;
	recommendedLevels: {
		min: number;
		max: number;
	};
}

// Specific adventure definitions
export const ADVENTURES: Record<string, AdventureMetadata> = {
	'mad-mage': {
		id: 'mad-mage',
		name: 'Waterdeep: Dungeon of the Mad Mage',
		system: {
			id: 'dnd5e',
			name: 'Dungeons & Dragons',
			version: '5e',
			description: 'Dungeons & Dragons 5th Edition',
		},
		description: 'A megadungeon adventure beneath Waterdeep',
		recommendedLevels: {
			min: 5,
			max: 20,
		},
	},
	'hot-springs': {
		id: 'hot-springs',
		name: 'The Dark of Hot Springs Island',
		system: {
			id: 'pf2e',
			name: 'Pathfinder',
			version: '2e',
			description: 'Pathfinder Second Edition',
		},
		description: 'A hexcrawl adventure on a mysterious island',
		recommendedLevels: {
			min: 1,
			max: 10,
		},
	},
} as const;

// System-specific location data
export interface DungeonOfMadMageLocation extends Location {
	systemData: {
		dungeonLevel: number;
		encounterLevel?: number;
		traps?: Array<{
			name: string;
			dc: number;
			damage?: string;
		}>;
	};
}

export interface HotSpringsIslandLocation extends Location {
	systemData: {
		hexId: string;
		terrain: string;
		encounters?: Array<{
			level: number;
			frequency: 'common' | 'uncommon' | 'rare';
			creatures: string[];
		}>;
	};
}

// System-specific NPC data
export interface DungeonOfMadMageNPC extends NPC {
	systemData: {
		statBlock?: string;
		cr?: number;
		faction?: string;
	};
}

export interface HotSpringsIslandNPC extends NPC {
	systemData: {
		level?: number;
		rarity: 'common' | 'uncommon' | 'rare' | 'unique';
		faction?: string;
		traits?: string[];
	};
}
