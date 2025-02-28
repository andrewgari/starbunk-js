import fs from 'fs';
import path from 'path';
import { Logger } from './logger';

/**
 * Service for managing persistent bot state
 * Uses the file system to store state between restarts
 */
export class BotStateService {
	private static instance: BotStateService;
	private stateData: Record<string, unknown> = {};
	private readonly storageDir: string;
	private readonly stateFile: string;
	private readonly isPersistenceEnabled: boolean;

	/**
   * Create a new BotStateService
   */
	private constructor() {
		// Set the storage location
		this.storageDir = path.join(process.cwd(), '.botstate');
		this.stateFile = path.join(this.storageDir, 'state.json');
		this.isPersistenceEnabled = true;

		// Load state on initialization
		this.loadState();
	}

	/**
   * Get the singleton instance
   */
	public static getInstance(): BotStateService {
		if (!BotStateService.instance) {
			BotStateService.instance = new BotStateService();
		}
		return BotStateService.instance;
	}

	/**
   * Save a value in the state store with a key
   * @param key The key to store the value under
   * @param value The value to store
   */
	public setState(key: string, value: unknown): void {
		this.stateData[key] = value;
		this.saveState();
	}

	/**
   * Get a value from the state store
   * @param key The key to retrieve
   * @param defaultValue The default value to return if the key doesn't exist
   * @returns The stored value or the default value
   */
	public getState<T>(key: string, defaultValue: T): T {
		return (this.stateData[key] as T) ?? defaultValue;
	}

	/**
   * Save the state to disk
   */
	private saveState(): void {
		if (!this.isPersistenceEnabled) return;

		try {
			// Ensure the directory exists
			if (!fs.existsSync(this.storageDir)) {
				fs.mkdirSync(this.storageDir, { recursive: true });
			}

			// Write the state to file
			fs.writeFileSync(
				this.stateFile,
				JSON.stringify(this.stateData, null, 2)
			);
		} catch (error) {
			Logger.error('Failed to save bot state:', error as Error);
		}
	}

	/**
   * Load the state from disk
   */
	private loadState(): void {
		if (!this.isPersistenceEnabled) return;

		try {
			if (fs.existsSync(this.stateFile)) {
				const data = fs.readFileSync(this.stateFile, 'utf-8');
				this.stateData = JSON.parse(data);
				Logger.debug(`Loaded bot state with ${Object.keys(this.stateData).length} keys`);
			} else {
				Logger.debug('No bot state file found, starting with empty state');
				this.stateData = {};
			}
		} catch (error) {
			Logger.error('Failed to load bot state:', error as Error);
			this.stateData = {};
		}
	}
}

// Export a singleton instance
export const botStateService = BotStateService.getInstance();
