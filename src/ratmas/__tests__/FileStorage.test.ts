import path from 'path';
import { JsonFileStorage } from '../../storage/JsonFileStorage';
import { FileStorage } from '../FileStorage';

describe('FileStorage', () => {
	it('extends JsonFileStorage with the correct type and filename', () => {
		const storage = new FileStorage();

		// Verify it's an instance of JsonFileStorage with the correct type
		expect(storage).toBeInstanceOf(JsonFileStorage);

		// Verify it uses the correct filename
		const storageFile = (storage as unknown as { storageFile: string }).storageFile;
		expect(path.basename(storageFile)).toBe('ratmas.json');
	});

	it('implements the required save and load methods', () => {
		const storage = new FileStorage();

		// Verify the methods exist
		expect(typeof storage.save).toBe('function');
		expect(typeof storage.load).toBe('function');
	});
});
