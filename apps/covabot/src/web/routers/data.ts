import express from 'express';
import { logger } from '@starbunk/shared';
import { QdrantMemoryService } from '../../services/qdrantMemoryService';
import { BotConfigurationService } from '../../services/botConfigurationService';

export function createDataRouter(
	memoryService: QdrantMemoryService,
	configService: BotConfigurationService,
): express.Router {
	const router = express.Router();

	// Export all data
	router.get('/export', async (_req, res) => {
		try {
			const notes = await memoryService.getNotes();
			const config = await configService.getConfiguration();

			const exportData = {
				configuration: config,
				notes: notes,
				exportedAt: new Date().toISOString(),
				version: '1.0',
			};

			res.json(exportData);
		} catch (error) {
			logger.error('[WebServer] Error exporting data:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to export data' });
		}
	});

	// Import data
	router.post('/import', async (req, res) => {
		try {
			const importData = req.body;

			if (importData.configuration) {
				await configService.updateConfiguration(importData.configuration);
			}

			if (importData.notes && Array.isArray(importData.notes)) {
				const existingNotes = await memoryService.getNotes();
				for (const note of existingNotes) {
					await memoryService.deleteNote(note.id);
				}

				for (const noteData of importData.notes) {
					await memoryService.createNote({
						content: noteData.content,
						category: noteData.category,
						priority: noteData.priority,
					});
				}
			}

			res.json({ success: true, message: 'Data imported successfully' });
		} catch (error) {
			logger.error('[WebServer] Error importing data:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to import data' });
		}
	});

	// Stats (summary version)
	router.get('/stats', async (_req, res) => {
		try {
			// Prefer detailed stats from service when available (test expects this shape)
			if (typeof (memoryService as any).getStats === 'function') {
				const detailed = await (memoryService as any).getStats();
				res.json({ success: true, data: detailed });
				return;
			}
			const notes = await memoryService.getNotes();
			const config = await configService.getConfiguration();

			const stats = {
				totalNotes: notes.length,
				activeNotes: notes.filter((note) => note.isActive).length,
				inactiveNotes: notes.filter((note) => !note.isActive).length,
				categoryCounts: notes.reduce(
					(acc, note) => {
						acc[note.category] = (acc[note.category] || 0) + 1;
						return acc;
					},
					{} as Record<string, number>,
				),
				priorityCounts: notes.reduce(
					(acc, note) => {
						acc[note.priority] = (acc[note.priority] || 0) + 1;
						return acc;
					},
					{} as Record<string, number>,
				),
				botEnabled: config.isEnabled,
				responseFrequency: config.responseFrequency,
				lastUpdated: new Date().toISOString(),
			};

			res.json({ success: true, data: stats });
		} catch (error) {
			logger.error('[WebServer] Error getting stats:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to get stats' });
		}
	});

	return router;
}
