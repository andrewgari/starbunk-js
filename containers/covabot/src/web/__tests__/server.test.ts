import request from 'supertest';
import { WebServer } from '../server';
import { PersonalityNotesService } from '../../services/personalityNotesService';
import { BotConfigurationService } from '../../services/botConfigurationService';

// Mock the services
jest.mock('../../services/personalityNotesService');
jest.mock('../../services/botConfigurationService');
jest.mock('@starbunk/shared', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('WebServer', () => {
  let webServer: WebServer;
  let app: any;
  let mockNotesService: jest.Mocked<PersonalityNotesService>;
  let mockConfigService: jest.Mocked<BotConfigurationService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock service instances
    mockNotesService = {
      loadNotes: jest.fn(),
      getNotes: jest.fn(),
      getNoteById: jest.fn(),
      createNote: jest.fn(),
      updateNote: jest.fn(),
      deleteNote: jest.fn(),
      getStats: jest.fn(),
      getActiveNotesForLLM: jest.fn(),
    } as any;

    mockConfigService = {
      loadConfiguration: jest.fn(),
      getConfiguration: jest.fn(),
      updateConfiguration: jest.fn(),
      createConfiguration: jest.fn(),
      resetToDefaults: jest.fn(),
    } as any;

    // Mock getInstance methods
    (PersonalityNotesService.getInstance as jest.Mock).mockReturnValue(mockNotesService);
    (BotConfigurationService.getInstance as jest.Mock).mockReturnValue(mockConfigService);

    // Create web server instance
    webServer = new WebServer(7080, false);
    app = webServer.getApp();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        status: 'healthy',
        storage: 'file',
        timestamp: expect.any(String),
      });
    });

    it('should handle service errors gracefully', async () => {
      mockNotesService.loadNotes.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/health')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        status: 'unhealthy',
        error: 'Service error',
      });
    });
  });

  describe('Notes API', () => {
    const mockNote = {
      id: '1',
      content: 'Test note',
      category: 'instruction' as const,
      priority: 'high' as const,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should get all notes', async () => {
      mockNotesService.getNotes.mockResolvedValue([mockNote]);

      const response = await request(app)
        .get('/api/notes')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [mockNote],
      });
    });

    it('should get notes with filters', async () => {
      mockNotesService.getNotes.mockResolvedValue([mockNote]);

      await request(app)
        .get('/api/notes?category=instruction&priority=high&isActive=true&search=test')
        .expect(200);

      expect(mockNotesService.getNotes).toHaveBeenCalledWith({
        category: 'instruction',
        priority: 'high',
        isActive: true,
        search: 'test',
      });
    });

    it('should get note by ID', async () => {
      mockNotesService.getNoteById.mockResolvedValue(mockNote);

      const response = await request(app)
        .get('/api/notes/1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockNote,
      });
    });

    it('should return 404 for non-existent note', async () => {
      mockNotesService.getNoteById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/notes/999')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Note not found',
      });
    });

    it('should create a new note', async () => {
      const newNote = {
        content: 'New test note',
        category: 'personality',
        priority: 'medium',
      };

      mockNotesService.createNote.mockResolvedValue({ ...mockNote, ...newNote });

      const response = await request(app)
        .post('/api/notes')
        .send(newNote)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockNotesService.createNote).toHaveBeenCalledWith(newNote);
    });

    it('should validate required fields when creating note', async () => {
      const response = await request(app)
        .post('/api/notes')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Content is required',
      });
    });

    it('should update an existing note', async () => {
      const updateData = {
        content: 'Updated content',
        priority: 'low',
      };

      mockNotesService.updateNote.mockResolvedValue({ ...mockNote, ...updateData });

      const response = await request(app)
        .put('/api/notes/1')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockNotesService.updateNote).toHaveBeenCalledWith('1', updateData);
    });

    it('should delete a note', async () => {
      mockNotesService.deleteNote.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/notes/1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Note deleted successfully',
      });
    });
  });

  describe('Statistics API', () => {
    it('should get statistics', async () => {
      const mockStats = {
        totalNotes: 5,
        activeNotes: 3,
        inactiveNotes: 2,
        categoryCounts: { instruction: 2, personality: 3 },
        priorityCounts: { high: 1, medium: 2, low: 2 },
      };

      mockNotesService.getStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });
  });

  describe('LLM Context API', () => {
    it('should get LLM context', async () => {
      const mockContext = 'Test personality context for LLM';
      mockNotesService.getActiveNotesForLLM.mockResolvedValue(mockContext);

      const response = await request(app)
        .get('/api/context')
        .expect(200);

      expect(response.text).toBe(mockContext);
    });
  });

  describe('Configuration API', () => {
    const mockConfig = {
      id: '1',
      isEnabled: true,
      responseFrequency: 25,
      corePersonality: 'Test personality',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should get configuration', async () => {
      mockConfigService.getConfiguration.mockResolvedValue(mockConfig);

      const response = await request(app)
        .get('/api/configuration')
        .expect(200);

      expect(response.body).toEqual(mockConfig);
    });

    it('should update configuration', async () => {
      const updateData = { responseFrequency: 50 };
      mockConfigService.updateConfiguration.mockResolvedValue({ ...mockConfig, ...updateData });

      const response = await request(app)
        .put('/api/configuration')
        .send(updateData)
        .expect(200);

      expect(mockConfigService.updateConfiguration).toHaveBeenCalledWith(updateData);
    });

    it('should reset configuration to defaults', async () => {
      mockConfigService.resetToDefaults.mockResolvedValue(mockConfig);

      const response = await request(app)
        .post('/api/configuration/reset')
        .expect(200);

      expect(response.body).toEqual(mockConfig);
    });
  });

  describe('Import/Export API', () => {
    it('should export data', async () => {
      const mockNotes = [{ id: '1', content: 'Test' }];
      const mockConfig = { id: '1', isEnabled: true };

      mockNotesService.getNotes.mockResolvedValue(mockNotes as any);
      mockConfigService.getConfiguration.mockResolvedValue(mockConfig as any);

      const response = await request(app)
        .get('/api/export')
        .expect(200);

      expect(response.body).toEqual({
        configuration: mockConfig,
        notes: mockNotes,
        exportedAt: expect.any(String),
        version: '1.0',
      });
    });

    it('should import data', async () => {
      const importData = {
        configuration: { isEnabled: false },
        notes: [{ content: 'Imported note', category: 'instruction', priority: 'high' }],
      };

      mockNotesService.getNotes.mockResolvedValue([]);
      mockNotesService.deleteNote.mockResolvedValue(true);
      mockNotesService.createNote.mockResolvedValue({} as any);
      mockConfigService.updateConfiguration.mockResolvedValue({} as any);

      const response = await request(app)
        .post('/api/import')
        .send(importData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Data imported successfully',
      });
    });
  });

  describe('Static Files', () => {
    it('should serve the main webpage', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.type).toBe('text/html');
    });

    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Not found',
      });
    });
  });
});
