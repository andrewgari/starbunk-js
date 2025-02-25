export interface StorageService<T> {
	save(data: T): Promise<void>;
	load(): Promise<T | null>;
}
