import express from 'express';
import { logger } from '@starbunk/shared';
import { CovaBot } from '../../cova-bot/covaBot';

export function createChatRouter(covaBot: CovaBot): express.Router {
	const router = express.Router();

	// Chat endpoint for conversation testing
	router.post('/chat', async (req: any, res: any) => {
		try {
			const { message } = req.body;

			if (!message || typeof message !== 'string' || !message.trim()) {
				return res.status(400).json({
					success: false,
					error: 'Message is required and must be a non-empty string',
				});
			}

			const response = await covaBot.processWebMessage(message.trim());

			if (response) {
				res.json({
					success: true,
					data: {
						userMessage: message.trim(),
						botResponse: response,
						timestamp: new Date().toISOString(),
					},
				});
			} else {
				res.json({
					success: true,
					data: {
						userMessage: message.trim(),
						botResponse: null,
						timestamp: new Date().toISOString(),
						reason: 'Bot chose not to respond',
					},
				});
			}
		} catch (error) {
			logger.error('[WebServer] Error in chat endpoint:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to process message' });
		}
	});

	return router;
}
