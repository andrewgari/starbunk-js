import * as fs from 'fs/promises';
import * as path from 'path';
import { BehaviorSubject, Observable } from 'rxjs';
import { logger } from '../../services/logger';
import { StorageError, StorageItem, StoragePath } from '../types/storage';

export class FileStorageAdapter {
	private static instance: FileStorageAdapter;
	private fileUpdates: BehaviorSubject<void>;
	private baseDir: string;

	private constructor() {
		this.fileUpdates = new BehaviorSubject<void>(undefined);
		this.baseDir = path.resolve('/app/data/campaigns');
	}

	public static getInstance(): FileStorageAdapter {
		if (!FileStorageAdapter.instance) {
			FileStorageAdapter.instance = new FileStorageAdapter();
		}
		return FileStorageAdapter.instance;
	}

	public getFileUpdates(): Observable<void> {
		return this.fileUpdates.asObservable();
	}

	private getFilePath(storagePath: StoragePath, id?: string): string {
		const pathParts = [
			this.baseDir,
			storagePath.campaignId,
			storagePath.adventureId,
			storagePath.scope,
			storagePath.category,
			...(storagePath.subPath || [])
		];

		if (id) {
			pathParts.push(`${id}.json`);
		}

		return path.join(...pathParts);
	}

	public async writeItem(item: StorageItem): Promise<void> {
		try {
			const filePath = this.getFilePath(item.path, item.id);
			const dirPath = path.dirname(filePath);

			// Ensure directory exists
			await fs.mkdir(dirPath, { recursive: true });

			// Write file
			await fs.writeFile(filePath, JSON.stringify(item, null, 2));
			this.fileUpdates.next();
			logger.info(`Wrote file: ${filePath}`);
		} catch (error) {
			logger.error('Error writing file:', error as Error);
			throw new StorageError('Failed to write file', 'WRITE_ERROR');
		}
	}

	public async readItem(storagePath: StoragePath, id: string): Promise<StorageItem | undefined> {
		try {
			const filePath = this.getFilePath(storagePath, id);
			const content = await fs.readFile(filePath, 'utf-8');
			return JSON.parse(content) as StorageItem;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				return undefined;
			}
			logger.error('Error reading file:', error as Error);
			throw new StorageError('Failed to read file', 'READ_ERROR');
		}
	}

	public async deleteItem(storagePath: StoragePath, id: string): Promise<boolean> {
		try {
			const filePath = this.getFilePath(storagePath, id);
			await fs.unlink(filePath);
			this.fileUpdates.next();
			logger.info(`Deleted file: ${filePath}`);
			return true;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				return false;
			}
			logger.error('Error deleting file:', error as Error);
			throw new StorageError('Failed to delete file', 'DELETE_ERROR');
		}
	}

	public async listItems(storagePath: StoragePath): Promise<StorageItem[]> {
		try {
			const dirPath = this.getFilePath(storagePath);
			const files = await fs.readdir(dirPath, { withFileTypes: true });

			const items: StorageItem[] = [];
			for (const file of files) {
				if (file.isFile() && file.name.endsWith('.json')) {
					try {
						const filePath = path.join(dirPath, file.name);
						const content = await fs.readFile(filePath, 'utf-8');
						items.push(JSON.parse(content) as StorageItem);
					} catch (error) {
						logger.error(`Error reading file ${file.name}:`, error as Error);
						// Continue with other files
					}
				}
			}
			return items;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				return [];
			}
			logger.error('Error listing files:', error as Error);
			throw new StorageError('Failed to list files', 'LIST_ERROR');
		}
	}
}
