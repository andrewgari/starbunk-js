// Authentication middleware for CovaBot web interface
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '@starbunk/shared';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

/**
 * JWT authentication middleware
 */
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Skip auth for health checks and public endpoints
  if (req.path.startsWith('/health') || req.path === '/api') {
    return next();
  }

  const token = extractToken(req);
  
  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'No authentication token provided'
    });
    return;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'covabot-secret-change-in-production';
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role || 'user'
    };

    logger.debug('🔐 User authenticated', {
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
      path: req.path
    });

    next();

  } catch (error) {
    logger.warn('🔐 Authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      ip: req.ip
    });

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token'
    });
  }
}

/**
 * Extract JWT token from request
 */
function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check query parameter (for WebSocket connections)
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token;
  }

  // Check cookie
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  return null;
}

/**
 * Role-based authorization middleware
 */
export function requireRole(requiredRole: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    const userRole = req.user.role;
    const roleHierarchy = ['user', 'moderator', 'admin'];
    
    const userRoleIndex = roleHierarchy.indexOf(userRole);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

    if (userRoleIndex === -1 || userRoleIndex < requiredRoleIndex) {
      logger.warn('🔐 Authorization failed', {
        userId: req.user.id,
        userRole,
        requiredRole,
        path: req.path
      });

      res.status(403).json({
        error: 'Forbidden',
        message: `Role '${requiredRole}' or higher required`
      });
      return;
    }

    next();
  };
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: { id: string; username: string; role: string }): string {
  const jwtSecret = process.env.JWT_SECRET || 'covabot-secret-change-in-production';
  const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT || '86400'); // 24 hours

  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    jwtSecret,
    {
      expiresIn: sessionTimeout
    }
  );
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): { id: string; username: string; role: string } | null {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'covabot-secret-change-in-production';
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    return {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role || 'user'
    };
  } catch (error) {
    return null;
  }
}
