import express from 'express';
import { logger } from '@starbunk/shared';
import { QdrantMemoryService } from '../../services/qdrantMemoryService';
import {
	MemorySearchFilters,
	CreatePersonalityNoteRequest,
	UpdatePersonalityNoteRequest,
} from '../../types/memoryTypes';

export function createNotesRouter(memoryService: QdrantMemoryService): express.Router {
	const router = express.Router();

	// Get all notes with optional filtering
	router.get('/notes', async (req, res) => {
		try {
			const filters: MemorySearchFilters = {
				category: req.query.category as any,
				priority: req.query.priority as any,
				isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
				search: req.query.search as string,
				limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
			};

			const notes = await memoryService.getNotes(filters);
			res.json({ success: true, data: notes });
		} catch (error) {
			logger.error('[WebServer] Error getting notes:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to get notes' });
		}
	});

	// Get note by ID (using specific path to avoid conflicts)
	router.get('/notes/direct/:id', async (req: any, res: any) => {
		try {
			const note = await memoryService.getNoteById(req.params.id);
			if (!note) {
				return res.status(404).json({ success: false, error: 'Note not found' });
			}
			res.json({ success: true, data: note });
		} catch (error) {
			logger.error('[WebServer] Error getting note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to get note' });
		}
	});

	// Create new note
	router.post('/notes', async (req: any, res: any) => {
		try {
			const request: CreatePersonalityNoteRequest = {
				content: req.body.content,
				category: req.body.category,
				priority: req.body.priority,
			};

			// Validation
			if (!request.content || !request.content.trim()) {
				return res.status(400).json({ success: false, error: 'Content is required' });
			}

			if (
				!request.category ||
				!['instruction', 'personality', 'behavior', 'knowledge', 'context'].includes(request.category)
			) {
				return res.status(400).json({ success: false, error: 'Invalid category' });
			}

			const note = await memoryService.createNote(request);
			res.status(201).json({ success: true, data: note });
		} catch (error) {
			logger.error('[WebServer] Error creating note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to create note' });
		}
	});

	// Update note (using specific path to avoid conflicts)
	router.put('/notes/direct/:id', async (req: any, res: any) => {
		try {
			const request: UpdatePersonalityNoteRequest = {
				content: req.body.content,
				category: req.body.category,
				priority: req.body.priority,
				isActive: req.body.isActive,
			};

			const note = await memoryService.updateNote(req.params.id, request);
			if (!note) {
				return res.status(404).json({ success: false, error: 'Note not found' });
			}

			res.json({ success: true, data: note });
		} catch (error) {
			logger.error('[WebServer] Error updating note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to update note' });
		}
	});

	// Delete note (using specific path to avoid conflicts)
	router.delete('/notes/direct/:id', async (req: any, res: any) => {
		try {
			const deleted = await memoryService.deleteNote(req.params.id);
			if (!deleted) {
				return res.status(404).json({ success: false, error: 'Note not found' });
			}

			res.json({ success: true, message: 'Note deleted successfully' });
		} catch (error) {
			logger.error('[WebServer] Error deleting note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to delete note' });
		}
	});

	// Standard REST routes for notes (for test compatibility)
	router.get('/notes/:id', async (req: any, res: any) => {
		try {
			const note = await memoryService.getNoteById(req.params.id);
			if (!note) {
				return res.status(404).json({ success: false, error: 'Note not found' });
			}
			res.json({ success: true, data: note });
		} catch (error) {
			logger.error('[WebServer] Error getting note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to get note' });
		}
	});

	router.put('/notes/:id', async (req: any, res: any) => {
		try {
			const request: UpdatePersonalityNoteRequest = {
				content: req.body.content,
				category: req.body.category,
				priority: req.body.priority,
				isActive: req.body.isActive,
			};

			const updated = await memoryService.updateNote(req.params.id, request);
			if (!updated) {
				return res.status(404).json({ success: false, error: 'Note not found' });
			}

			res.json({ success: true, data: updated });
		} catch (error) {
			logger.error('[WebServer] Error updating note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to update note' });
		}
	});

	router.delete('/notes/:id', async (req: any, res: any) => {
		try {
			const deleted = await memoryService.deleteNote(req.params.id);
			if (!deleted) {
				return res.status(404).json({ success: false, error: 'Note not found' });
			}

			res.json({ success: true, message: 'Note deleted successfully' });
		} catch (error) {
			logger.error('[WebServer] Error deleting note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to delete note' });
		}
	});

	return router;
}
