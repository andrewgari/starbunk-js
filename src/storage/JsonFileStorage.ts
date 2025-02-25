import { promises as fs } from 'fs';
import path from 'path';
import { StorageService } from './interfaces';

export class JsonFileStorage<T> implements StorageService<T> {
	private readonly storageFile: string;

	constructor(filename: string, dataDirectory = 'data') {
		this.storageFile = path.join(process.cwd(), dataDirectory, filename);
	}

	async save(data: T): Promise<void> {
		await fs.mkdir(path.dirname(this.storageFile), { recursive: true });
		await fs.writeFile(this.storageFile, JSON.stringify(data, null, 2));
	}

	async load(): Promise<T | null> {
		try {
			const data = await fs.readFile(this.storageFile, 'utf-8');
			return JSON.parse(data);
		} catch (error) {
			return null;
		}
	}
}
