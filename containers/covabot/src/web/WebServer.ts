// Web Server for CovaBot memory management interface
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer, Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '@starbunk/shared';
import { CovaBotConfig, CovaBotError } from '../types';
import { EnhancedCovaBot } from '../cova-bot/EnhancedCovaBot';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { memoryRoutes } from './routes/memory';
import { identityRoutes } from './routes/identity';
import { statsRoutes } from './routes/stats';
import { healthRoutes } from './routes/health';

/**
 * Web server for CovaBot management interface
 */
export class WebServer {
  private app: Express;
  private server: Server | null = null;
  private io: SocketIOServer | null = null;
  private isRunning = false;

  constructor(
    private config: CovaBotConfig,
    private bot: EnhancedCovaBot
  ) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: this.config.web.cors.origin,
      credentials: this.config.web.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Compression and logging
    this.app.use(compression());
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim())
      }
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    this.app.use(rateLimitMiddleware);

    // Authentication (for protected routes)
    this.app.use('/api', authMiddleware);
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check (no auth required)
    this.app.use('/health', healthRoutes(this.bot));

    // API routes (auth required)
    this.app.use('/api/memory', memoryRoutes(this.bot));
    this.app.use('/api/identity', identityRoutes(this.bot));
    this.app.use('/api/stats', statsRoutes(this.bot));

    // Serve static files for web interface
    this.app.use(express.static('public'));

    // API documentation
    this.app.get('/api', (req: Request, res: Response) => {
      res.json({
        name: 'CovaBot Management API',
        version: '1.0.0',
        description: 'API for managing CovaBot memories, identities, and statistics',
        endpoints: {
          health: '/health',
          memory: '/api/memory',
          identity: '/api/identity',
          stats: '/api/stats'
        },
        documentation: '/api/docs'
      });
    });

    // Catch-all for SPA routing
    this.app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
      } else {
        res.sendFile('index.html', { root: 'public' });
      }
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`,
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Setup WebSocket for real-time updates
   */
  private setupWebSocket(): void {
    if (!this.server) return;

    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: this.config.web.cors.origin,
        credentials: this.config.web.cors.credentials
      }
    });

    this.io.on('connection', (socket) => {
      logger.info('🔌 WebSocket client connected', { socketId: socket.id });

      // Send initial stats
      this.bot.getStats().then(stats => {
        socket.emit('stats', stats);
      }).catch(error => {
        logger.error('Failed to send initial stats:', error);
      });

      // Handle client requests
      socket.on('request_stats', async () => {
        try {
          const stats = await this.bot.getStats();
          socket.emit('stats', stats);
        } catch (_error) {
          socket.emit('error', { message: 'Failed to get stats' });
        }
      });

      socket.on('request_health', async () => {
        try {
          const health = await this.bot.healthCheck();
          socket.emit('health', health);
        } catch (_error) {
          socket.emit('error', { message: 'Failed to get health status' });
        }
      });

      socket.on('disconnect', () => {
        logger.info('🔌 WebSocket client disconnected', { socketId: socket.id });
      });
    });

    // Broadcast stats updates every 30 seconds
    setInterval(async () => {
      try {
        const stats = await this.bot.getStats();
        this.io?.emit('stats_update', stats);
      } catch (error) {
        logger.error('Failed to broadcast stats update:', error);
      }
    }, 30000);
  }

  /**
   * Start the web server
   */
  async start(): Promise<void> {
    try {
      logger.info('🌐 Starting web server...');

      this.server = createServer(this.app);
      this.setupWebSocket();

      await new Promise<void>((resolve, reject) => {
        this.server!.listen(this.config.web.port, this.config.web.host, () => {
          resolve();
        });

        this.server!.on('error', (error: Error) => {
          reject(error);
        });
      });

      this.isRunning = true;
      logger.info('✅ Web server started', {
        host: this.config.web.host,
        port: this.config.web.port,
        url: `http://${this.config.web.host}:${this.config.web.port}`
      });

    } catch (error) {
      logger.error('Failed to start web server:', error);
      throw new CovaBotError('Failed to start web server', 'WEB_SERVER_ERROR', 500, error);
    }
  }

  /**
   * Stop the web server
   */
  async stop(): Promise<void> {
    try {
      logger.info('🛑 Stopping web server...');

      if (this.io) {
        this.io.close();
        this.io = null;
      }

      if (this.server) {
        await new Promise<void>((resolve, reject) => {
          this.server!.close((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
        this.server = null;
      }

      this.isRunning = false;
      logger.info('✅ Web server stopped');

    } catch (error) {
      logger.error('Error stopping web server:', error);
      throw new CovaBotError('Failed to stop web server', 'WEB_SERVER_ERROR', 500, error);
    }
  }

  /**
   * Get server status
   */
  getStatus(): {
    isRunning: boolean;
    host: string;
    port: number;
    connectedClients: number;
  } {
    return {
      isRunning: this.isRunning,
      host: this.config.web.host,
      port: this.config.web.port,
      connectedClients: this.io?.sockets.sockets.size || 0
    };
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(event: string, data: unknown): void {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  /**
   * Health check for web server
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, unknown> }> {
    try {
      const status = this.getStatus();
      
      return {
        status: status.isRunning ? 'healthy' : 'unhealthy',
        details: {
          ...status,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
