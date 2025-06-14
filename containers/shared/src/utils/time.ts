/**
 * Time utility functions for date comparisons
 * Leverages date-fns for improved reliability and features
 */
import {
	addMilliseconds,
	differenceInMilliseconds,
	isAfter,
	isBefore,
	isWithinInterval
} from 'date-fns';

/**
 * Time units in milliseconds
 */
export enum TimeUnit {
	MILLISECOND = 1,
	SECOND = 1000,
	MINUTE = 60 * 1000,
	HOUR = 60 * 60 * 1000,
	DAY = 24 * 60 * 60 * 1000,
	WEEK = 7 * 24 * 60 * 60 * 1000
}

/**
 * Checks if a date is older than a specified timeframe
 * @param date The date to check
 * @param timeframe The amount of time units
 * @param unit The time unit (default: milliseconds)
 * @param comparisonDate The date to compare against (default: current time)
 * @returns True if the date is older than the specified timeframe
 */
export function isOlderThan(
	date: Date,
	timeframe: number,
	unit: TimeUnit = TimeUnit.MILLISECOND,
	comparisonDate: Date = new Date()
): boolean {
	const timeframeMs = timeframe * unit;
	const threshold = addMilliseconds(date, timeframeMs);
	return isBefore(threshold, comparisonDate);
}

/**
 * Checks if a date is newer than a specified timeframe
 * @param date The date to check
 * @param timeframe The amount of time units
 * @param unit The time unit (default: milliseconds)
 * @param comparisonDate The date to compare against (default: current time)
 * @returns True if the date is newer than the specified timeframe
 */
export function isNewerThan(
	date: Date,
	timeframe: number,
	unit: TimeUnit = TimeUnit.MILLISECOND,
	comparisonDate: Date = new Date()
): boolean {
	const timeframeMs = timeframe * unit;
	const threshold = addMilliseconds(comparisonDate, timeframeMs);
	return isAfter(date, threshold);
}

/**
 * Checks if a date is within a specified timeframe
 * @param date The date to check
 * @param timeframe The amount of time units
 * @param unit The time unit (default: milliseconds)
 * @param comparisonDate The date to compare against (default: current time)
 * @returns True if the date is within the specified timeframe
 */
export function isWithinTimeframe(
	date: Date,
	timeframe: number,
	unit: TimeUnit = TimeUnit.MILLISECOND,
	comparisonDate: Date = new Date()
): boolean {
	const timeframeMs = timeframe * unit;
	const start = addMilliseconds(comparisonDate, -timeframeMs);
	const end = addMilliseconds(comparisonDate, timeframeMs);
	return isWithinInterval(date, { start, end });
}

/**
 * Gets the time difference between two dates in the specified unit
 * @param date1 The first date
 * @param date2 The second date (default: current time)
 * @param unit The time unit to return the difference in (default: milliseconds)
 * @returns The time difference in the specified unit
 */
export function getTimeDifference(
	date1: Date,
	date2: Date = new Date(),
	unit: TimeUnit = TimeUnit.MILLISECOND
): number {
	const diffMs = Math.abs(differenceInMilliseconds(date2, date1));
	return diffMs / unit;
}

/**
 * Formats a timestamp into a human-readable relative time string
 * (e.g., "2 minutes ago", "in 3 hours")
 * @param date The date to format
 * @param comparisonDate The date to compare against (default: current time)
 * @returns A human-readable relative time string
 */
