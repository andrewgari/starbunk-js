import { Request, Response, NextFunction } from 'express';
import { logger } from '@starbunk/shared';

export interface AuthenticatedRequest extends Request {
	user?: {
		id: string;
		username: string;
		isAdmin: boolean;
	};
}

/**
 * Simple API key authentication middleware
 * In production, this should be replaced with proper OAuth or JWT authentication
 */
export const apiKeyAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const apiKey = req.headers['x-api-key'] as string;
	const expectedApiKey = process.env.COVABOT_API_KEY;

	// Skip auth in development if no API key is configured
	if (!expectedApiKey && process.env.NODE_ENV === 'development') {
		logger.debug('[Auth] Development mode: skipping API key validation');
		req.user = {
			id: 'dev-user',
			username: 'developer',
			isAdmin: true,
		};
		return next();
	}

	if (!apiKey) {
		logger.warn('[Auth] Missing API key in request');
		return res.status(401).json({
			success: false,
			error: 'API key required. Set X-API-Key header.',
		});
	}

	if (apiKey !== expectedApiKey) {
		logger.warn('[Auth] Invalid API key provided');
		return res.status(401).json({
			success: false,
			error: 'Invalid API key',
		});
	}

	// Set user context (in a real app, this would come from a user database)
	req.user = {
		id: 'admin-user',
		username: 'admin',
		isAdmin: true,
	};

	logger.debug('[Auth] API key authentication successful');
	next();
};

/**
 * Admin-only access middleware
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	if (!req.user) {
		return res.status(401).json({
			success: false,
			error: 'Authentication required',
		});
	}

	if (!req.user.isAdmin) {
		logger.warn(`[Auth] Non-admin user ${req.user.username} attempted admin action`);
		return res.status(403).json({
			success: false,
			error: 'Admin access required',
		});
	}

	next();
};

/**
 * Rate limiting middleware for API endpoints
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const clientId = req.ip || 'unknown';
		const _now = Date.now();

		const clientData = requestCounts.get(clientId);

		if (!clientData || now > clientData.resetTime) {
			// Reset or initialize counter
			requestCounts.set(clientId, {
				count: 1,
				resetTime: now + windowMs,
			});
			return next();
		}

		if (clientData.count >= maxRequests) {
			logger.warn(`[Auth] Rate limit exceeded for client ${clientId}`);
			return res.status(429).json({
				success: false,
				error: 'Rate limit exceeded. Please try again later.',
			});
		}

		clientData.count++;
		next();
	};
};

/**
 * Request logging middleware
 */
export const requestLogger = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	const start = Date.now();

	res.on('finish', () => {
		const duration = Date.now() - start;
		const user = req.user ? req.user.username : 'anonymous';

		logger.info(`[WebServer] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - User: ${user}`);
	});

	next();
};
