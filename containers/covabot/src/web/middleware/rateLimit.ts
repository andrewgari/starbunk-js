// Rate limiting middleware for CovaBot web interface
import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { logger } from '@starbunk/shared';

// Rate limiters for different endpoints
const rateLimiters = {
  // General API rate limiter
  api: new RateLimiterMemory({
    keyGenerator: (req: Request) => req.ip,
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 60 seconds if exceeded
  }),

  // Memory operations (more restrictive)
  memory: new RateLimiterMemory({
    keyGenerator: (req: Request) => req.ip,
    points: 20, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 120, // Block for 2 minutes if exceeded
  }),

  // Authentication attempts
  auth: new RateLimiterMemory({
    keyGenerator: (req: Request) => req.ip,
    points: 5, // Number of attempts
    duration: 300, // Per 5 minutes
    blockDuration: 900, // Block for 15 minutes if exceeded
  }),

  // Health checks (very permissive)
  health: new RateLimiterMemory({
    keyGenerator: (req: Request) => req.ip,
    points: 60, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 10, // Block for 10 seconds if exceeded
  })
};

/**
 * General rate limiting middleware
 */
export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Choose appropriate rate limiter based on path
    let limiter = rateLimiters.api;
    let limiterName = 'api';

    if (req.path.startsWith('/health')) {
      limiter = rateLimiters.health;
      limiterName = 'health';
    } else if (req.path.startsWith('/api/memory')) {
      limiter = rateLimiters.memory;
      limiterName = 'memory';
    } else if (req.path.includes('auth') || req.path.includes('login')) {
      limiter = rateLimiters.auth;
      limiterName = 'auth';
    }

    // Apply rate limiting
    const resRateLimiter = await limiter.consume(req.ip);

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': limiter.points.toString(),
      'X-RateLimit-Remaining': resRateLimiter.remainingPoints?.toString() || '0',
      'X-RateLimit-Reset': new Date(Date.now() + resRateLimiter.msBeforeNext).toISOString()
    });

    next();

  } catch (rateLimiterRes: any) {
    // Rate limit exceeded
    const secs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
    
    logger.warn('🚫 Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      retryAfter: secs
    });

    res.set({
      'Retry-After': secs.toString(),
      'X-RateLimit-Limit': rateLimiters.api.points.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${secs} seconds.`,
      retryAfter: secs
    });
  }
}

/**
 * Create custom rate limiter for specific endpoints
 */
export function createRateLimiter(options: {
  points: number;
  duration: number;
  blockDuration: number;
  keyGenerator?: (req: Request) => string;
}) {
  const limiter = new RateLimiterMemory({
    keyGenerator: options.keyGenerator || ((req: Request) => req.ip),
    points: options.points,
    duration: options.duration,
    blockDuration: options.blockDuration
  });

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resRateLimiter = await limiter.consume(req.ip);

      res.set({
        'X-RateLimit-Limit': options.points.toString(),
        'X-RateLimit-Remaining': resRateLimiter.remainingPoints?.toString() || '0',
        'X-RateLimit-Reset': new Date(Date.now() + resRateLimiter.msBeforeNext).toISOString()
      });

      next();

    } catch (rateLimiterRes: any) {
      const secs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
      
      logger.warn('🚫 Custom rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        retryAfter: secs
      });

      res.set({
        'Retry-After': secs.toString(),
        'X-RateLimit-Limit': options.points.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${secs} seconds.`,
        retryAfter: secs
      });
    }
  };
}

/**
 * Rate limiter for authenticated users (more permissive)
 */
export const authenticatedRateLimit = createRateLimiter({
  points: 200, // More requests for authenticated users
  duration: 60,
  blockDuration: 30,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    const user = (req as any).user;
    return user ? `user:${user.id}` : `ip:${req.ip}`;
  }
});

/**
 * Strict rate limiter for sensitive operations
 */
export const strictRateLimit = createRateLimiter({
  points: 5,
  duration: 300, // 5 minutes
  blockDuration: 900 // 15 minutes
});

/**
 * Get rate limiter statistics
 */
export async function getRateLimiterStats(key: string): Promise<{
  totalHits: number;
  remainingPoints: number;
  msBeforeNext: number;
} | null> {
  try {
    const res = await rateLimiters.api.get(key);
    return res ? {
      totalHits: res.totalHits,
      remainingPoints: res.remainingPoints || 0,
      msBeforeNext: res.msBeforeNext
    } : null;
  } catch (error) {
    logger.error('Failed to get rate limiter stats:', error);
    return null;
  }
}

/**
 * Reset rate limiter for a key
 */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await Promise.all([
      rateLimiters.api.delete(key),
      rateLimiters.memory.delete(key),
      rateLimiters.auth.delete(key),
      rateLimiters.health.delete(key)
    ]);
    
    logger.info('🔄 Rate limit reset', { key });
  } catch (error) {
    logger.error('Failed to reset rate limit:', error);
  }
}