export function formatRelativeTime(
	date: Date,
	comparisonDate: Date = new Date()
): string {
	const diffMs = differenceInMilliseconds(comparisonDate, date);
	const isPast = diffMs > 0;
	const absDiffMs = Math.abs(diffMs);

	// Calculate appropriate time unit
	if (absDiffMs < TimeUnit.MINUTE) {
		const seconds = Math.round(absDiffMs / TimeUnit.SECOND);
		return isPast ? `${seconds} second${seconds !== 1 ? 's' : ''} ago` : `in ${seconds} second${seconds !== 1 ? 's' : ''}`;
	} else if (absDiffMs < TimeUnit.HOUR) {
		const minutes = Math.round(absDiffMs / TimeUnit.MINUTE);
		return isPast ? `${minutes} minute${minutes !== 1 ? 's' : ''} ago` : `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
	} else if (absDiffMs < TimeUnit.DAY) {
		const hours = Math.round(absDiffMs / TimeUnit.HOUR);
		return isPast ? `${hours} hour${hours !== 1 ? 's' : ''} ago` : `in ${hours} hour${hours !== 1 ? 's' : ''}`;
	} else if (absDiffMs < TimeUnit.WEEK) {
		const days = Math.round(absDiffMs / TimeUnit.DAY);
		return isPast ? `${days} day${days !== 1 ? 's' : ''} ago` : `in ${days} day${days !== 1 ? 's' : ''}`;
	} else {
		const weeks = Math.round(absDiffMs / TimeUnit.WEEK);
		return isPast ? `${weeks} week${weeks !== 1 ? 's' : ''} ago` : `in ${weeks} week${weeks !== 1 ? 's' : ''}`;
	}
}

/**
 * Performance timer utility for measuring execution times
 * Helps identify bottlenecks and monitor performance
 */
export class PerformanceTimer {
	private static _instance: PerformanceTimer;
	private _marks: Map<string, number> = new Map();
	private _measures: Map<string, { duration: number; count: number }> = new Map();

	/**
	 * Get the singleton instance
	 */
	public static getInstance(): PerformanceTimer {
		if (!PerformanceTimer._instance) {
			PerformanceTimer._instance = new PerformanceTimer();
		}
		return PerformanceTimer._instance;
	}

	/**
	 * Start timing an operation
	 * @param label Unique identifier for this timing operation
	 */
	public mark(label: string): void {
		this._marks.set(label, Date.now());
	}

	/**
	 * End timing and record the duration
	 * @param label The label used when starting the timer
	 * @returns Duration in milliseconds
	 */
	public measure(label: string): number {
		const startTime = this._marks.get(label);
		if (!startTime) {
			throw new Error(`No mark found for label: ${label}`);
		}

		const duration = Date.now() - startTime;
		this._marks.delete(label);

		// Record this measurement
		const existing = this._measures.get(label) || { duration: 0, count: 0 };
		this._measures.set(label, {
			duration: existing.duration + duration,
			count: existing.count + 1
		});

		return duration;
	}

	/**
	 * Get statistics for all recorded measurements
	 * @returns Object with statistics for each label
	 */
	public getStats(): Record<string, { avg: number; count: number; total: number }> {
		const stats: Record<string, { avg: number; count: number; total: number }> = {};

		for (const [label, data] of this._measures.entries()) {
			stats[label] = {
				avg: data.duration / data.count,
				count: data.count,
				total: data.duration
			};
		}

		return stats;
	}

	/**
	 * Reset all measurements
	 */
	public reset(): void {
		this._marks.clear();
		this._measures.clear();
	}

	/**
	 * Get a formatted string with performance statistics
	 */
	public getStatsString(): string {
		const stats = this.getStats();
		const lines: string[] = ['Performance Statistics:'];

		Object.entries(stats)
			.sort((a, b) => b[1].total - a[1].total) // Sort by total time (descending)
			.forEach(([label, data]) => {
				lines.push(`${label}: ${data.count} calls, avg: ${data.avg.toFixed(2)}ms, total: ${data.total}ms`);
			});

		return lines.join('\n');
	}

	/**
	 * Run a function and measure its execution time
	 * @param label Label for the measurement
	 * @param fn Function to execute and measure
	 * @returns The result of the function
	 */
	public static async time<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
		const timer = PerformanceTimer.getInstance();
		timer.mark(label);

		try {
			const result = await fn();
			timer.measure(label);
			return result;
		} catch (error) {
			timer.measure(label); // Still measure even if there's an error
			throw error;
		}
	}

	/**
	 * Create a decorator function for measuring method execution times
	 * @param label Label prefix for the measurement (method name will be appended)
	 * @returns A function that can be used to wrap another function for timing
	 */
	public static createTimingWrapper(labelPrefix: string = ''): <T extends (...args: unknown[]) => unknown>(fn: T, methodName: string) => T {
		return <T extends (...args: unknown[]) => unknown>(fn: T, methodName: string): T => {
			const label = labelPrefix ? `${labelPrefix}.${methodName}` : methodName;

			return (async function (this: unknown, ...args: unknown[]): Promise<unknown> {
				return PerformanceTimer.time(label, () => fn.apply(this, args));
			}) as unknown as T;
		};
	}
}
