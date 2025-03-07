import { EventEmitter } from 'events';
import loggerAdapter from '../services/loggerAdapter';

/**
 * Debug utilities to help with development and troubleshooting
 */
export class DebugUtils {
	/**
   * Check if debug mode is enabled
   */
	static isDebugMode(): boolean {
		return process.env.DEBUG_MODE === 'true';
	}

	/**
   * Log detailed object information in debug mode
   */
	static logObject(label: string, obj: unknown): void {
		if (this.isDebugMode()) {
			loggerAdapter.debug(`🔍 ${label}:`);
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
			const result = await fn();
			const end = performance.now();
			loggerAdapter.debug(`⏱️ ${label} took ${(end - start).toFixed(2)}ms`);
			return result;
		} catch (error) {
			const end = performance.now();
			loggerAdapter.error(`⏱️ ${label} failed after ${(end - start).toFixed(2)}ms`, error as Error);
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
			loggerAdapter.debug(`🔔 ${name} Event: ${event}`);
			return originalEmit.apply(emitter, [event, ...args]);
		};
	}
}
