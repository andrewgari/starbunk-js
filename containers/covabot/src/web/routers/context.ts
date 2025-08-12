import express, { type RequestHandler } from 'express';
import { logger } from '@starbunk/shared';
import { QdrantMemoryService } from '../../services/qdrantMemoryService';

interface SearchRequestBody {
	query?: string;
	filters?: Record<string, unknown>;
}
interface EnhancedContextBody {
	message?: string;
	userId?: string;
	channelId?: string;
	options?: Record<string, unknown>;
}

export function createContextRouter(memoryService: QdrantMemoryService): express.Router {
	const router = express.Router();

	// Get active notes for LLM context
	router.get('/context', async (_req, res) => {
		try {
			const context = await memoryService.getActiveNotesForLLM();
			res.send(context);
		} catch (error) {
			logger.error('[WebServer] Error getting context:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to get context' });
		}
	});

	// Semantic search endpoint
	const searchHandler: RequestHandler<
		Record<string, never>,
		{ success: boolean; data?: unknown; error?: string },
		SearchRequestBody
	> = async (req, res) => {
		try {
			const { query, filters = {} } = req.body;

			if (!query || typeof query !== 'string') {
				res.status(400).json({ success: false, error: 'Query is required' });
				return;
			}

			const results = await memoryService.searchMemory(query, filters);
			res.json({ success: true, data: results });
		} catch (error) {
			logger.error('[WebServer] Error in semantic search:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to search memory' });
		}
	};

	router.post('/search', searchHandler);

	// Enhanced context generation
	const enhancedHandler: RequestHandler<
		Record<string, never>,
		{ success: boolean; data?: unknown; error?: string },
		EnhancedContextBody
	> = async (req, res) => {
		try {
			const { message, userId, channelId, options = {} } = req.body;

			if (!message || !userId || !channelId) {
				res.status(400).json({
					success: false,
					error: 'Message, userId, and channelId are required',
				});
				return;
			}

			const context = await memoryService.generateEnhancedContext(message, userId, channelId, options);
			res.json({ success: true, data: context });
		} catch (error) {
			logger.error('[WebServer] Error generating enhanced context:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to generate enhanced context' });
		}
	};

	router.post('/context/enhanced', enhancedHandler);

	return router;
}
