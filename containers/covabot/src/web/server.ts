/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { logger } from '@starbunk/shared';
import { QdrantMemoryService } from '../services/qdrantMemoryService';
import { BotConfigurationService } from '../services/botConfigurationService';
import { CreatePersonalityNoteRequest, UpdatePersonalityNoteRequest, MemorySearchFilters, PersonalityCategory, Priority } from '../types/memoryTypes';
import { CreateConfigurationRequest, UpdateConfigurationRequest } from '../types/botConfiguration';
import { rateLimit, requestLogger } from './middleware/auth';
import { CovaBot } from '../cova-bot/covaBot';
import { covaTrigger, covaDirectMentionTrigger, covaStatsCommandTrigger } from '../cova-bot/triggers';
import { ProductionMonitoringService } from '../services/productionMonitoringService';
import { LogAggregationService } from '../services/logAggregationService';

export class WebServer {
  protected app: express.Application;
  private port: number;
  private memoryService: QdrantMemoryService;
  private configService: BotConfigurationService;
  private useQdrant: boolean;
  private covaBot: CovaBot;
  private monitoringService: ProductionMonitoringService;
  private logService: LogAggregationService;

  constructor(port: number = 7080, useQdrant: boolean = true) {
    this.app = express();
    this.port = port;
    this.useQdrant = useQdrant;

    // Use unified Qdrant memory service
    this.memoryService = QdrantMemoryService.getInstance();

    // Initialize configuration service
    this.configService = BotConfigurationService.getInstance();

    // Initialize monitoring services
    this.monitoringService = ProductionMonitoringService.getInstance();
    this.logService = LogAggregationService.getInstance();

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

  protected setupMiddleware(): void {
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
    this.app.use('/api', rateLimit(100, 60000) as express.RequestHandler); // 100 requests per minute

    // Request logging
    this.app.use(requestLogger);

    // Static files (for the frontend)
    const staticPath = path.join(__dirname, '..', 'web', 'static');
    this.app.use(express.static(staticPath));
  }

  protected setupRoutes(): void {
    // Serve the main webpage
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'web', 'static', 'index.html'));
    });

    // API Routes
    const apiRouter = express.Router();

    // Health check endpoint
    apiRouter.get('/health', async (req, res) => {
      try {
        const healthResult = await this.memoryService.healthCheck();

        res.json({
          success: healthResult.status === 'healthy',
          status: healthResult.status,
          storage: 'qdrant',
          timestamp: new Date().toISOString(),
          details: healthResult
        });
      } catch (error) {
        logger.error('[WebServer] Health check failed:', error as Error);
        res.status(500).json({
          success: false,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Add personality notes routes for test compatibility FIRST (before main notes routes)
    this.setupPersonalityNotesRoutes(apiRouter);

    // Get all notes with optional filtering
    apiRouter.get('/notes', async (req, res) => {
      try {
        const filters: MemorySearchFilters = {
          category: req.query.category as 'instruction' | 'personality' | 'behavior' | 'knowledge' | 'context' | undefined,
          priority: req.query.priority as 'high' | 'medium' | 'low' | undefined,
          isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
          search: req.query.search as string,
          limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
        };

        const notes = await this.memoryService.getNotes(filters);
        res.json({ success: true, data: notes });
      } catch (error) {
        logger.error('[WebServer] Error getting notes:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to get notes' });
      }
    });

    // Get note by ID (using specific path to avoid conflicts)
    apiRouter.get('/notes/direct/:id', async (req: any, res: any) => {
      try {
        const note = await this.memoryService.getNoteById(req.params.id);
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
    apiRouter.post('/notes', async (req: any, res: any) => {
      try {
        const request: CreatePersonalityNoteRequest = {
          content: req.body.content,
          category: req.body.category,
          priority: req.body.priority
        };

        // Validation
        if (!request.content || !request.content.trim()) {
          return res.status(400).json({ success: false, error: 'Content is required' });
        }

        if (!request.category || !['instruction', 'personality', 'behavior', 'knowledge', 'context'].includes(request.category)) {
          return res.status(400).json({ success: false, error: 'Invalid category' });
        }

        const note = await this.memoryService.createNote(request);
        res.status(201).json({ success: true, data: note });
      } catch (error) {
        logger.error('[WebServer] Error creating note:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to create note' });
      }
    });

    // Update note (using specific path to avoid conflicts)
    apiRouter.put('/notes/direct/:id', async (req: any, res: any) => {
      try {
        const request: UpdatePersonalityNoteRequest = {
          content: req.body.content,
          category: req.body.category,
          priority: req.body.priority,
          isActive: req.body.isActive
        };

        const note = await this.memoryService.updateNote(req.params.id, request);
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
    apiRouter.delete('/notes/direct/:id', async (req: any, res: any) => {
      try {
        const deleted = await this.memoryService.deleteNote(req.params.id);
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
    apiRouter.get('/notes/:id', async (req: any, res: any) => {
      try {
        const note = await this.memoryService.getNoteById(req.params.id);
        if (!note) {
          return res.status(404).json({ success: false, error: 'Note not found' });
        }
        res.json({ success: true, data: note });
      } catch (error) {
        logger.error('[WebServer] Error getting note:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to get note' });
      }
    });

    apiRouter.put('/notes/:id', async (req: any, res: any) => {
      try {
        const request: UpdatePersonalityNoteRequest = {
          content: req.body.content,
          category: req.body.category,
          priority: req.body.priority,
          isActive: req.body.isActive,
        };

        const updated = await this.memoryService.updateNote(req.params.id, request);
        if (!updated) {
          return res.status(404).json({ success: false, error: 'Note not found' });
        }

        res.json({ success: true, data: updated });
      } catch (error) {
        logger.error('[WebServer] Error updating note:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to update note' });
      }
    });

    apiRouter.delete('/notes/:id', async (req: any, res: any) => {
      try {
        const deleted = await this.memoryService.deleteNote(req.params.id);
        if (!deleted) {
          return res.status(404).json({ success: false, error: 'Note not found' });
        }

        res.json({ success: true, message: 'Note deleted successfully' });
      } catch (error) {
        logger.error('[WebServer] Error deleting note:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to delete note' });
      }
    });

    // Get statistics
    apiRouter.get('/stats', async (req, res) => {
      try {
        const stats = await this.memoryService.getStats();
        res.json({ success: true, data: stats });
      } catch (error) {
        logger.error('[WebServer] Error getting stats:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to get stats' });
      }
    });

    // Get active notes for LLM context
    apiRouter.get('/context', async (req, res) => {
      try {
        const context = await this.memoryService.getActiveNotesForLLM();
        res.send(context);
      } catch (error) {
        logger.error('[WebServer] Error getting context:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to get context' });
      }
    });

    // Semantic search endpoint
    apiRouter.post('/search', async (req: any, res: any) => {
      try {
        const { query, filters = {} } = req.body;

        if (!query || typeof query !== 'string') {
          return res.status(400).json({ success: false, error: 'Query is required' });
        }

        const results = await this.memoryService.searchMemory(query, filters);
        res.json({ success: true, data: results });
      } catch (error) {
        logger.error('[WebServer] Error in semantic search:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to search memory' });
      }
    });

    // Enhanced context generation
    apiRouter.post('/context/enhanced', async (req: any, res: any) => {
      try {
        const { message, userId, channelId, options = {} } = req.body;

        if (!message || !userId || !channelId) {
          return res.status(400).json({
            success: false,
            error: 'Message, userId, and channelId are required'
          });
        }

        const context = await this.memoryService.generateEnhancedContext(
          message,
          userId,
          channelId,
          options
        );
        res.json({ success: true, data: context });
      } catch (error) {
        logger.error('[WebServer] Error generating enhanced context:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to generate enhanced context' });
      }
    });

    // Configuration endpoints
    // Get bot configuration
    apiRouter.get('/configuration', async (req, res) => {
      try {
        const config = await this.configService.getConfiguration();
        res.json(config);
      } catch (error) {
        logger.error('[WebServer] Error getting configuration:', error as Error);
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
        logger.error('[WebServer] Error updating configuration:', error as Error);
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
        logger.error('[WebServer] Error creating configuration:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to create configuration' });
      }
    });

    // Reset configuration to defaults
    apiRouter.post('/configuration/reset', async (req, res) => {
      try {
        const config = await this.configService.resetToDefaults();
        res.json(config);
      } catch (error) {
        logger.error('[WebServer] Error resetting configuration:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to reset configuration' });
      }
    });

    // Bot configuration routes (for test compatibility)
    apiRouter.get('/config/bot', async (req, res) => {
      try {
        const config = await this.configService.getConfiguration();
        res.json({ success: true, data: config });
      } catch (error) {
        logger.error('[WebServer] Error getting bot configuration:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to get bot configuration' });
      }
    });

    apiRouter.put('/config/bot', async (req: any, res: any) => {
      try {
        const updates: UpdateConfigurationRequest = req.body;

        // Validate configuration - use correct property names
        if (updates.responseFrequency !== undefined && (updates.responseFrequency < 0 || updates.responseFrequency > 100)) {
          return res.status(400).json({ success: false, error: 'Response rate must be between 0 and 100' });
        }

        if (updates.isEnabled !== undefined && typeof updates.isEnabled !== 'boolean') {
          return res.status(400).json({ success: false, error: 'isEnabled must be a boolean' });
        }

        const config = await this.configService.updateConfiguration(updates);
        res.json({ success: true, data: config });
      } catch (error) {
        logger.error('[WebServer] Error updating bot configuration:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to update bot configuration' });
      }
    });

    // Export all data
    apiRouter.get('/export', async (req, res) => {
      try {
        const notes = await this.memoryService.getNotes();
        const config = await this.configService.getConfiguration();

        const exportData = {
          configuration: config,
          notes: notes,
          exportedAt: new Date().toISOString(),
          version: '1.0'
        };

        res.json(exportData);
      } catch (error) {
        logger.error('[WebServer] Error exporting data:', error as Error);
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
          const existingNotes = await this.memoryService.getNotes();
          for (const note of existingNotes) {
            await this.memoryService.deleteNote(note.id);
          }

          for (const noteData of importData.notes) {
            await this.memoryService.createNote({
              content: noteData.content,
              category: noteData.category,
              priority: noteData.priority
            });
          }
        }

        res.json({ success: true, message: 'Data imported successfully' });
      } catch (error) {
        logger.error('[WebServer] Error importing data:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to import data' });
      }
    });

    // Get statistics
    apiRouter.get('/stats', async (req, res) => {
      try {
        const notes = await this.memoryService.getNotes();
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
        logger.error('[WebServer] Error getting stats:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to get stats' });
      }
    });

    // Chat endpoint for conversation testing
    apiRouter.post('/chat', async (req: any, res: any) => {
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
        logger.error('[WebServer] Error in chat endpoint:', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to process message'
        });
      }
    });

    // Production Monitoring Routes
    this.setupMonitoringRoutes(apiRouter);

    // Mount API routes
    this.app.use('/api', apiRouter);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ success: false, error: 'Not found' });
    });

    // Error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('[WebServer] Unhandled error:', error as Error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    });
  }

  /**
   * Setup personality notes routes for test compatibility
   * These routes delegate to the main notes API but use the expected test paths
   */
  protected setupPersonalityNotesRoutes(apiRouter: express.Router): void {
    const personalityRouter = express.Router();

    // Search personality notes (must be before /:id route)
    personalityRouter.get('/search', async (req: any, res: any) => {
      try {
        const query = req.query.query as string;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        const category = req.query.category as PersonalityCategory;
        const priority = req.query.priority as Priority;

        // Validate search parameters
        if (limit < 1 || limit > 100) {
          return res.status(400).json({ success: false, error: 'Limit must be between 1 and 100' });
        }

        let results;
        if (query) {
          // Use semantic search with filters
          const filters = category || priority ? { category, priority } : undefined;
          results = await (this.memoryService as any).searchPersonalityNotes(query, filters, limit);
        } else {
          // Get all with filters
          results = await (this.memoryService as any).searchPersonalityNotes('', undefined, limit);
        }

        res.json({ success: true, data: results });
      } catch (error) {
        logger.error('[WebServer] Error searching personality notes:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to search personality notes' });
      }
    });

    // Export/Import routes (must be before /:id route)
    personalityRouter.get('/export', async (req: any, res: any) => {
      try {
        const notes = await (this.memoryService as any).searchPersonalityNotes('', undefined, 1000);
        const exportData = {
          notes: notes,
          exportDate: new Date().toISOString(),
          version: '1.0'
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

        const importedNotes = [];
        for (const noteData of notes) {
          const note = await (this.memoryService as any).createPersonalityNote(
            noteData.content,
            {
              category: noteData.category || 'knowledge',
              priority: noteData.priority || 'medium'
            }
          );
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

        const createdNotes = [];
        for (const noteData of notes) {
          const note = await (this.memoryService as any).createPersonalityNote(
            noteData.content,
            {
              category: noteData.category || 'knowledge',
              priority: noteData.priority || 'medium'
            }
          );
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

        const results = [];
        for (const id of ids) {
          const deleted = await (this.memoryService as any).deletePersonalityNote(id);
          results.push({ id, deleted });
        }

        res.json({ success: true, data: results });
      } catch (error) {
        logger.error('[WebServer] Error in bulk delete:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to delete notes in bulk' });
      }
    });

    // Get all personality notes
    personalityRouter.get('/', async (req, res) => {
      try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const notes = await (this.memoryService as any).searchPersonalityNotes('', undefined, limit);
        res.json({ success: true, data: notes });
      } catch (error) {
        logger.error('[WebServer] Error getting personality notes:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to get personality notes' });
      }
    });

    // Get personality note by ID
    personalityRouter.get('/:id', async (req: any, res: any) => {
      try {
        const note = await (this.memoryService as any).getPersonalityNote(req.params.id);
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
          priority: req.body.priority || 'medium'
        };

        // Validation
        if (!request.content || !request.content.trim()) {
          return res.status(400).json({ success: false, error: 'Content is required' });
        }

        if (!request.category || !['instruction', 'personality', 'behavior', 'knowledge', 'context'].includes(request.category)) {
          return res.status(400).json({ success: false, error: 'Invalid category' });
        }

        const note = await (this.memoryService as any).createPersonalityNote(request.content, { category: request.category, priority: request.priority });
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
          isActive: req.body.isActive
        };

        // Validation for updates
        if (request.content !== undefined && (!request.content || !request.content.trim())) {
          return res.status(400).json({ success: false, error: 'Content cannot be empty' });
        }

        if (request.category !== undefined && !['instruction', 'personality', 'behavior', 'knowledge', 'context'].includes(request.category)) {
          return res.status(400).json({ success: false, error: 'Invalid category' });
        }

        const note = await (this.memoryService as any).updatePersonalityNote(req.params.id, request);
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
        const deleted = await (this.memoryService as any).deletePersonalityNote(req.params.id);
        if (!deleted) {
          return res.status(404).json({ success: false, error: 'Personality note not found' });
        }

        res.json({ success: true, message: 'Personality note deleted successfully' });
      } catch (error) {
        logger.error('[WebServer] Error deleting personality note:', error as Error);
        res.status(500).json({ success: false, error: 'Failed to delete personality note' });
      }
    });





    // Mount personality notes routes
    apiRouter.use('/memory/personality-notes', personalityRouter);
  }

  /**
   * Get the Express app instance for testing
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Setup production monitoring routes
   */
  private setupMonitoringRoutes(apiRouter: express.Router): void {
    // Production health overview
    apiRouter.get('/monitoring/health', async (req, res) => {
      try {
        const metrics = this.monitoringService.getMetrics();
        res.json({
          success: true,
          data: metrics
        });
      } catch (error) {
        logger.error('[WebServer] Error getting production metrics:', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get production metrics'
        });
      }
    });

    // Force health check
    apiRouter.post('/monitoring/health/check', async (req, res) => {
      try {
        const metrics = await this.monitoringService.forceHealthCheck();
        res.json({
          success: true,
          data: metrics
        });
      } catch (error) {
        logger.error('[WebServer] Error forcing health check:', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to perform health check'
        });
      }
    });

    // Get container-specific health
    apiRouter.get('/monitoring/containers/:name', async (req: any, res: any) => {
      try {
        const containerHealth = this.monitoringService.getContainerHealth(req.params.name);
        if (!containerHealth) {
          return res.status(404).json({
            success: false,
            error: 'Container not found'
          });
        }
        res.json({
          success: true,
          data: containerHealth
        });
      } catch (error) {
        logger.error('[WebServer] Error getting container health:', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get container health'
        });
      }
    });

    // Get logs with filtering
    apiRouter.get('/monitoring/logs', (req, res) => {
      try {
        const filter = {
          containers: req.query.containers ? (req.query.containers as string).split(',') : undefined,
          levels: req.query.levels ? (req.query.levels as string).split(',') : undefined,
          since: req.query.since ? new Date(req.query.since as string) : undefined,
          until: req.query.until ? new Date(req.query.until as string) : undefined,
          search: req.query.search as string,
          limit: req.query.limit ? parseInt(req.query.limit as string) : 1000
        };

        const logs = this.logService.getLogs(filter);
        res.json({
          success: true,
          data: logs
        });
      } catch (error) {
        logger.error('[WebServer] Error getting logs:', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get logs'
        });
      }
    });

    // Get log statistics
    apiRouter.get('/monitoring/logs/stats', (req, res) => {
      try {
        const stats = this.logService.getLogStats();
        res.json({
          success: true,
          data: stats
        });
      } catch (error) {
        logger.error('[WebServer] Error getting log stats:', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get log statistics'
        });
      }
    });

    // Get all alerts
    apiRouter.get('/monitoring/alerts', (req, res) => {
      try {
        const alerts = this.monitoringService.getAllAlerts();
        res.json({
          success: true,
          data: alerts
        });
      } catch (error) {
        logger.error('[WebServer] Error getting alerts:', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get alerts'
        });
      }
    });

    // Resolve alert
    apiRouter.post('/monitoring/alerts/:id/resolve', async (req: any, res: any) => {
      try {
        const resolved = this.monitoringService.resolveAlert(req.params.id);
        if (!resolved) {
          return res.status(404).json({
            success: false,
            error: 'Alert not found or already resolved'
          });
        }
        res.json({
          success: true,
          message: 'Alert resolved'
        });
      } catch (error) {
        logger.error('[WebServer] Error resolving alert:', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to resolve alert'
        });
      }
    });
  }

  async start(): Promise<void> {
    try {
      // Initialize the memory service
      await this.memoryService.initialize();
      logger.info('[WebServer] Qdrant memory service initialized');

      // Initialize the configuration service
      await this.configService.loadConfiguration();
      logger.info('[WebServer] Configuration service initialized');

      // Start production monitoring
      this.monitoringService.startMonitoring();
      logger.info('[WebServer] Production monitoring service started');

      // Start log aggregation
      this.logService.startLogCollection();
      logger.info('[WebServer] Log aggregation service started');

      // Start the server
      return new Promise((resolve) => {
        const server = this.app.listen(this.port, () => {
          logger.info(`[WebServer] CovaBot memory management interface (Qdrant) running on http://localhost:${this.port}`);

          // Setup WebSocket server for log streaming
          this.logService.setupWebSocketServer(server);
          logger.info('[WebServer] WebSocket server setup for real-time log streaming');

          resolve();
        });
      });
    } catch (error) {
      logger.error('[WebServer] Failed to start server:', error as Error);
      throw error;
    }
  }
}