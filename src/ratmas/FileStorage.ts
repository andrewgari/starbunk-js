import { promises as fs } from 'fs';
import path from 'path';
import { RatmasStorage } from './interfaces';
import { SerializedRatmasEvent } from './types';

export class FileStorage implements RatmasStorage {
	private readonly storageFile: string;

	constructor(filename = 'ratmas.json') {
		this.storageFile = path.join(process.cwd(), 'data', filename);
	}

	async save(data: SerializedRatmasEvent): Promise<void> {
		await fs.mkdir(path.dirname(this.storageFile), { recursive: true });
		await fs.writeFile(this.storageFile, JSON.stringify(data, null, 2));
	}

	async load(): Promise<SerializedRatmasEvent | null> {
		try {
			const data = await fs.readFile(this.storageFile, 'utf-8');
			return JSON.parse(data);
		} catch (error) {
			return null;
		}
	}
}
