// Startup diagnostics and troubleshooting utilities
import { logger } from '../services/logger';

export interface DiagnosticResult {
	check: string;
	status: 'pass' | 'fail' | 'warn';
	message: string;
	details?: Record<string, unknown>;
}

export class StartupDiagnostics {
	private results: DiagnosticResult[] = [];

	async runAllChecks(): Promise<DiagnosticResult[]> {
		logger.info('🔍 Running startup diagnostics...');

		this.checkEnvironmentVariables();
		this.checkDiscordTokenFormat();
		await this.checkNetworkConnectivity();
		this.checkNodeVersion();
		this.checkMemoryUsage();

		this.logResults();
		return this.results;
	}

	private checkEnvironmentVariables(): void {
		const requiredVars = ['DISCORD_TOKEN'];
		const optionalVars = ['DATABASE_URL', 'DEBUG_MODE', 'TESTING_SERVER_IDS', 'TESTING_CHANNEL_IDS'];

		// Check required variables
		const missing = requiredVars.filter((varName) => !process.env[varName]);
		if (missing.length > 0) {
			this.addResult({
				check: 'Environment Variables',
				status: 'fail',
				message: `Missing required environment variables: ${missing.join(', ')}`,
				details: { missing, required: requiredVars },
			});
		} else {
			this.addResult({
				check: 'Environment Variables',
				status: 'pass',
				message: 'All required environment variables are set',
			});
		}

		// Check optional variables
		const missingOptional = optionalVars.filter((varName) => !process.env[varName]);
		if (missingOptional.length > 0) {
			this.addResult({
				check: 'Optional Environment Variables',
				status: 'warn',
				message: `Optional variables not set: ${missingOptional.join(', ')}`,
				details: { missing: missingOptional, optional: optionalVars },
			});
		}
	}

	private checkDiscordTokenFormat(): void {
		const token = process.env.DISCORD_TOKEN;
		if (!token) {
			this.addResult({
				check: 'Discord Token Format',
				status: 'fail',
				message: 'DISCORD_TOKEN is not set',
			});
			return;
		}

		// Basic Discord token format validation
		// Discord tokens are typically 24+ characters and contain base64-like characters
		if (token.length < 24) {
			this.addResult({
				check: 'Discord Token Format',
				status: 'fail',
				message: 'Discord token appears to be too short (should be 24+ characters)',
				details: { tokenLength: token.length },
			});
		} else if (token === 'dummy_token' || token.includes('your_token_here') || token.includes('placeholder')) {
			this.addResult({
				check: 'Discord Token Format',
				status: 'fail',
				message: 'Discord token appears to be a placeholder value',
				details: { tokenPrefix: token.substring(0, 10) + '...' },
			});
		} else {
			this.addResult({
				check: 'Discord Token Format',
				status: 'pass',
				message: 'Discord token format appears valid',
				details: { tokenLength: token.length },
			});
		}
	}

	private async checkNetworkConnectivity(): Promise<void> {
		try {
			// Try to resolve Discord's API endpoint
			const dns = await import('dns').then((m) => m.promises);
			await dns.resolve('discord.com');

			this.addResult({
				check: 'Network Connectivity',
				status: 'pass',
				message: 'Can resolve Discord API endpoints',
			});
		} catch (error) {
			this.addResult({
				check: 'Network Connectivity',
				status: 'fail',
				message: 'Cannot resolve Discord API endpoints',
				details: { error: error instanceof Error ? error.message : String(error) },
			});
		}
	}

	private checkNodeVersion(): void {
		const nodeVersion = process.version;
		const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

		if (majorVersion < 18) {
			this.addResult({
				check: 'Node.js Version',
				status: 'fail',
				message: `Node.js version ${nodeVersion} is too old. Requires Node.js 18+`,
				details: { currentVersion: nodeVersion, requiredVersion: '18+' },
			});
		} else {
			this.addResult({
				check: 'Node.js Version',
				status: 'pass',
				message: `Node.js version ${nodeVersion} is compatible`,
				details: { version: nodeVersion },
			});
		}
	}

	private checkMemoryUsage(): void {
		const memUsage = process.memoryUsage();
		const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
		const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

		this.addResult({
			check: 'Memory Usage',
			status: 'pass',
			message: `Memory usage: ${heapUsedMB}MB used / ${heapTotalMB}MB allocated`,
			details: {
				heapUsed: heapUsedMB,
				heapTotal: heapTotalMB,
				external: Math.round(memUsage.external / 1024 / 1024),
				rss: Math.round(memUsage.rss / 1024 / 1024),
			},
		});
	}

	private addResult(_result: DiagnosticResult): void {
		this.results.push(_result);
	}

	private logResults(): void {
		logger.info('📊 Diagnostic Results:');

		for (const _result of this.results) {
			const icon = _result.status === 'pass' ? '✅' : _result.status === 'warn' ? '⚠️' : '❌';
			const message = `${icon} ${_result.check}: ${_result.message}`;

			if (_result.status === 'fail') {
				if (_result.details) {
					logger.error(`${message} - Details: ${JSON.stringify(_result.details)}`);
				} else {
					logger.error(message);
				}
			} else if (_result.status === 'warn') {
				if (_result.details) {
					logger.warn(`${message} - Details: ${JSON.stringify(_result.details)}`);
				} else {
					logger.warn(message);
				}
			} else {
				if (_result.details) {
					logger.info(`${message} - Details: ${JSON.stringify(_result.details)}`);
				} else {
					logger.info(message);
				}
			}
		}

		const failCount = this.results.filter((r) => r.status === 'fail').length;
		const warnCount = this.results.filter((r) => r.status === 'warn').length;

		if (failCount > 0) {
			logger.error(`🚨 ${failCount} critical issues found that may prevent startup`);
		} else if (warnCount > 0) {
			logger.warn(`⚠️ ${warnCount} warnings found - application may still work`);
		} else {
			logger.info('🎉 All diagnostic checks passed!');
		}
	}

	getFailures(): DiagnosticResult[] {
		return this.results.filter((r) => r.status === 'fail');
	}

	hasFailures(): boolean {
		return this.getFailures().length > 0;
	}
}

export async function runStartupDiagnostics(): Promise<DiagnosticResult[]> {
	const diagnostics = new StartupDiagnostics();
	return await diagnostics.runAllChecks();
}
