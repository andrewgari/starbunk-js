export type StorageScope = 'public' | 'gm-only';

export interface StoragePath {
	campaignId: string;
	adventureId: string;
	scope: StorageScope;
	category: string;
	subPath?: string[];
}

export interface StorageItem {
	id: string;
	path: StoragePath;
	content: string;
	metadata: {
		createdAt: Date;
		updatedAt: Date;
		createdBy: string;
		tags: string[];
	};
}

export interface QueryContext {
	campaignId: string;
	adventureId: string;
	isGM: boolean;
	query: string;
	maxResults?: number;
}

export type StorageErrorCode =
	| 'UNAUTHORIZED'
	| 'NOT_FOUND'
	| 'INVALID_PATH'
	| 'WRITE_ERROR'
	| 'READ_ERROR'
	| 'DELETE_ERROR'
	| 'LIST_ERROR';

export class StorageError extends Error {
	constructor(
		message: string,
		public code: StorageErrorCode
	) {
		super(message);
		this.name = 'StorageError';
	}
}

export interface AdventurePaths {
	locations: (campaignId: string) => StoragePath;
	gmLocations: (campaignId: string) => StoragePath;
	npcs: (campaignId: string) => StoragePath;
	gmNpcs: (campaignId: string) => StoragePath;
	rules: (campaignId: string) => StoragePath;
	context: (campaignId: string) => StoragePath;
	gmContext: (campaignId: string) => StoragePath;
}

// Define paths for each adventure
export const STORAGE_PATHS: Record<string, AdventurePaths> = {
	'mad-mage': {
		locations: (campaignId: string) => ({
			campaignId,
			adventureId: 'mad-mage',
			scope: 'public',
			category: 'locations'
		}),
		gmLocations: (campaignId: string) => ({
			campaignId,
			adventureId: 'mad-mage',
			scope: 'gm-only',
			category: 'locations'
		}),
		npcs: (campaignId: string) => ({
			campaignId,
			adventureId: 'mad-mage',
			scope: 'public',
			category: 'npcs'
		}),
		gmNpcs: (campaignId: string) => ({
			campaignId,
			adventureId: 'mad-mage',
			scope: 'gm-only',
			category: 'npcs'
		}),
		rules: (campaignId: string) => ({
			campaignId,
			adventureId: 'mad-mage',
			scope: 'public',
			category: 'rules'
		}),
		context: (campaignId: string) => ({
			campaignId,
			adventureId: 'mad-mage',
			scope: 'public',
			category: 'context'
		}),
		gmContext: (campaignId: string) => ({
			campaignId,
			adventureId: 'mad-mage',
			scope: 'gm-only',
			category: 'context'
		})
	},
	'hot-springs': {
		locations: (campaignId: string) => ({
			campaignId,
			adventureId: 'hot-springs',
			scope: 'public',
			category: 'locations'
		}),
		gmLocations: (campaignId: string) => ({
			campaignId,
			adventureId: 'hot-springs',
			scope: 'gm-only',
			category: 'locations'
		}),
		npcs: (campaignId: string) => ({
			campaignId,
			adventureId: 'hot-springs',
			scope: 'public',
			category: 'npcs'
		}),
		gmNpcs: (campaignId: string) => ({
			campaignId,
			adventureId: 'hot-springs',
			scope: 'gm-only',
			category: 'npcs'
		}),
		rules: (campaignId: string) => ({
			campaignId,
			adventureId: 'hot-springs',
			scope: 'public',
			category: 'rules'
		}),
		context: (campaignId: string) => ({
			campaignId,
			adventureId: 'hot-springs',
			scope: 'public',
			category: 'context'
		}),
		gmContext: (campaignId: string) => ({
			campaignId,
			adventureId: 'hot-springs',
			scope: 'gm-only',
			category: 'context'
		})
	}
} as const;
