import { EventEmitter } from 'events';
import { isDebugMode } from '../environment';
import { logger } from '../services/logger';

/**
 * Debug utilities to help with development and troubleshooting
 */
export class DebugUtils {
	/**
	 * Check if debug mode is enabled
	 */
	static isDebugMode(): boolean {
		return isDebugMode();
	}

	/**
	 * Log detailed object information in debug mode
	 */
	static logObject(label: string, obj: unknown): void {
		if (this.isDebugMode()) {
			logger.debug(`🔍 ${label}:`);
			// eslint-disable-next-line no-console
			console.dir(obj, { depth: null, colors: true });
		}
	}

	/**
	 * Log execution time of a function
	 */
	static async timeExecution<T>(label: string, fn: () => Promise<T>): Promise<T> {
		if (!this.isDebugMode()) {
			return fn();
		}

		const start = performance.now();
		try {
			const _result = await fn();
			const end = performance.now();
			logger.debug(`⏱️ ${label} took ${(end - start).toFixed(2)}ms`);
			return _result;
		} catch (error) {
			const end = performance.now();
			logger.error(`⏱️ ${label} failed after ${(end - start).toFixed(2)}ms`, error as Error);
			throw error;
		}
	}

	/**
	 * Force success for certain operations in debug mode
	 */
	static forceSuccess<T>(normalFn: () => T, debugValue: T): T {
		return this.isDebugMode() ? debugValue : normalFn();
	}

	/**
	 * Log all events for a specific Discord.js object
	 */
	static monitorEvents(emitter: EventEmitter, name: string): void {
		if (!this.isDebugMode()) return;

		const originalEmit = emitter.emit;
		emitter.emit = function (event: string, ...args: unknown[]): boolean {
			logger.debug(`🔔 ${name} Event: ${event}`);
			return originalEmit.apply(emitter, [event, ...args]);
		};
	}
}
