import express from 'express';
import { logger } from '@starbunk/shared';
import { QdrantMemoryService } from '../../services/qdrantMemoryService';

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
	router.post('/search', async (req: any, res: any) => {
		try {
			const { query, filters = {} } = req.body;

			if (!query || typeof query !== 'string') {
				return res.status(400).json({ success: false, error: 'Query is required' });
			}

			const results = await memoryService.searchMemory(query, filters);
			res.json({ success: true, data: results });
		} catch (error) {
			logger.error('[WebServer] Error in semantic search:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to search memory' });
		}
	});

	// Enhanced context generation
	router.post('/context/enhanced', async (req: any, res: any) => {
		try {
			const { message, userId, channelId, options = {} } = req.body;

			if (!message || !userId || !channelId) {
				return res.status(400).json({
					success: false,
					error: 'Message, userId, and channelId are required',
				});
			}

			const context = await memoryService.generateEnhancedContext(message, userId, channelId, options);
			res.json({ success: true, data: context });
		} catch (error) {
			logger.error('[WebServer] Error generating enhanced context:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to generate enhanced context' });
		}
	});

	return router;
}
