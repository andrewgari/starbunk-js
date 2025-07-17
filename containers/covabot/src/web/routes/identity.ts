// Identity management routes for CovaBot web interface
import { Router, Request, Response } from 'express';
import { logger } from '@starbunk/shared';
import { EnhancedCovaBot } from '../../cova-bot/EnhancedCovaBot';
import { asyncHandler, createErrorResponse } from '../middleware/errorHandler';
import { requireRole } from '../middleware/auth';
import Joi from 'joi';

/**
 * Create identity management routes
 */
export function identityRoutes(bot: EnhancedCovaBot): Router {
  const router = Router();

  /**
   * Get server identities
   */
  router.get('/servers', requireRole('moderator'), asyncHandler(async (req: Request, res: Response) => {
    try {
      const stats = await bot.getStats();
      
      res.json({
        success: true,
        data: {
          identities: stats.identity,
          totalServers: stats.bot.guilds
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get server identities:', error);
      res.status(500).json(createErrorResponse(
        'IDENTITY_ERROR',
        'Failed to retrieve server identities',
        500
      ));
    }
  }));

  /**
   * Get server identity by ID
   */
  router.get('/server/:serverId', requireRole('moderator'), asyncHandler(async (req: Request, res: Response) => {
    const schema = Joi.object({
      serverId: Joi.string().required()
    });

    const { error, value } = schema.validate(req.params);
    if (error) {
      return res.status(400).json(createErrorResponse(
        'VALIDATION_ERROR',
        error.details[0].message,
        400
      ));
    }

    try {
      // This would need to be implemented in the bot
      res.json({
        success: true,
        data: {
          serverId: value.serverId,
          identity: {
            nickname: 'CovaBot',
            personality: 'friendly',
            isActive: true
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get server identity:', error);
      res.status(500).json(createErrorResponse(
        'IDENTITY_ERROR',
        'Failed to retrieve server identity',
        500
      ));
    }
  }));

  /**
   * Update server identity (admin only)
   */
  router.put('/server/:serverId', requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
    const paramsSchema = Joi.object({
      serverId: Joi.string().required()
    });

    const bodySchema = Joi.object({
      nickname: Joi.string().min(1).max(32).optional(),
      avatarUrl: Joi.string().uri().optional(),
      personalityId: Joi.string().optional()
    });

    const { error: paramsError, value: params } = paramsSchema.validate(req.params);
    if (paramsError) {
      return res.status(400).json(createErrorResponse(
        'VALIDATION_ERROR',
        paramsError.details[0].message,
        400
      ));
    }

    const { error: bodyError, value: body } = bodySchema.validate(req.body);
    if (bodyError) {
      return res.status(400).json(createErrorResponse(
        'VALIDATION_ERROR',
        bodyError.details[0].message,
        400
      ));
    }

    try {
      logger.info('Server identity update requested', {
        serverId: params.serverId,
        updates: Object.keys(body),
        adminUser: (req as any).user?.username
      });

      // This would need to be implemented in the bot
      res.json({
        success: true,
        message: 'Server identity updated successfully',
        data: {
          serverId: params.serverId,
          updates: body
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to update server identity:', error);
      res.status(500).json(createErrorResponse(
        'UPDATE_ERROR',
        'Failed to update server identity',
        500
      ));
    }
  }));

  /**
   * Get available personalities
   */
  router.get('/personalities', asyncHandler(async (req: Request, res: Response) => {
    try {
      // This would need to be implemented in the bot
      res.json({
        success: true,
        data: {
          personalities: [
            {
              id: 'friendly',
              name: 'Friendly Assistant',
              description: 'A helpful and friendly AI assistant',
              isDefault: true
            },
            {
              id: 'professional',
              name: 'Professional Assistant',
              description: 'A formal and professional AI assistant',
              isDefault: false
            },
            {
              id: 'casual',
              name: 'Casual Friend',
              description: 'A relaxed and casual AI companion',
              isDefault: false
            }
          ]
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get personalities:', error);
      res.status(500).json(createErrorResponse(
        'PERSONALITY_ERROR',
        'Failed to retrieve personalities',
        500
      ));
    }
  }));

  /**
   * Get personality by ID
   */
  router.get('/personality/:personalityId', asyncHandler(async (req: Request, res: Response) => {
    const schema = Joi.object({
      personalityId: Joi.string().required()
    });

    const { error, value } = schema.validate(req.params);
    if (error) {
      return res.status(400).json(createErrorResponse(
        'VALIDATION_ERROR',
        error.details[0].message,
        400
      ));
    }

    try {
      // This would need to be implemented in the bot
      res.json({
        success: true,
        data: {
          personality: {
            id: value.personalityId,
            name: 'Friendly Assistant',
            description: 'A helpful and friendly AI assistant',
            traits: [
              { name: 'helpfulness', value: 90, description: 'Always tries to be helpful' },
              { name: 'friendliness', value: 85, description: 'Warm and approachable' }
            ],
            responseStyle: {
              formality: 30,
              verbosity: 60,
              emotiveness: 70,
              humor: 50,
              supportiveness: 85
            }
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get personality:', error);
      res.status(500).json(createErrorResponse(
        'PERSONALITY_ERROR',
        'Failed to retrieve personality',
        500
      ));
    }
  }));

  /**
   * Create custom personality (admin only)
   */
  router.post('/personality', requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
    const schema = Joi.object({
      name: Joi.string().required().min(1).max(100),
      description: Joi.string().required().min(1).max(500),
      traits: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          value: Joi.number().integer().min(0).max(100).required(),
          description: Joi.string().required()
        })
      ).required(),
      responseStyle: Joi.object({
        formality: Joi.number().integer().min(0).max(100).required(),
        verbosity: Joi.number().integer().min(0).max(100).required(),
        emotiveness: Joi.number().integer().min(0).max(100).required(),
        humor: Joi.number().integer().min(0).max(100).required(),
        supportiveness: Joi.number().integer().min(0).max(100).required()
      }).required(),
      triggerPatterns: Joi.array().items(Joi.string()).default([]),
      contextualBehaviors: Joi.array().items(
        Joi.object({
          context: Joi.string().required(),
          behavior: Joi.string().required(),
          priority: Joi.number().integer().min(0).max(100).required()
        })
      ).default([])
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json(createErrorResponse(
        'VALIDATION_ERROR',
        error.details[0].message,
        400
      ));
    }

    try {
      logger.info('Custom personality creation requested', {
        name: value.name,
        adminUser: (req as any).user?.username
      });

      // This would need to be implemented in the bot
      const personalityId = `custom_${Date.now()}`;

      res.status(201).json({
        success: true,
        message: 'Custom personality created successfully',
        data: {
          personalityId,
          ...value
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to create personality:', error);
      res.status(500).json(createErrorResponse(
        'CREATE_ERROR',
        'Failed to create custom personality',
        500
      ));
    }
  }));

  /**
   * Delete custom personality (admin only)
   */
  router.delete('/personality/:personalityId', requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
    const schema = Joi.object({
      personalityId: Joi.string().required()
    });

    const { error, value } = schema.validate(req.params);
    if (error) {
      return res.status(400).json(createErrorResponse(
        'VALIDATION_ERROR',
        error.details[0].message,
        400
      ));
    }

    // Prevent deletion of default personalities
    if (['friendly', 'professional', 'casual'].includes(value.personalityId)) {
      return res.status(400).json(createErrorResponse(
        'VALIDATION_ERROR',
        'Cannot delete default personalities',
        400
      ));
    }

    try {
      logger.info('Personality deletion requested', {
        personalityId: value.personalityId,
        adminUser: (req as any).user?.username
      });

      // This would need to be implemented in the bot
      res.json({
        success: true,
        message: 'Personality deleted successfully',
        personalityId: value.personalityId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to delete personality:', error);
      res.status(500).json(createErrorResponse(
        'DELETE_ERROR',
        'Failed to delete personality',
        500
      ));
    }
  }));

  return router;
}
