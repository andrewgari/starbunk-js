import express, { type RequestHandler } from 'express';
import { logger } from '@starbunk/shared';
import { QdrantMemoryService } from '../../services/qdrantMemoryService';
import {
	MemorySearchFilters,
	CreatePersonalityNoteRequest,
	UpdatePersonalityNoteRequest,
	PersonalityCategory,
	Priority,
} from '../../types/memoryTypes';

export function createNotesRouter(memoryService: QdrantMemoryService): express.Router {
	const router = express.Router();

	// Get all notes with optional filtering
	const listHandler: RequestHandler<
		Record<string, never>,
		{ success: boolean; data?: unknown; error?: string },
		unknown,
		{ category?: PersonalityCategory; priority?: Priority; isActive?: string; search?: string; limit?: string }
	> = async (req, res) => {
		try {
			const filters: MemorySearchFilters = {
				category: req.query.category as PersonalityCategory | undefined,
				priority: req.query.priority as Priority | undefined,
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
	};

	router.get('/notes', listHandler);

	// Get note by ID (using specific path to avoid conflicts)
	const getDirectHandler: RequestHandler<
		{ id: string },
		{ success: boolean; data?: unknown; error?: string },
		Record<string, never>,
		Record<string, never>
	> = async (req, res) => {
		try {
			const note = await memoryService.getNoteById(req.params.id);
			if (!note) {
				res.status(404).json({ success: false, error: 'Note not found' });
				return;
			}
			res.json({ success: true, data: note });
		} catch (error) {
			logger.error('[WebServer] Error getting note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to get note' });
		}
	};

	router.get('/notes/direct/:id', getDirectHandler);

	// Create new note
	const createHandler: RequestHandler<
		Record<string, never>,
		{ success: boolean; data?: unknown; error?: string },
		CreatePersonalityNoteRequest
	> = async (req, res) => {
		try {
			const request: CreatePersonalityNoteRequest = {
				content: req.body.content,
				category: req.body.category,
				priority: req.body.priority,
			};

			// Validation
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

			const note = await memoryService.createNote(request);
			res.status(201).json({ success: true, data: note });
		} catch (error) {
			logger.error('[WebServer] Error creating note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to create note' });
		}
	};

	router.post('/notes', createHandler);

	// Update note (using specific path to avoid conflicts)
	const updateDirectHandler: RequestHandler<
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

			const note = await memoryService.updateNote(req.params.id, request);
			if (!note) {
				res.status(404).json({ success: false, error: 'Note not found' });
				return;
			}

			res.json({ success: true, data: note });
		} catch (error) {
			logger.error('[WebServer] Error updating note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to update note' });
		}
	};

	router.put('/notes/direct/:id', updateDirectHandler);

	// Delete note (using specific path to avoid conflicts)
	const deleteDirectHandler: RequestHandler<
		{ id: string },
		{ success: boolean; data?: unknown; error?: string; message?: string },
		Record<string, never>,
		Record<string, never>
	> = async (req, res) => {
		try {
			const deleted = await memoryService.deleteNote(req.params.id);
			if (!deleted) {
				res.status(404).json({ success: false, error: 'Note not found' });
				return;
			}

			res.json({ success: true, message: 'Note deleted successfully' });
		} catch (error) {
			logger.error('[WebServer] Error deleting note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to delete note' });
		}
	};

	router.delete('/notes/direct/:id', deleteDirectHandler);

	// Standard REST routes for notes (for test compatibility)
	const getHandler: RequestHandler<
		{ id: string },
		{ success: boolean; data?: unknown; error?: string },
		Record<string, never>,
		Record<string, never>
	> = async (req, res) => {
		try {
			const note = await memoryService.getNoteById(req.params.id);
			if (!note) {
				res.status(404).json({ success: false, error: 'Note not found' });
				return;
			}
			res.json({ success: true, data: note });
		} catch (error) {
			logger.error('[WebServer] Error getting note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to get note' });
		}
	};

	router.get('/notes/:id', getHandler);

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

			const updated = await memoryService.updateNote(req.params.id, request);
			if (!updated) {
				res.status(404).json({ success: false, error: 'Note not found' });
				return;
			}

			res.json({ success: true, data: updated });
		} catch (error) {
			logger.error('[WebServer] Error updating note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to update note' });
		}
	};

	router.put('/notes/:id', updateHandler);

	const deleteHandler: RequestHandler<
		{ id: string },
		{ success: boolean; data?: unknown; error?: string; message?: string },
		Record<string, never>,
		Record<string, never>
	> = async (req, res) => {
		try {
			const deleted = await memoryService.deleteNote(req.params.id);
			if (!deleted) {
				res.status(404).json({ success: false, error: 'Note not found' });
				return;
			}

			res.json({ success: true, message: 'Note deleted successfully' });
		} catch (error) {
			logger.error('[WebServer] Error deleting note:', error as Error);
			res.status(500).json({ success: false, error: 'Failed to delete note' });
		}
	};

	router.delete('/notes/:id', deleteHandler);

	return router;
}
