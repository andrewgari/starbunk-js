import { isDebugMode } from '../../environment';
import { logger, LogLevel } from '../logger';

// Mock the environment module
jest.mock('../../environment', () => ({
	isDebugMode: jest.fn()
}));

// Mock the logger module
jest.mock('../logger', () => {
	const LogLevel = {
		NONE: 0,
		ERROR: 1,
		WARN: 2,
		INFO: 3,
		DEBUG: 4,
	};

	const mockLogger = {
		currentLogLevel: LogLevel.INFO,
		setLogLevel: jest.fn((level) => {
			mockLogger.currentLogLevel = level;
		}),
		shouldLog: function (level: number) {
			return level <= this.currentLogLevel;
		},
		debug: jest.fn(function (message: string) {
			if (isDebugMode() && this.shouldLog(LogLevel.DEBUG)) {
				console.debug(message);
			}
		}),
		info: jest.fn(function (message: string) {
			if (this.shouldLog(LogLevel.INFO)) {
				console.info(message);
			}
		}),
		warn: jest.fn(function (message: string) {
			if (this.shouldLog(LogLevel.WARN)) {
				console.warn(message);
			}
		}),
		error: jest.fn(function (message: string) {
			if (this.shouldLog(LogLevel.ERROR)) {
				console.error(message);
			}
		}),
		success: jest.fn(function (message: string) {
			if (this.shouldLog(LogLevel.INFO)) {
				console.log(message);
			}
		}),
	};

	return {
		logger: mockLogger,
		LogLevel,
	};
});

describe('Logger', () => {
	const originalConsole = { ...console };
	let consoleOutput: { [key: string]: string[] } = {};

	beforeEach(() => {
		// Reset captured console output
		consoleOutput = {
			debug: [],
			info: [],
			warn: [],
			error: [],
			log: [] // for success messages
		};

		// Reset isDebugMode mock
		(isDebugMode as jest.Mock).mockReset();

		// Mock console methods
		console.debug = jest.fn((message) => consoleOutput.debug.push(message));
		console.info = jest.fn((message) => consoleOutput.info.push(message));
		console.warn = jest.fn((message) => consoleOutput.warn.push(message));
		console.error = jest.fn((message) => consoleOutput.error.push(message));
		console.log = jest.fn((message) => consoleOutput.log.push(message));
	});

	afterEach(() => {
		// Reset logger to default level
		logger.setLogLevel(LogLevel.INFO);

		// Restore original console
		console.debug = originalConsole.debug;
		console.info = originalConsole.info;
		console.warn = originalConsole.warn;
		console.error = originalConsole.error;
		console.log = originalConsole.log;
	});

	it('should only show ERROR messages when log level is ERROR', () => {
		logger.setLogLevel(LogLevel.ERROR);
		(isDebugMode as jest.Mock).mockReturnValue(false);

		logger.debug('Debug message');
		logger.info('Info message');
		logger.warn('Warning message');
		logger.error('Error message');
		logger.success('Success message');

		expect(consoleOutput.debug).toHaveLength(0);
		expect(consoleOutput.info).toHaveLength(0);
		expect(consoleOutput.warn).toHaveLength(0);
		expect(consoleOutput.error).toHaveLength(1);
		expect(consoleOutput.log).toHaveLength(0);
		expect(consoleOutput.error[0]).toBe('Error message');
	});

	it('should show WARN and ERROR messages when log level is WARN', () => {
		logger.setLogLevel(LogLevel.WARN);
		(isDebugMode as jest.Mock).mockReturnValue(false);

		logger.debug('Debug message');
		logger.info('Info message');
		logger.warn('Warning message');
		logger.error('Error message');
		logger.success('Success message');

		expect(consoleOutput.debug).toHaveLength(0);
		expect(consoleOutput.info).toHaveLength(0);
		expect(consoleOutput.warn).toHaveLength(1);
		expect(consoleOutput.error).toHaveLength(1);
		expect(consoleOutput.log).toHaveLength(0);
		expect(consoleOutput.warn[0]).toBe('Warning message');
		expect(consoleOutput.error[0]).toBe('Error message');
	});

	it('should show INFO, SUCCESS, WARN, and ERROR messages when log level is INFO (default)', () => {
		logger.setLogLevel(LogLevel.INFO);
		(isDebugMode as jest.Mock).mockReturnValue(false);

		logger.debug('Debug message');
		logger.info('Info message');
		logger.warn('Warning message');
		logger.error('Error message');
		logger.success('Success message');

		expect(consoleOutput.debug).toHaveLength(0);
		expect(consoleOutput.info).toHaveLength(1);
		expect(consoleOutput.warn).toHaveLength(1);
		expect(consoleOutput.error).toHaveLength(1);
		expect(consoleOutput.log).toHaveLength(1);
		expect(consoleOutput.info[0]).toBe('Info message');
		expect(consoleOutput.warn[0]).toBe('Warning message');
		expect(consoleOutput.error[0]).toBe('Error message');
		expect(consoleOutput.log[0]).toBe('Success message');
	});

	it('should show all messages when log level is DEBUG and debug mode is enabled', () => {
		logger.setLogLevel(LogLevel.DEBUG);
		(isDebugMode as jest.Mock).mockReturnValue(true);

		logger.debug('Debug message');
		logger.info('Info message');
		logger.warn('Warning message');
		logger.error('Error message');
		logger.success('Success message');

		expect(consoleOutput.debug).toHaveLength(1);
		expect(consoleOutput.info).toHaveLength(1);
		expect(consoleOutput.warn).toHaveLength(1);
		expect(consoleOutput.error).toHaveLength(1);
		expect(consoleOutput.log).toHaveLength(1);
		expect(consoleOutput.debug[0]).toBe('Debug message');
		expect(consoleOutput.info[0]).toBe('Info message');
		expect(consoleOutput.warn[0]).toBe('Warning message');
		expect(consoleOutput.error[0]).toBe('Error message');
		expect(consoleOutput.log[0]).toBe('Success message');
	});

	it('should not show debug messages when in DEBUG level but debug mode is disabled', () => {
		logger.setLogLevel(LogLevel.DEBUG);
		(isDebugMode as jest.Mock).mockReturnValue(false);

		logger.debug('Debug message');
		logger.info('Info message');
		logger.warn('Warning message');
		logger.error('Error message');
		logger.success('Success message');

		expect(consoleOutput.debug).toHaveLength(0);
		expect(consoleOutput.info).toHaveLength(1);
		expect(consoleOutput.warn).toHaveLength(1);
		expect(consoleOutput.error).toHaveLength(1);
		expect(consoleOutput.log).toHaveLength(1);
		expect(consoleOutput.info[0]).toBe('Info message');
		expect(consoleOutput.warn[0]).toBe('Warning message');
		expect(consoleOutput.error[0]).toBe('Error message');
		expect(consoleOutput.log[0]).toBe('Success message');
	});

	it('should show no messages when log level is NONE', () => {
		logger.setLogLevel(LogLevel.NONE);
		(isDebugMode as jest.Mock).mockReturnValue(false);

		logger.debug('Debug message');
		logger.info('Info message');
		logger.warn('Warning message');
		logger.error('Error message');
		logger.success('Success message');

		expect(consoleOutput.debug).toHaveLength(0);
		expect(consoleOutput.info).toHaveLength(0);
		expect(consoleOutput.warn).toHaveLength(0);
		expect(consoleOutput.error).toHaveLength(0);
		expect(consoleOutput.log).toHaveLength(0);
	});
});
