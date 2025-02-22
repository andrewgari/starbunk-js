import { Logger } from '@/services/logger';
import chalk from 'chalk';

jest.mock('chalk', () => ({
	gray: (text: string) => text,
	green: (text: string) => text,
	yellow: (text: string) => text,
	red: (text: string) => text,
	blue: (text: string) => text
}));

describe('Logger', () => {
	let consoleLogSpy: jest.SpyInstance;
	let consoleWarnSpy: jest.SpyInstance;
	let consoleErrorSpy: jest.SpyInstance;
	const mockDate = new Date('2024-02-22T10:00:00.000Z');

	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(mockDate);

		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
		consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.clearAllMocks();
	});

	it('should log info messages with timestamp and emoji', () => {
		Logger.info('test message');
		expect(consoleLogSpy).toHaveBeenCalledWith(
			'📝  2024-02-22T10:00:00.000Z test message'
		);
	});

	it('should log success messages in green', () => {
		Logger.success('success message');
		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining('✅') &&
			expect.stringContaining(chalk.green('success message'))
		);
	});

	it('should log warning messages in yellow', () => {
		Logger.warn('warning message');
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			expect.stringContaining('⚠️') &&
			expect.stringContaining(chalk.yellow('warning message'))
		);
	});

	it('should log error messages in red', () => {
		Logger.error('error message');
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining('❌') &&
			expect.stringContaining(chalk.red('error message'))
		);
	});

	it('should log error stack traces when available', () => {
		const error = new Error('test error');
		Logger.error('error message', error);
		expect(consoleErrorSpy).toHaveBeenCalledWith(chalk.red(error.stack));
	});

	describe('debug logging', () => {
		const originalDebug = process.env.DEBUG;

		afterEach(() => {
			process.env.DEBUG = originalDebug;
		});

		it('should log debug messages when DEBUG is enabled', () => {
			process.env.DEBUG = 'true';
			Logger.debug('debug message');
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining('🔍') &&
				expect.stringContaining(chalk.blue('debug message'))
			);
		});

		it('should not log debug messages when DEBUG is disabled', () => {
			process.env.DEBUG = '';
			Logger.debug('debug message');
			expect(consoleLogSpy).not.toHaveBeenCalled();
		});
	});
});
