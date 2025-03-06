/**
 * Time utility functions for date comparisons
 */

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
	return comparisonDate.getTime() - date.getTime() > timeframeMs;
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
	return date.getTime() - comparisonDate.getTime() > timeframeMs;
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
	const diff = Math.abs(comparisonDate.getTime() - date.getTime());
	return diff <= timeframeMs;
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
	const diffMs = Math.abs(date2.getTime() - date1.getTime());
	return diffMs / unit;
}
