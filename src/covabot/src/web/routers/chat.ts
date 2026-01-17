import express, { type RequestHandler } from 'express';
import { logger } from '@/observability/logger';
import { CovaBot } from '../../cova-bot/cova-bot';

interface ChatRequestBody {
	message?: string;
}
interface ChatSuccess {
	success: true;
	data: { userMessage: string; botResponse: string | null; timestamp: string; reason?: string };
}
interface ChatFailure {
	success: false;
	error: string;
}
type ChatResponseBody = ChatSuccess | ChatFailure;

export function createChatRouter(covaBot: CovaBot): express.Router {
	const router = express.Router();

	// Chat endpoint for conversation testing
	const handler: RequestHandler<Record<string, never>, ChatResponseBody, ChatRequestBody> = async (req, res) => {
		try {
			const { message } = req.body;

			if (!message || typeof message !== 'string' || !message.trim()) {
				res.status(400).json({
					success: false,
					error: 'Message is required and must be a non-empty string',
				});
				return;
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
	};

	router.post('/chat', handler);

	return router;
}
