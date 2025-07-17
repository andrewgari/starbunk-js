// Health check routes for CovaBot web interface
import { Router, Request, Response } from 'express';
import { logger } from '@starbunk/shared';
import { EnhancedCovaBot } from '../../cova-bot/EnhancedCovaBot';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Create health check routes
 */
export function healthRoutes(bot: EnhancedCovaBot): Router {
  const router = Router();

  /**
   * Basic health check
   */
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const health = await bot.healthCheck();
    
    res.status(health.status === 'healthy' ? 200 : 503).json({
      status: health.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  }));

  /**
   * Detailed health check
   */
  router.get('/detailed', asyncHandler(async (req: Request, res: Response) => {
    const health = await bot.healthCheck();
    
    res.status(health.status === 'healthy' ? 200 : 503).json({
      status: health.status,
      details: health.details,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.version,
        platform: process.platform,
        arch: process.arch
      },
      timestamp: new Date().toISOString()
    });
  }));

  /**
   * Readiness check (for Kubernetes)
   */
  router.get('/ready', asyncHandler(async (req: Request, res: Response) => {
    const health = await bot.healthCheck();
    
    if (health.status === 'healthy') {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        reason: 'Services not healthy',
        timestamp: new Date().toISOString()
      });
    }
  }));

  /**
   * Liveness check (for Kubernetes)
   */
  router.get('/live', asyncHandler(async (req: Request, res: Response) => {
    // Simple check - if we can respond, we're alive
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString()
    });
  }));

  /**
   * Service-specific health checks
   */
  router.get('/services', asyncHandler(async (req: Request, res: Response) => {
    const health = await bot.healthCheck();
    
    res.status(health.status === 'healthy' ? 200 : 503).json({
      status: health.status,
      services: health.details.services,
      timestamp: new Date().toISOString()
    });
  }));

  return router;
}
