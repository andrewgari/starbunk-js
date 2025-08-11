import express from 'express';
import { logger } from '@starbunk/shared';
import { QdrantMemoryService } from '../../services/qdrantMemoryService';
import {
	CreatePersonalityNoteRequest,
	UpdatePersonalityNoteRequest,
	PersonalityCategory,
	Priority,
} from '../../types/memoryTypes';

export function createPersonalityNotesRouter(memoryService: QdrantMemoryService): express.Router {
	const personalityRouter = express.Router();

	// Search personality notes (must be before /:id route)
	personalityRouter.get('/search', async (req: any, res: any) => {
		try {
			const query = req.query.query as string;
			const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
			const category = req.query.category as PersonalityCategory;
			const priority = req.query.priority as Priority;

			if (limit < 1 || limit > 100) {
				return res.status(400).json({ success: false, error: 'Limit must be between 1 and 100' });
			}

			let results;
			if (query) {
				const filters = category || priority ? { category, priority } : undefined;
				results = await (memoryService as any).searchPersonalityNotes(query, filters, limit);
			} else {
				results = await (memoryService as any).searchPersonalityNotes('', undefined, limit);
			}

			res.json({ success: true, data: results });
		} catch (error) {
			logger.error('[WebServer] Error searching personality notes:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to search personality notes' });
		}
	});

	// Export/Import routes (must be before /:id route)
	personalityRouter.get('/export', async (_req: any, res: any) => {
		try {
			const notes = await (memoryService as any).searchPersonalityNotes('', undefined, 1000);
			const exportData = {
				notes: notes,
				exportDate: new Date().toISOString(),
				version: '1.0',
			};

			res.json({ success: true, data: exportData });
		} catch (error) {
			logger.error('[WebServer] Error exporting personality notes:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to export personality notes' });
		}
	});

	personalityRouter.post('/import', async (req: any, res: any) => {
		try {
			const { notes } = req.body;

			if (!Array.isArray(notes)) {
				return res.status(400).json({ success: false, error: 'Notes must be an array' });
			}

			const importedNotes = [] as any[];
			for (const noteData of notes) {
				const note = await (memoryService as any).createPersonalityNote(noteData.content, {
					category: noteData.category || 'knowledge',
					priority: noteData.priority || 'medium',
				});
				importedNotes.push(note);
			}

			res.json({ success: true, data: { imported: importedNotes.length, notes: importedNotes } });
		} catch (error) {
			logger.error('[WebServer] Error importing personality notes:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to import personality notes' });
		}
	});

	// Bulk operations (must be before /:id route)
	personalityRouter.post('/bulk', async (req: any, res: any) => {
		try {
			const { notes } = req.body;

			if (!Array.isArray(notes)) {
				return res.status(400).json({ success: false, error: 'Notes must be an array' });
			}

			const createdNotes = [] as any[];
			for (const noteData of notes) {
				const note = await (memoryService as any).createPersonalityNote(noteData.content, {
					category: noteData.category || 'knowledge',
					priority: noteData.priority || 'medium',
				});
				createdNotes.push(note);
			}

			res.status(201).json({ success: true, data: createdNotes });
		} catch (error) {
			logger.error('[WebServer] Error in bulk create:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to create notes in bulk' });
		}
	});

	personalityRouter.delete('/bulk', async (req: any, res: any) => {
		try {
			const { ids } = req.body;

			if (!Array.isArray(ids)) {
				return res.status(400).json({ success: false, error: 'IDs must be an array' });
			}

			const results = [] as any[];
			for (const id of ids) {
				const deleted = await (memoryService as any).deletePersonalityNote(id);
				results.push({ id, deleted });
			}

			res.json({ success: true, data: results });
		} catch (error) {
			logger.error('[WebServer] Error in bulk delete:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to delete notes in bulk' });
		}
	});

	// Get all personality notes
	personalityRouter.get('/', async (req: any, res: any) => {
		try {
			const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
			const notes = await (memoryService as any).searchPersonalityNotes('', undefined, limit);
			res.json({ success: true, data: notes });
		} catch (error) {
			logger.error('[WebServer] Error getting personality notes:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to get personality notes' });
		}
	});

	// Get personality note by ID
	personalityRouter.get('/:id', async (req: any, res: any) => {
		try {
			const note = await (memoryService as any).getPersonalityNote(req.params.id);
			if (!note) {
				return res.status(404).json({ success: false, error: 'Personality note not found' });
			}
			res.json({ success: true, data: note });
		} catch (error) {
			logger.error('[WebServer] Error getting personality note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to get personality note' });
		}
	});

	// Create new personality note
	personalityRouter.post('/', async (req: any, res: any) => {
		try {
			const request: CreatePersonalityNoteRequest = {
				content: req.body.content,
				category: req.body.category || 'knowledge',
				priority: req.body.priority || 'medium',
			};

			if (!request.content || !request.content.trim()) {
				return res.status(400).json({ success: false, error: 'Content is required' });
			}

			if (
				!request.category ||
				!['instruction', 'personality', 'behavior', 'knowledge', 'context'].includes(request.category)
			) {
				return res.status(400).json({ success: false, error: 'Invalid category' });
			}

			const note = await (memoryService as any).createPersonalityNote(request.content, {
				category: request.category,
				priority: request.priority,
			});
			res.status(201).json({ success: true, data: note });
		} catch (error) {
			logger.error('[WebServer] Error creating personality note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to create personality note' });
		}
	});

	// Update personality note
	personalityRouter.put('/:id', async (req: any, res: any) => {
		try {
			const request: UpdatePersonalityNoteRequest = {
				content: req.body.content,
				category: req.body.category,
				priority: req.body.priority,
				isActive: req.body.isActive,
			};

			if (request.content !== undefined && (!request.content || !request.content.trim())) {
				return res.status(400).json({ success: false, error: 'Content cannot be empty' });
			}

			if (
				request.category !== undefined &&
				!['instruction', 'personality', 'behavior', 'knowledge', 'context'].includes(request.category)
			) {
				return res.status(400).json({ success: false, error: 'Invalid category' });
			}

			const note = await (memoryService as any).updatePersonalityNote(req.params.id, request);
			if (!note) {
				return res.status(404).json({ success: false, error: 'Personality note not found' });
			}

			res.json({ success: true, data: note });
		} catch (error) {
			logger.error('[WebServer] Error updating personality note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to update personality note' });
		}
	});

	// Delete personality note
	personalityRouter.delete('/:id', async (req: any, res: any) => {
		try {
			const deleted = await (memoryService as any).deletePersonalityNote(req.params.id);
			if (!deleted) {
				return res.status(404).json({ success: false, error: 'Personality note not found' });
			}

			res.json({ success: true, message: 'Personality note deleted successfully' });
		} catch (error) {
			logger.error('[WebServer] Error deleting personality note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to delete personality note' });
		}
	});

	return personalityRouter;
}
