import express, { type RequestHandler } from 'express';
import { logger } from '@starbunk/shared';
import { QdrantMemoryService } from '../../services/qdrantMemoryService';
import {
	CreatePersonalityNoteRequest,
	UpdatePersonalityNoteRequest,
	PersonalityCategory,
	Priority,
} from '../../types/memoryTypes';

interface SearchQueryParams {
	query?: string;
	limit?: string;
	category?: PersonalityCategory;
	priority?: Priority;
}

export function createPersonalityNotesRouter(memoryService: QdrantMemoryService): express.Router {
	const personalityRouter = express.Router();

	// Search personality notes (must be before /:id route)
	const searchHandler: RequestHandler<
		Record<string, never>,
		{ success: boolean; data?: unknown; error?: string },
		unknown,
		SearchQueryParams
	> = async (req, res) => {
		try {
			const query = req.query.query as string;
			const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
			const category = req.query.category as PersonalityCategory | undefined;
			const priority = req.query.priority as Priority | undefined;

			if (limit < 1 || limit > 100) {
				res.status(400).json({ success: false, error: 'Limit must be between 1 and 100' });
				return;
			}

			let results;
			if (query) {
				const filters = category || priority ? { category, priority } : undefined;
				results = await memoryService.searchPersonalityNotes(query, filters, limit);
			} else {
				results = await memoryService.searchPersonalityNotes('', undefined, limit);
			}

			res.json({ success: true, data: results });
		} catch (error) {
			logger.error('[WebServer] Error searching personality notes:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to search personality notes' });
		}
	};

	personalityRouter.get('/search', searchHandler);

	// Export/Import routes (must be before /:id route)
	const exportHandler: RequestHandler<
		Record<string, never>,
		{ success: boolean; data?: unknown; error?: string }
	> = async (_req, res) => {
		try {
			const notes = await memoryService.searchPersonalityNotes('', undefined, 1000);
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
	};

	personalityRouter.get('/export', exportHandler);

	const importHandler: RequestHandler<
		Record<string, never>,
		{ success: boolean; data?: unknown; error?: string },
		{ notes: Array<{ content: string; category?: PersonalityCategory; priority?: Priority }> }
	> = async (req, res) => {
		try {
			const { notes } = req.body;

			if (!Array.isArray(notes)) {
				res.status(400).json({ success: false, error: 'Notes must be an array' });
				return;
			}

			const importedNotes: Array<unknown> = [];
			for (const noteData of notes) {
				const note = await memoryService.createPersonalityNote(noteData.content, {
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
	};

	personalityRouter.post('/import', importHandler);

	// Bulk operations (must be before /:id route)
	const bulkCreateHandler: RequestHandler<
		Record<string, never>,
		{ success: boolean; data?: unknown; error?: string },
		{ notes: Array<{ content: string; category?: PersonalityCategory; priority?: Priority }> }
	> = async (req, res) => {
		try {
			const { notes } = req.body;

			if (!Array.isArray(notes)) {
				res.status(400).json({ success: false, error: 'Notes must be an array' });
				return;
			}

			const createdNotes: Array<unknown> = [];
			for (const noteData of notes) {
				const note = await memoryService.createPersonalityNote(noteData.content, {
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
	};

	personalityRouter.post('/bulk', bulkCreateHandler);

	const bulkDeleteHandler: RequestHandler<
		Record<string, never>,
		{ success: boolean; data?: unknown; error?: string },
		{ ids: string[] }
	> = async (req, res) => {
		try {
			const { ids } = req.body;

			if (!Array.isArray(ids)) {
				res.status(400).json({ success: false, error: 'IDs must be an array' });
				return;
			}

			const results: Array<{ id: string; deleted: boolean }> = [];
			for (const id of ids) {
				const deleted = await memoryService.deletePersonalityNote(id);
				results.push({ id, deleted });
			}

			res.json({ success: true, data: results });
		} catch (error) {
			logger.error('[WebServer] Error in bulk delete:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to delete notes in bulk' });
		}
	};

	personalityRouter.delete('/bulk', bulkDeleteHandler);

	// Get all personality notes
	const listHandler: RequestHandler<
		Record<string, never>,
		{ success: boolean; data?: unknown; error?: string },
		unknown,
		{ limit?: string }
	> = async (req, res) => {
		try {
			const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
			const notes = await memoryService.searchPersonalityNotes('', undefined, limit);
			res.json({ success: true, data: notes });
		} catch (error) {
			logger.error('[WebServer] Error getting personality notes:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to get personality notes' });
		}
	};

	personalityRouter.get('/', listHandler);

	// Get personality note by ID
	const getHandler: import('express').RequestHandler<
		{ id: string },
		{ success: boolean; data?: unknown; error?: string },
		Record<string, never>,
		Record<string, never>
	> = async (req, res) => {
		try {
			const note = await memoryService.getPersonalityNote(req.params.id);
			if (!note) {
				res.status(404).json({ success: false, error: 'Personality note not found' });
				return;
			}
			res.json({ success: true, data: note });
		} catch (error) {
			logger.error('[WebServer] Error getting personality note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to get personality note' });
		}
	};

	personalityRouter.get('/:id', getHandler);

	// Create new personality note
	const createHandler: RequestHandler<
		Record<string, never>,
		{ success: boolean; data?: unknown; error?: string },
		CreatePersonalityNoteRequest
	> = async (req, res) => {
		try {
			const request: CreatePersonalityNoteRequest = {
				content: req.body.content,
				category: req.body.category || 'knowledge',
				priority: req.body.priority || 'medium',
			};

			if (!request.content || !request.content.trim()) {
				res.status(400).json({ success: false, error: 'Content is required' });
				return;
			}

			if (
				!request.category ||
				!['instruction', 'personality', 'behavior', 'knowledge', 'context'].includes(request.category)
			) {
				res.status(400).json({ success: false, error: 'Invalid category' });
				return;
			}

			const note = await memoryService.createPersonalityNote(request.content, {
				category: request.category,
				priority: request.priority,
			});
			res.status(201).json({ success: true, data: note });
		} catch (error) {
			logger.error('[WebServer] Error creating personality note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to create personality note' });
		}
	};

	personalityRouter.post('/', createHandler);

	// Update personality note
	const updateHandler: RequestHandler<
		{ id: string },
		{ success: boolean; data?: unknown; error?: string },
		UpdatePersonalityNoteRequest
	> = async (req, res) => {
		try {
			const request: UpdatePersonalityNoteRequest = {
				content: req.body.content,
				category: req.body.category,
				priority: req.body.priority,
				isActive: req.body.isActive,
			};

			if (request.content !== undefined && (!request.content || !request.content.trim())) {
				res.status(400).json({ success: false, error: 'Content cannot be empty' });
				return;
			}

			if (
				request.category !== undefined &&
				!['instruction', 'personality', 'behavior', 'knowledge', 'context'].includes(request.category)
			) {
				res.status(400).json({ success: false, error: 'Invalid category' });
				return;
			}

			const note = await memoryService.updatePersonalityNote(req.params.id, request);
			if (!note) {
				res.status(404).json({ success: false, error: 'Personality note not found' });
				return;
			}

			res.json({ success: true, data: note });
		} catch (error) {
			logger.error('[WebServer] Error updating personality note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to update personality note' });
		}
	};

	personalityRouter.put('/:id', updateHandler);

	// Delete personality note
	const deleteHandler: RequestHandler<
		{ id: string },
		{ success: boolean; data?: unknown; error?: string },
		Record<string, never>,
		Record<string, never>
	> = async (req, res) => {
		try {
			const deleted = await memoryService.deletePersonalityNote(req.params.id);
			if (!deleted) {
				res.status(404).json({ success: false, error: 'Personality note not found' });
				return;
			}

			res.json({ success: true, data: { message: 'Personality note deleted successfully' } });
		} catch (error) {
			logger.error('[WebServer] Error deleting personality note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to delete personality note' });
		}
	};

	personalityRouter.delete('/:id', deleteHandler);

	return personalityRouter;
}
