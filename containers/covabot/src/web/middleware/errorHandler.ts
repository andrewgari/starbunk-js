// Error handling middleware for CovaBot web interface
import { Request, Response, NextFunction } from 'express';
import { logger } from '@starbunk/shared';
import { CovaBotError, MemoryError, LLMError, IdentityError } from '../../types';

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  logger.error('🚨 Web server error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query
  });

  // Handle different error types
  if (error instanceof CovaBotError) {
    handleCovaBotError(error, res);
  } else if (error instanceof MemoryError) {
    handleMemoryError(error, res);
  } else if (error instanceof LLMError) {
    handleLLMError(error, res);
  } else if (error instanceof IdentityError) {
    handleIdentityError(error, res);
  } else if (error.name === 'ValidationError') {
    handleValidationError(error, res);
  } else if (error.name === 'SyntaxError') {
    handleSyntaxError(error, res);
  } else if (error.name === 'UnauthorizedError') {
    handleUnauthorizedError(error, res);
  } else {
    handleGenericError(error, res);
  }
}

/**
 * Handle CovaBot specific errors
 */
function handleCovaBotError(error: CovaBotError, res: Response): void {
  res.status(error.statusCode).json({
    error: error.code,
    message: error.message,
    details: error.details,
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle memory service errors
 */
function handleMemoryError(error: MemoryError, res: Response): void {
  res.status(500).json({
    error: 'MEMORY_ERROR',
    message: 'Memory service error: ' + error.message,
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle LLM service errors
 */
function handleLLMError(error: LLMError, res: Response): void {
  res.status(503).json({
    error: 'LLM_ERROR',
    message: 'AI service temporarily unavailable: ' + error.message,
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle identity service errors
 */
function handleIdentityError(error: IdentityError, res: Response): void {
  res.status(500).json({
    error: 'IDENTITY_ERROR',
    message: 'Identity service error: ' + error.message,
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle validation errors
 */
function handleValidationError(error: Error, res: Response): void {
  res.status(400).json({
    error: 'VALIDATION_ERROR',
    message: 'Request validation failed: ' + error.message,
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle JSON syntax errors
 */
function handleSyntaxError(error: Error, res: Response): void {
  res.status(400).json({
    error: 'SYNTAX_ERROR',
    message: 'Invalid JSON in request body',
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle unauthorized errors
 */
function handleUnauthorizedError(error: Error, res: Response): void {
  res.status(401).json({
    error: 'UNAUTHORIZED',
    message: 'Authentication required',
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle generic errors
 */
function handleGenericError(error: Error, res: Response): void {
  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: isDevelopment ? error.message : 'An internal server error occurred',
    ...(isDevelopment && { stack: error.stack }),
    timestamp: new Date().toISOString()
  });
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn('🔍 Route not found:', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
}

/**
 * Request timeout handler
 */
export function timeoutHandler(timeout: number = 30000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('⏰ Request timeout:', {
          path: req.path,
          method: req.method,
          timeout,
          ip: req.ip
        });

        res.status(408).json({
          error: 'REQUEST_TIMEOUT',
          message: `Request timed out after ${timeout}ms`,
          timestamp: new Date().toISOString()
        });
      }
    }, timeout);

    // Clear timeout when response is sent
    res.on('finish', () => {
      clearTimeout(timer);
    });

    next();
  };
}

/**
 * Create error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  statusCode: number = 500,
  details?: unknown
): {
  error: string;
  message: string;
  details?: unknown;
  timestamp: string;
} {
  return {
    error: code,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString()
  };
}

/**
 * Log and create error response
 */
export function logAndCreateError(
  error: Error,
  context: string,
  statusCode: number = 500
): {
  error: string;
  message: string;
  timestamp: string;
} {
  logger.error(`${context}:`, error);
  
  return createErrorResponse(
    'INTERNAL_ERROR',
    error.message,
    statusCode
  );
}
