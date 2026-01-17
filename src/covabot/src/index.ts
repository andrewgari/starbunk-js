// CovaBot - AI personality bot container
import 'dotenv/config';
import { Events,Client, } from 'discord.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';

import { logger } from '@starbunk/shared';
import { ensureError, } from './utils';
import { WebServer } from './web/server';

class CovaBotContainer {
	private client!: Client;
	private hasInitialized = false;


	async initialize(): Promise<void> {

	}



	async start(): Promise<void> {
		const token = process.env.DISCORD_TOKEN;
		if (!token) {
			const error = new Error('DISCORD_TOKEN environment variable is required');
			throw error;
		}

		// Validate token format (basic check)
		if (!token.match(/^[\w-]+\.[\w-]+\.[\w-]+$/)) {
			const error = new Error('DISCORD_TOKEN appears to be invalid (incorrect format)');
			logger.error('❌ Invalid Discord token format');
			throw error;
		}

		// Attempt login with retry logic
		const maxRetries = 3;
		let lastError: Error | undefined = undefined;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				logger.info(`Attempting Discord login (attempt ${attempt}/${maxRetries})...`);
				await this.client.login(token);
				await this.waitForReady();
				logger.info('🎉 CovaBot started successfully');
				return;
			} catch (error) {
				lastError = ensureError(error);

				logger.error(`❌ Discord login attempt ${attempt}/${maxRetries} failed:`, lastError);

				// Check for specific error types
				if (
					lastError &&
					(lastError.message.includes('TOKEN_INVALID') || lastError.message.includes('Incorrect login'))
				) {
					logger.error('❌ Discord token is invalid - cannot retry');
					throw new Error(`Invalid Discord token: ${lastError.message}`);
				}

				if (attempt < maxRetries) {
					const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
					logger.info(`Retrying in ${delay}ms...`);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		throw new Error(`Failed to connect to Discord after ${maxRetries} attempts: ${lastError?.message}`);
	}

	private waitForReady(): Promise<void> {
		return new Promise((resolve) => {
			if (this.hasInitialized) {
				resolve();
			} else {
				this.client.once(Events.ClientReady, () => resolve());
			}
		});
	}

	async stop(): Promise<void> {
		logger.info('Stopping CovaBot...');
		if (this.client) {
			await this.client.destroy();
		}
		logger.info('CovaBot stopped');
	}
}

// Main execution
async function main(): Promise<void> {
	if (process.env.CI_SMOKE_MODE === 'true') {
		logger.info('CI_SMOKE_MODE enabled: starting minimal health server and skipping Discord login');
		const port = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT) : 3003;
		const server = createServer((req: IncomingMessage, res: ServerResponse) => {
			if (req.url === '/health') {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ status: 'healthy', mode: 'smoke', timestamp: new Date().toISOString() }));
				return;
			}
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not Found');
		});
		server.listen(port, () => logger.info(`🏥 [SMOKE] CovaBot health server running on port ${port}`));
		const shutdown = (_signal: string) => {
			server.close(() => process.exit(0));
		};
		process.on('SIGINT', () => shutdown('SIGINT'));
		process.on('SIGTERM', () => shutdown('SIGTERM'));
		return;
	}

	let covaBot: CovaBotContainer | undefined;
	let webServer: WebServer | undefined;

	try {
		// Check if web interface should be enabled (if COVABOT_WEB_PORT is set)
		const webPort = process.env.COVABOT_WEB_PORT;
		const enableWebInterface = webPort !== undefined && webPort !== '';

		if (enableWebInterface) {
			// Web interface mode - start with web server
			logger.info(`🤖 Starting CovaBot with Web Interface...`);

			// Start web server
			try {
				const port = parseInt(webPort || '7080', 10);
				webServer = new WebServer(port);
				await webServer.start();
				logger.info(`✅ Web interface started on http://localhost:${port}`);
			} catch (error) {
				logger.error('❌ Failed to start web server:', ensureError(error));
				logger.warn('⚠️ Continuing without web interface');
			}

			// Start the main CovaBot
			covaBot = new CovaBotContainer();
			await covaBot.initialize();
			await covaBot.start();

			logger.info('🚀 CovaBot with Web Interface started successfully!');
			if (webServer) {
				logger.info(`📝 Manage personality at: http://localhost:${webPort}`);
			}
		} else {
			// Standard mode - just start CovaBot
			covaBot = new CovaBotContainer();
			await covaBot.initialize();
			await covaBot.start();
		}
	} catch (error) {
		const err = ensureError(error);
		logger.error('❌ Failed to start CovaBot:', err);

		// Cleanup any partially initialized services
		if (covaBot) {
			try {
				await covaBot.stop();
			} catch (cleanupError) {
				logger.error('Error during cleanup:', ensureError(cleanupError));
			}
		}

		// Give observability time to flush logs/metrics before exiting
		await new Promise((resolve) => setTimeout(resolve, 2000));

		process.exit(1);
	}
}

// Graceful shutdown
const shutdown = async () => {
	logger.info('🛑 Shutting down CovaBot...');
	process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (require.main === module) {
	main().catch((error) => {
		console.error('Fatal error:', ensureError(error));
		process.exit(1);
	});
}
