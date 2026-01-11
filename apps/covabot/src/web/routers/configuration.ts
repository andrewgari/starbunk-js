import express, { Request } from 'express';
import { logger } from '@starbunk/shared';
import { BotConfigurationService } from '../../services/bot-configuration-service';
import { CreateConfigurationRequest, UpdateConfigurationRequest } from '../../types/bot-configuration';

export function createConfigurationRouter(configService: BotConfigurationService): express.Router {
	const router = express.Router();

	// Get bot configuration
	router.get('/configuration', async (_req, res) => {
		try {
			const config = await configService.getConfiguration();
			res.json(config);
		} catch (error) {
			logger.error('[WebServer] Error getting configuration:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to get configuration' });
		}
	});

	// Update bot configuration
	router.put(
		'/configuration',
		async (req: Request<Record<string, never>, unknown, UpdateConfigurationRequest>, res) => {
			try {
				const updates: UpdateConfigurationRequest = req.body;
				const config = await configService.updateConfiguration(updates);
				res.json(config);
			} catch (error) {
				logger.error('[WebServer] Error updating configuration:', error as Error);
				res.status(500).json({ success: false, error: 'Failed to update configuration' });
			}
		},
	);

	// Create new configuration
	router.post(
		'/configuration',
		async (req: Request<Record<string, never>, unknown, CreateConfigurationRequest>, res) => {
			try {
				const request: CreateConfigurationRequest = req.body;
				const config = await configService.createConfiguration(request);
				res.json(config);
			} catch (error) {
				logger.error('[WebServer] Error creating configuration:', error as Error);
				res.status(500).json({ success: false, error: 'Failed to create configuration' });
			}
		},
	);

	// Reset configuration to defaults
	router.post('/configuration/reset', async (_req, res) => {
		try {
			const config = await configService.resetToDefaults();
			res.json(config);
		} catch (error) {
			logger.error('[WebServer] Error resetting configuration:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to reset configuration' });
		}
	});

	// Bot configuration routes (for test compatibility)
	router.get('/config/bot', async (_req, res) => {
		try {
			const config = await configService.getConfiguration();
			res.json({ success: true, data: config });
		} catch (error) {
			logger.error('[WebServer] Error getting bot configuration:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to get bot configuration' });
		}
	});

	const updateBotConfigHandler: import('express').RequestHandler<
		Record<string, never>,
		{ success: boolean; data?: unknown; error?: string },
		UpdateConfigurationRequest
	> = async (req, res) => {
		try {
			const updates: UpdateConfigurationRequest = req.body;

			if (
				updates.responseFrequency !== undefined &&
				(updates.responseFrequency < 0 || updates.responseFrequency > 100)
			) {
				res.status(400).json({ success: false, error: 'Response rate must be between 0 and 100' });
				return;
			}

			if (updates.isEnabled !== undefined && typeof updates.isEnabled !== 'boolean') {
				res.status(400).json({ success: false, error: 'isEnabled must be a boolean' });
				return;
			}

			const config = await configService.updateConfiguration(updates);
			res.json({ success: true, data: config });
		} catch (error) {
			logger.error('[WebServer] Error updating bot configuration:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to update bot configuration' });
		}
	};

	router.put('/config/bot', updateBotConfigHandler);

	return router;
}
