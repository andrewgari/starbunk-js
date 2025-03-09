export class MockLogger {
	private logs: Array<{ level: string; message: string; error?: Error }> = [];

	info(message: string): void {
		this.logs.push({ level: 'info', message });
	}

	success(message: string): void {
		this.logs.push({ level: 'success', message });
	}

	warn(message: string): void {
		this.logs.push({ level: 'warn', message });
	}

	error(message: string, error?: Error): void {
		this.logs.push({ level: 'error', message, error });
	}

	debug(message: string): void {
		this.logs.push({ level: 'debug', message });
	}

	trace(message: string): void {
		this.logs.push({ level: 'trace', message });
	}

	getLogs(): Array<{ level: string; message: string; error?: Error }> {
		return this.logs;
	}

	clearLogs(): void {
		this.logs = [];
	}

	getLogsByLevel(level: string): string[] {
		return this.logs
			.filter(log => log.level === level)
			.map(log => log.message);
	}
}

export const mockLogger = new MockLogger();
