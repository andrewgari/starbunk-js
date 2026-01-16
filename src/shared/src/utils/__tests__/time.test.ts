import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeUnit, formatRelativeTime, getTimeDifference, isNewerThan, isOlderThan, isWithinTimeframe } from '../time';

describe('Time Utils', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2023-01-01T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('isOlderThan', () => {
		test('returns true when date is older than timeframe', () => {
			const date = new Date('2023-01-01T11:59:00Z'); // 1 minute ago
			expect(isOlderThan(date, 30, TimeUnit.SECOND)).toBe(true);
		});

		test('returns false when date is not older than timeframe', () => {
			const date = new Date('2023-01-01T11:59:30Z'); // 30 seconds ago
			expect(isOlderThan(date, 1, TimeUnit.MINUTE)).toBe(false);
		});

		test('works with custom comparison date', () => {
			const date = new Date('2023-01-01T10:00:00Z');
			const comparisonDate = new Date('2023-01-01T11:00:00Z');
			expect(isOlderThan(date, 30, TimeUnit.MINUTE, comparisonDate)).toBe(true);
		});
	});

	describe('isNewerThan', () => {
		test('returns true when date is newer than timeframe', () => {
			const date = new Date('2023-01-01T13:00:00Z'); // 1 hour in future
			expect(isNewerThan(date, 30, TimeUnit.MINUTE)).toBe(true);
		});

		test('returns false when date is not newer than timeframe', () => {
			const date = new Date('2023-01-01T12:15:00Z'); // 15 minutes in future
			expect(isNewerThan(date, 30, TimeUnit.MINUTE)).toBe(false);
		});

		test('works with custom comparison date', () => {
			const date = new Date('2023-01-01T12:00:00Z');
			const comparisonDate = new Date('2023-01-01T10:00:00Z');
			expect(isNewerThan(date, 1, TimeUnit.HOUR, comparisonDate)).toBe(true);
		});
	});

	describe('isWithinTimeframe', () => {
		test('returns true when date is within timeframe', () => {
			const date = new Date('2023-01-01T11:55:00Z'); // 5 minutes ago
			expect(isWithinTimeframe(date, 10, TimeUnit.MINUTE)).toBe(true);
		});

		test('returns false when date is outside timeframe', () => {
			const date = new Date('2023-01-01T11:45:00Z'); // 15 minutes ago
			expect(isWithinTimeframe(date, 10, TimeUnit.MINUTE)).toBe(false);
		});

		test('works with future dates', () => {
			const date = new Date('2023-01-01T12:05:00Z'); // 5 minutes in future
			expect(isWithinTimeframe(date, 10, TimeUnit.MINUTE)).toBe(true);
		});

		test('works with custom comparison date', () => {
			const date = new Date('2023-01-01T11:55:00Z');
			const comparisonDate = new Date('2023-01-01T12:00:00Z');
			expect(isWithinTimeframe(date, 10, TimeUnit.MINUTE, comparisonDate)).toBe(true);
		});
	});

	describe('getTimeDifference', () => {
		test('returns correct difference in milliseconds', () => {
			const date = new Date('2023-01-01T11:59:59.500Z'); // 500ms ago
			expect(getTimeDifference(date)).toBe(500);
		});

		test('returns correct difference in minutes', () => {
			const date = new Date('2023-01-01T11:30:00Z'); // 30 minutes ago
			expect(getTimeDifference(date, undefined, TimeUnit.MINUTE)).toBe(30);
		});

		test('returns correct difference in hours', () => {
			const date = new Date('2023-01-01T10:00:00Z'); // 2 hours ago
			expect(getTimeDifference(date, undefined, TimeUnit.HOUR)).toBe(2);
		});

		test('returns correct difference with custom comparison date', () => {
			const date1 = new Date('2023-01-01T10:00:00Z');
			const date2 = new Date('2023-01-01T12:00:00Z');
			expect(getTimeDifference(date1, date2, TimeUnit.HOUR)).toBe(2);
		});
	});

	describe('formatRelativeTime', () => {
		test('formats past time in seconds', () => {
			const date = new Date('2023-01-01T11:59:40Z'); // 20 seconds ago
			expect(formatRelativeTime(date)).toBe('20 seconds ago');
		});

		test('formats past time in minutes', () => {
			const date = new Date('2023-01-01T11:58:00Z'); // 2 minutes ago
			expect(formatRelativeTime(date)).toBe('2 minutes ago');
		});

		test('formats past time in hours', () => {
			const date = new Date('2023-01-01T10:00:00Z'); // 2 hours ago
			expect(formatRelativeTime(date)).toBe('2 hours ago');
		});

		test('formats future time in seconds', () => {
			const date = new Date('2023-01-01T12:00:20Z'); // 20 seconds in future
			expect(formatRelativeTime(date)).toBe('in 20 seconds');
		});

		test('formats future time in minutes', () => {
			const date = new Date('2023-01-01T12:02:00Z'); // 2 minutes in future
			expect(formatRelativeTime(date)).toBe('in 2 minutes');
		});

		test('formats future time in hours', () => {
			const date = new Date('2023-01-01T14:00:00Z'); // 2 hours in future
			expect(formatRelativeTime(date)).toBe('in 2 hours');
		});

		test('handles singular units correctly', () => {
			const oneSecondAgo = new Date('2023-01-01T11:59:59Z');
			expect(formatRelativeTime(oneSecondAgo)).toBe('1 second ago');

			const oneMinuteAgo = new Date('2023-01-01T11:59:00Z');
			expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');

			const oneHourAgo = new Date('2023-01-01T11:00:00Z');
			expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
		});

		test('works with custom comparison date', () => {
			const date = new Date('2023-01-01T10:00:00Z');
			const comparisonDate = new Date('2023-01-01T12:00:00Z');
			expect(formatRelativeTime(date, comparisonDate)).toBe('2 hours ago');
		});
	});
});
