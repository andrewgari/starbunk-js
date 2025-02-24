import { JsonFileStorage } from '@/storage/JsonFileStorage';
import { SerializedRatmasEvent } from '../types';

export interface IRatmasStorage {
	save: (data: SerializedRatmasEvent) => Promise<void>;
	load: () => Promise<SerializedRatmasEvent | null>;
}

export class RatmasStorage extends JsonFileStorage<SerializedRatmasEvent> implements IRatmasStorage {
	constructor() {
		super('ratmas.json');
	}
}
