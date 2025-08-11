/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { logger } from '@starbunk/shared';
import { QdrantMemoryService } from '../services/qdrantMemoryService';
import { BotConfigurationService } from '../services/botConfigurationService';
import { rateLimit, requestLogger } from './middleware/auth';
import { CovaBot } from '../cova-bot/covaBot';
import { covaTrigger, covaDirectMentionTrigger, covaStatsCommandTrigger } from '../cova-bot/triggers';
import { createHealthRouter } from './routers/health';
import { createNotesRouter } from './routers/notes';
import { createContextRouter } from './routers/context';
import { createConfigurationRouter } from './routers/configuration';
import { createDataRouter } from './routers/data';
import { createChatRouter } from './routers/chat';
import { createPersonalityNotesRouter } from './routers/personalityNotes';

export class WebServer {
	protected app: express.Application;
	private port: number;
	private memoryService: QdrantMemoryService;
	private configService: BotConfigurationService;
	private useQdrant: boolean;
	private covaBot: CovaBot;

	constructor(port: number = 7080, useQdrant: boolean = true) {
		this.app = express();
		this.port = port;
		this.useQdrant = useQdrant;

		// Use unified Qdrant memory service
		this.memoryService = QdrantMemoryService.getInstance();

		// Initialize configuration service
		this.configService = BotConfigurationService.getInstance();

		// Initialize CovaBot for web testing
		this.covaBot = new CovaBot({
			name: 'CovaBot',
			description: 'LLM-powered CovaBot for web testing',
			defaultIdentity: {
				botName: 'Cova',
				avatarUrl: '/static/cova-avatar.png', // Static avatar for web testing
			},
			triggers: [covaStatsCommandTrigger, covaDirectMentionTrigger, covaTrigger],
		});

		this.setupMiddleware();
		this.setupRoutes();
	}

	protected setupMiddleware(): void {
		// CORS configuration
		const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:7080', 'http://127.0.0.1:7080'];
		this.app.use(
			cors({
				origin: corsOrigins,
				credentials: true,
			}),
		);

		// Body parsing
		this.app.use(express.json());
		this.app.use(express.urlencoded({ extended: true }));

		// Rate limiting
		this.app.use('/api', rateLimit(100, 60000) as express.RequestHandler); // 100 requests per minute

		// Request logging
		this.app.use(requestLogger);

		// Static files (for the frontend)
		const staticPath = path.join(__dirname, '..', 'web', 'static');
		this.app.use(express.static(staticPath));
	}

	protected setupRoutes(): void {
		// Serve the main webpage
		this.app.get('/', (_req, res) => {
			res.sendFile(path.join(__dirname, '..', 'web', 'static', 'index.html'));
		});

		// API Router mount points, preserving existing paths
		const apiRouter = express.Router();

		// Mount personality notes FIRST to preserve route precedence
		apiRouter.use('/memory/personality-notes', createPersonalityNotesRouter(this.memoryService));

		// Mount health
		apiRouter.use(createHealthRouter(this.memoryService));

		// Notes
		apiRouter.use(createNotesRouter(this.memoryService));

		// Context + search
		apiRouter.use(createContextRouter(this.memoryService));

		// Configuration
		apiRouter.use(createConfigurationRouter(this.configService));

		// Export/Import/Stats summary
		apiRouter.use(createDataRouter(this.memoryService, this.configService));

		// Chat
		apiRouter.use(createChatRouter(this.covaBot));

		// Mount API routes
		this.app.use('/api', apiRouter);

		// 404 handler
		this.app.use((_req, res) => {
			res.status(404).json({ success: false, error: 'Not found' });
		});

		// Error handler
		this.app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
			logger.error('[WebServer] Unhandled error:', error as Error);
			res.status(500).json({ success: false, error: 'Internal server error' });
		});
	}

	/**
	 * Get the Express app instance for testing
	 */
	getApp(): express.Application {
		return this.app;
	}

	async start(): Promise<void> {
		try {
			// Initialize the memory service
			await this.memoryService.initialize();
			logger.info('[WebServer] Qdrant memory service initialized');

			// Initialize the configuration service
			await this.configService.loadConfiguration();
			logger.info('[WebServer] Configuration service initialized');

			// Start the server
			return new Promise((resolve) => {
				this.app.listen(this.port, () => {
					logger.info(
						`[WebServer] CovaBot memory management interface (Qdrant) running on http://localhost:${this.port}`,
					);
					resolve();
				});
			});
		} catch (error) {
			logger.error('[WebServer] Failed to start server:', error as Error);
			throw error;
		}
	}
}
