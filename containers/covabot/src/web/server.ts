import express from 'express';
import cors from 'cors';
import path from 'path';
import { logger } from '@starbunk/shared';
import { PersonalityNotesService } from '../services/personalityNotesService';
import { PersonalityNotesServiceDb } from '../services/personalityNotesServiceDb';
import { BotConfigurationService } from '../services/botConfigurationService';
import { CreateNoteRequest, UpdateNoteRequest, NoteSearchFilters } from '../types/personalityNote';
import { CreateConfigurationRequest, UpdateConfigurationRequest } from '../types/botConfiguration';
import { rateLimit, requestLogger } from './middleware/auth';
import { CovaBot } from '../cova-bot/covaBot';
import { covaTrigger, covaDirectMentionTrigger, covaStatsCommandTrigger } from '../cova-bot/triggers';

export class WebServer {
  private app: express.Application;
  private port: number;
  private notesService: PersonalityNotesService | PersonalityNotesServiceDb;
  private configService: BotConfigurationService;
  private useDatabase: boolean;
  private covaBot: CovaBot;

  constructor(port: number = 7080, useDatabase: boolean = false) {
    this.app = express();
    this.port = port;
    this.useDatabase = useDatabase;

    // Choose service based on configuration
    if (useDatabase) {
      this.notesService = PersonalityNotesServiceDb.getInstance();
    } else {
      this.notesService = PersonalityNotesService.getInstance();
    }

    // Initialize configuration service
    this.configService = BotConfigurationService.getInstance();

    // Initialize CovaBot for web testing
    this.covaBot = new CovaBot({
      name: 'CovaBot',
      description: 'LLM-powered CovaBot for web testing',
      defaultIdentity: {
        botName: 'Cova',
        avatarUrl: '/static/cova-avatar.png', // Static avatar for web testing
      },
      triggers: [
        covaStatsCommandTrigger,
        covaDirectMentionTrigger,
        covaTrigger,
      ],
    });

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS configuration
    const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:7080',
      'http://127.0.0.1:7080'
    ];
    this.app.use(cors({
      origin: corsOrigins,
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
          category: req.query.category as NoteSearchFilters['category'],
          priority: req.query.priority as NoteSearchFilters['priority'],
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
        res.send(context);
      } catch (error) {
        logger.error('[WebServer] Error getting context:', error);
        res.status(500).json({ success: false, error: 'Failed to get context' });
      }
    });

    // Configuration endpoints
    // Get bot configuration
    apiRouter.get('/configuration', async (req, res) => {
      try {
        const config = await this.configService.getConfiguration();
        res.json(config);
      } catch (error) {
        logger.error('[WebServer] Error getting configuration:', error);
        res.status(500).json({ success: false, error: 'Failed to get configuration' });
      }
    });

    // Update bot configuration
    apiRouter.put('/configuration', async (req, res) => {
      try {
        const updates: UpdateConfigurationRequest = req.body;
        const config = await this.configService.updateConfiguration(updates);
        res.json(config);
      } catch (error) {
        logger.error('[WebServer] Error updating configuration:', error);
        res.status(500).json({ success: false, error: 'Failed to update configuration' });
      }
    });

    // Create new configuration
    apiRouter.post('/configuration', async (req, res) => {
      try {
        const request: CreateConfigurationRequest = req.body;
        const config = await this.configService.createConfiguration(request);
        res.json(config);
      } catch (error) {
        logger.error('[WebServer] Error creating configuration:', error);
        res.status(500).json({ success: false, error: 'Failed to create configuration' });
      }
    });

    // Reset configuration to defaults
    apiRouter.post('/configuration/reset', async (req, res) => {
      try {
        const config = await this.configService.resetToDefaults();
        res.json(config);
      } catch (error) {
        logger.error('[WebServer] Error resetting configuration:', error);
        res.status(500).json({ success: false, error: 'Failed to reset configuration' });
      }
    });

    // Export all data
    apiRouter.get('/export', async (req, res) => {
      try {
        const notes = await this.notesService.getNotes();
        const config = await this.configService.getConfiguration();

        const exportData = {
          configuration: config,
          notes: notes,
          exportedAt: new Date().toISOString(),
          version: '1.0'
        };

        res.json(exportData);
      } catch (error) {
        logger.error('[WebServer] Error exporting data:', error);
        res.status(500).json({ success: false, error: 'Failed to export data' });
      }
    });

    // Import data
    apiRouter.post('/import', async (req, res) => {
      try {
        const importData = req.body;

        // Import configuration if present
        if (importData.configuration) {
          await this.configService.updateConfiguration(importData.configuration);
        }

        // Import notes if present
        if (importData.notes && Array.isArray(importData.notes)) {
          // Clear existing notes and import new ones
          const existingNotes = await this.notesService.getNotes();
          for (const note of existingNotes) {
            await this.notesService.deleteNote(note.id);
          }

          for (const noteData of importData.notes) {
            await this.notesService.createNote({
              content: noteData.content,
              category: noteData.category,
              priority: noteData.priority
            });
          }
        }

        res.json({ success: true, message: 'Data imported successfully' });
      } catch (error) {
        logger.error('[WebServer] Error importing data:', error);
        res.status(500).json({ success: false, error: 'Failed to import data' });
      }
    });

    // Get statistics
    apiRouter.get('/stats', async (req, res) => {
      try {
        const notes = await this.notesService.getNotes();
        const config = await this.configService.getConfiguration();

        const stats = {
          totalNotes: notes.length,
          activeNotes: notes.filter(note => note.isActive).length,
          inactiveNotes: notes.filter(note => !note.isActive).length,
          categoryCounts: notes.reduce((acc, note) => {
            acc[note.category] = (acc[note.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          priorityCounts: notes.reduce((acc, note) => {
            acc[note.priority] = (acc[note.priority] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          botEnabled: config.isEnabled,
          responseFrequency: config.responseFrequency,
          lastUpdated: new Date().toISOString()
        };

        res.json(stats);
      } catch (error) {
        logger.error('[WebServer] Error getting stats:', error);
        res.status(500).json({ success: false, error: 'Failed to get stats' });
      }
    });

    // Chat endpoint for conversation testing
    apiRouter.post('/chat', async (req, res) => {
      try {
        const { message } = req.body;

        // Validation
        if (!message || typeof message !== 'string' || !message.trim()) {
          return res.status(400).json({
            success: false,
            error: 'Message is required and must be a non-empty string'
          });
        }

        // Process message through CovaBot
        const response = await this.covaBot.processWebMessage(message.trim());

        if (response) {
          res.json({
            success: true,
            data: {
              userMessage: message.trim(),
              botResponse: response,
              timestamp: new Date().toISOString()
            }
          });
        } else {
          // Bot chose not to respond (due to triggers, rate limiting, etc.)
          res.json({
            success: true,
            data: {
              userMessage: message.trim(),
              botResponse: null,
              timestamp: new Date().toISOString(),
              reason: 'Bot chose not to respond'
            }
          });
        }
      } catch (error) {
        logger.error('[WebServer] Error in chat endpoint:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to process chat message'
        });
      }
    });

    // Mount API routes
    this.app.use('/api', apiRouter);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ success: false, error: 'Not found' });
    });

    // Error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
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

      // Initialize the configuration service
      await this.configService.loadConfiguration();
      logger.info('[WebServer] Configuration service initialized');

      // Start the server
      return new Promise((resolve) => {
        this.app.listen(this.port, () => {
          const storageType = this.useDatabase ? 'Database' : 'File';
          logger.info(`[WebServer] CovaBot personality management interface (${storageType}) running on http://localhost:${this.port}`);
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