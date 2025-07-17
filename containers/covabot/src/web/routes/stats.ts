// Statistics routes for CovaBot web interface
import { Router, Request, Response } from 'express';
import { logger } from '@starbunk/shared';
import { EnhancedCovaBot } from '../../cova-bot/EnhancedCovaBot';
import { asyncHandler } from '../middleware/errorHandler';
import { requireRole } from '../middleware/auth';

/**
 * Create statistics routes
 */
export function statsRoutes(bot: EnhancedCovaBot): Router {
  const router = Router();

  /**
   * Get general bot statistics
   */
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const stats = await bot.getStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  }));

  /**
   * Get memory statistics (moderator+ only)
   */
  router.get('/memory', requireRole('moderator'), asyncHandler(async (req: Request, res: Response) => {
    const stats = await bot.getStats();
    
    res.json({
      success: true,
      data: {
        memory: stats.memory,
        embedding: stats.embedding
      },
      timestamp: new Date().toISOString()
    });
  }));

  /**
   * Get identity statistics
   */
  router.get('/identity', asyncHandler(async (req: Request, res: Response) => {
    const stats = await bot.getStats();
    
    res.json({
      success: true,
      data: {
        identity: stats.identity
      },
      timestamp: new Date().toISOString()
    });
  }));

  /**
   * Get processing statistics
   */
  router.get('/processing', asyncHandler(async (req: Request, res: Response) => {
    const stats = await bot.getStats();
    
    res.json({
      success: true,
      data: {
        processing: stats.processing,
        bot: {
          uptime: stats.bot.uptime,
          guilds: stats.bot.guilds,
          users: stats.bot.users
        }
      },
      timestamp: new Date().toISOString()
    });
  }));

  /**
   * Get system statistics (admin only)
   */
  router.get('/system', requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
    const stats = await bot.getStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          version: process.version,
          platform: process.platform,
          arch: process.arch,
          env: process.env.NODE_ENV || 'development'
        }
      },
      timestamp: new Date().toISOString()
    });
  }));

  return router;
}
