import express from 'express';
import cors from 'cors';
import path from 'path';
import { logger } from '@starbunk/shared';
import { PersonalityNotesService } from '../services/personalityNotesService';
import { PersonalityNotesServiceDb } from '../services/personalityNotesServiceDb';
import { CreateNoteRequest, UpdateNoteRequest, NoteSearchFilters } from '../types/personalityNote';
import { apiKeyAuth, requireAdmin, rateLimit, requestLogger } from './middleware/auth';

export class WebServer {
  private app: express.Application;
  private port: number;
  private notesService: PersonalityNotesService | PersonalityNotesServiceDb;
  private useDatabase: boolean;

  constructor(port: number = 3001, useDatabase: boolean = false) {
    this.app = express();
    this.port = port;
    this.useDatabase = useDatabase;

    // Choose service based on configuration
    if (useDatabase) {
      this.notesService = PersonalityNotesServiceDb.getInstance();
    } else {
      this.notesService = PersonalityNotesService.getInstance();
    }

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS configuration
    this.app.use(cors({
      origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    this.app.use('/api', rateLimit(100, 60000)); // 100 requests per minute

    // Request logging
    this.app.use(requestLogger);

    // Static files (for the frontend)
    const staticPath = path.join(__dirname, '..', 'web', 'static');
    this.app.use(express.static(staticPath));
  }

  private setupRoutes(): void {
    // Serve the main webpage
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'web', 'static', 'index.html'));
    });

    // API Routes
    const apiRouter = express.Router();

    // Health check endpoint
    apiRouter.get('/health', async (req, res) => {
      try {
        // Test database connection if using database service
        if (this.useDatabase && 'initialize' in this.notesService) {
          await (this.notesService as PersonalityNotesServiceDb).initialize();
        }

        res.json({
          success: true,
          status: 'healthy',
          storage: this.useDatabase ? 'database' : 'file',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('[WebServer] Health check failed:', error);
        res.status(500).json({
          success: false,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Get all notes with optional filtering
    apiRouter.get('/notes', async (req, res) => {
      try {
        const filters: NoteSearchFilters = {
          category: req.query.category as any,
          priority: req.query.priority as any,
          isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
          search: req.query.search as string
        };

        const notes = await this.notesService.getNotes(filters);
        res.json({ success: true, data: notes });
      } catch (error) {
        logger.error('[WebServer] Error getting notes:', error);
        res.status(500).json({ success: false, error: 'Failed to get notes' });
      }
    });

    // Get note by ID
    apiRouter.get('/notes/:id', async (req, res) => {
      try {
        const note = await this.notesService.getNoteById(req.params.id);
        if (!note) {
          return res.status(404).json({ success: false, error: 'Note not found' });
        }
        res.json({ success: true, data: note });
      } catch (error) {
        logger.error('[WebServer] Error getting note:', error);
        res.status(500).json({ success: false, error: 'Failed to get note' });
      }
    });

    // Create new note
    apiRouter.post('/notes', async (req, res) => {
      try {
        const request: CreateNoteRequest = {
          content: req.body.content,
          category: req.body.category,
          priority: req.body.priority
        };

        // Validation
        if (!request.content || !request.content.trim()) {
          return res.status(400).json({ success: false, error: 'Content is required' });
        }

        if (!request.category || !['instruction', 'personality', 'behavior', 'knowledge', 'context'].includes(request.category)) {
          return res.status(400).json({ success: false, error: 'Valid category is required' });
        }

        const note = await this.notesService.createNote(request);
        res.status(201).json({ success: true, data: note });
      } catch (error) {
        logger.error('[WebServer] Error creating note:', error);
        res.status(500).json({ success: false, error: 'Failed to create note' });
      }
    });

    // Update note
    apiRouter.put('/notes/:id', async (req, res) => {
      try {
        const request: UpdateNoteRequest = {
          content: req.body.content,
          category: req.body.category,
          priority: req.body.priority,
          isActive: req.body.isActive
        };

        const note = await this.notesService.updateNote(req.params.id, request);
        if (!note) {
          return res.status(404).json({ success: false, error: 'Note not found' });
        }

        res.json({ success: true, data: note });
      } catch (error) {
        logger.error('[WebServer] Error updating note:', error);
        res.status(500).json({ success: false, error: 'Failed to update note' });
      }
    });

    // Delete note
    apiRouter.delete('/notes/:id', async (req, res) => {
      try {
        const deleted = await this.notesService.deleteNote(req.params.id);
        if (!deleted) {
          return res.status(404).json({ success: false, error: 'Note not found' });
        }

        res.json({ success: true, message: 'Note deleted successfully' });
      } catch (error) {
        logger.error('[WebServer] Error deleting note:', error);
        res.status(500).json({ success: false, error: 'Failed to delete note' });
      }
    });

    // Get statistics
    apiRouter.get('/stats', async (req, res) => {
      try {
        const stats = await this.notesService.getStats();
        res.json({ success: true, data: stats });
      } catch (error) {
        logger.error('[WebServer] Error getting stats:', error);
        res.status(500).json({ success: false, error: 'Failed to get stats' });
      }
    });

    // Get active notes for LLM context
    apiRouter.get('/context', async (req, res) => {
      try {
        const context = await this.notesService.getActiveNotesForLLM();
        res.json({ success: true, data: { context } });
      } catch (error) {
        logger.error('[WebServer] Error getting context:', error);
        res.status(500).json({ success: false, error: 'Failed to get context' });
      }
    });

    // Mount API routes
    this.app.use('/api', apiRouter);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ success: false, error: 'Not found' });
    });

    // Error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('[WebServer] Unhandled error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    });
  }

  async start(): Promise<void> {
    try {
      // Initialize the notes service
      if (this.useDatabase && 'initialize' in this.notesService) {
        await (this.notesService as PersonalityNotesServiceDb).initialize();
        logger.info('[WebServer] Database service initialized');
      } else {
        await (this.notesService as PersonalityNotesService).loadNotes();
        logger.info('[WebServer] File-based service initialized');
      }

      // Start the server
      return new Promise((resolve) => {
        this.app.listen(this.port, () => {
          const storageType = this.useDatabase ? 'Database' : 'File';
          logger.info(`[WebServer] CovaBot personality notes manager (${storageType}) running on http://localhost:${this.port}`);
          resolve();
        });
      });
    } catch (error) {
      logger.error('[WebServer] Failed to start server:', error);
      throw error;
    }
  }

  getApp(): express.Application {
    return this.app;
  }
}