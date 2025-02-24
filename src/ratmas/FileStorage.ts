import { JsonFileStorage } from '../storage/JsonFileStorage';
import { SerializedRatmasEvent } from './types';

export class FileStorage extends JsonFileStorage<SerializedRatmasEvent> {
    constructor() {
        super('ratmas.json');
    }
}
