import express from 'express';
import { logger } from '@starbunk/shared';
import { QdrantMemoryService } from '../../services/qdrantMemoryService';

export function createHealthRouter(memoryService: QdrantMemoryService): express.Router {
	const router = express.Router();

	router.get('/health', async (_req, res) => {
		try {
			const healthResult = await memoryService.healthCheck();
			res.json({
				success: healthResult.status === 'healthy',
				status: healthResult.status,
				storage: 'qdrant',
				timestamp: new Date().toISOString(),
				details: healthResult,
			});
		} catch (error) {
			logger.error('[WebServer] Health check failed:', error as Error);
			res.status(500).json({
				success: false,
				status: 'unhealthy',
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	});

	return router;
}
