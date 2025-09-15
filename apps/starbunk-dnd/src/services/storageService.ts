import { logger } from '@starbunk/shared';
import { QueryContext, StorageError, StorageItem, StoragePath } from '../types/storage';
import { FileStorageAdapter } from './fileStorageAdapter';

// Minimal observable implementation to avoid external rxjs dependency
type Unsubscribe = { unsubscribe: () => void };
type ObservableLike<T> = { subscribe: (fn: (v: T) => void) => Unsubscribe };
class SimpleSubject<T> {
	private listeners: Array<(v: T) => void> = [];
	next(value: T) {
		for (const l of this.listeners) l(value);
	}
	asObservable(): ObservableLike<T> {
		return {
			subscribe: (fn: (v: T) => void): Unsubscribe => {
				this.listeners.push(fn);
				return {
					unsubscribe: () => {
						this.listeners = this.listeners.filter((f) => f !== fn);
					},
				};
			},
		};
	}
}

export class StorageService {
	private static instance: StorageService;
	private fileAdapter: FileStorageAdapter;
	private cache: Map<string, StorageItem>;
	private storageUpdates: SimpleSubject<void>;

	private constructor() {
		this.fileAdapter = FileStorageAdapter.getInstance();
		this.cache = new Map();
		this.storageUpdates = new SimpleSubject<void>();

		// Subscribe to file updates to refresh cache
		this.fileAdapter.getFileUpdates().subscribe(() => {
			this.refreshCache();
		});
	}

	public static getInstance(): StorageService {
		if (!StorageService.instance) {
			StorageService.instance = new StorageService();
		}
		return StorageService.instance;
	}

	private generateStorageKey(path: StoragePath): string {
		return [path.campaignId, path.adventureId, path.scope, path.category, ...(path.subPath || [])].join('/');
	}

	private validateAccess(path: StoragePath, isGM: boolean): boolean {
		if (path.scope === 'gm-only' && !isGM) {
			return false;
		}
		return true;
	}

	private async refreshCache(): Promise<void> {
		this.cache.clear();
		// We'll lazily load items as they're requested
		this.storageUpdates.next();
	}

	public async store(
		path: StoragePath,
		content: string,
		userId: string,
		isGM: boolean,
		tags: string[] = [],
	): Promise<StorageItem> {
		if (!this.validateAccess(path, isGM)) {
			throw new StorageError('Unauthorized access', 'UNAUTHORIZED');
		}

		const id = `${path.category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const item: StorageItem = {
			id,
			path,
			content,
			metadata: {
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: userId,
				tags,
			},
		};

		// Store in file system
		await this.fileAdapter.writeItem(item);

		// Update cache
		const key = this.generateStorageKey(path);
		this.cache.set(key, item);
		this.storageUpdates.next();

		logger.info(`Stored item ${id} at ${key}`);
		return item;
	}

	public getStorageUpdates(): ObservableLike<void> {
		return this.storageUpdates.asObservable();
	}

	public async query(context: QueryContext): Promise<StorageItem[]> {
		// First, try to get items from cache
		const items = await this.getAllItems();

		return items.filter((item) => {
			// Filter by campaign and adventure
			if (item.path.campaignId !== context.campaignId) return false;
			if (item.path.adventureId !== context.adventureId) return false;

			// Enforce GM-only access
			if (item.path.scope === 'gm-only' && !context.isGM) return false;

			// Search content and tags
			const searchText = context.query.toLowerCase();
			const contentMatch = item.content.toLowerCase().includes(searchText);
			const tagMatch = item.metadata.tags.some((tag) => tag.toLowerCase().includes(searchText));

			return contentMatch || tagMatch;
		});
	}

	private async getAllItems(): Promise<StorageItem[]> {
		// If cache is empty, load from file system
		if (this.cache.size === 0) {
			const items = await this.fileAdapter.listItems({
				campaignId: '*',
				adventureId: '*',
				scope: 'public',
				category: 'context',
			});

			items.forEach((item) => {
				const key = this.generateStorageKey(item.path);
				this.cache.set(key, item);
			});
		}

		return Array.from(this.cache.values());
	}

	public async getItem(path: StoragePath, isGM: boolean): Promise<StorageItem | undefined> {
		if (!this.validateAccess(path, isGM)) {
			throw new StorageError('Unauthorized access', 'UNAUTHORIZED');
		}

		const key = this.generateStorageKey(path);
		let item = this.cache.get(key);

		if (!item) {
			// Try to load from file system
			item = await this.fileAdapter.readItem(path, key);
			if (item) {
				this.cache.set(key, item);
			}
		}

		return item;
	}

	public async deleteItem(path: StoragePath, isGM: boolean): Promise<void> {
		if (!this.validateAccess(path, isGM)) {
			throw new StorageError('Unauthorized access', 'UNAUTHORIZED');
		}

		const key = this.generateStorageKey(path);
		const item = this.cache.get(key);

		if (!item) {
			throw new StorageError('Item not found', 'NOT_FOUND');
		}

		// Delete from file system
		const deleted = await this.fileAdapter.deleteItem(path, item.id);
		if (!deleted) {
			throw new StorageError('Item not found', 'NOT_FOUND');
		}

		// Update cache
		this.cache.delete(key);
		this.storageUpdates.next();
		logger.info(`Deleted item at ${key}`);
	}

	public async updateItem(path: StoragePath, content: string, isGM: boolean, tags?: string[]): Promise<StorageItem> {
		if (!this.validateAccess(path, isGM)) {
			throw new StorageError('Unauthorized access', 'UNAUTHORIZED');
		}

		const key = this.generateStorageKey(path);
		const existing = this.cache.get(key);

		if (!existing) {
			throw new StorageError('Item not found', 'NOT_FOUND');
		}

		const updated: StorageItem = {
			...existing,
			content,
			metadata: {
				...existing.metadata,
				updatedAt: new Date(),
				tags: tags || existing.metadata.tags,
			},
		};

		// Update in file system
		await this.fileAdapter.writeItem(updated);

		// Update cache
		this.cache.set(key, updated);
		this.storageUpdates.next();

		logger.info(`Updated item ${existing.id} at ${key}`);
		return updated;
	}
}
