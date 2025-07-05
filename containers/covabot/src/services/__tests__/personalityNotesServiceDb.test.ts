import { PersonalityNotesServiceDb } from '../personalityNotesServiceDb';
import { PersonalityNote, CreateNoteRequest } from '../../types/personalityNote';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client');
jest.mock('@starbunk/shared', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

const mockPrisma = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  personalityNote: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  }
};

(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma as any);

describe('PersonalityNotesServiceDb', () => {
  let service: PersonalityNotesServiceDb;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a new instance for each test
    (PersonalityNotesServiceDb as any).instance = undefined;
    service = PersonalityNotesServiceDb.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = PersonalityNotesServiceDb.getInstance();
      const instance2 = PersonalityNotesServiceDb.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should connect to database', async () => {
      mockPrisma.$connect.mockResolvedValue(undefined);
      
      await service.initialize();
      
      expect(mockPrisma.$connect).toHaveBeenCalled();
    });

    it('should throw error if connection fails', async () => {
      const error = new Error('Connection failed');
      mockPrisma.$connect.mockRejectedValue(error);
      
      await expect(service.initialize()).rejects.toThrow('Connection failed');
    });
  });

  describe('createNote', () => {
    it('should create a new note with required fields', async () => {
      const request: CreateNoteRequest = {
        content: 'Always be friendly and helpful',
        category: 'personality',
        priority: 'high'
      };

      const mockDbNote = {
        id: 'test-id',
        content: request.content,
        category: request.category,
        priority: request.priority,
        isActive: true,
        tokens: ['Always', 'be', 'friendly', 'and', 'helpful'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.personalityNote.create.mockResolvedValue(mockDbNote);

      const note = await service.createNote(request);

      expect(mockPrisma.personalityNote.create).toHaveBeenCalledWith({
        data: {
          content: request.content,
          category: request.category,
          priority: request.priority,
          isActive: true,
          tokens: expect.any(Array)
        }
      });

      expect(note.id).toBe('test-id');
      expect(note.content).toBe(request.content);
      expect(note.category).toBe(request.category);
      expect(note.priority).toBe(request.priority);
      expect(note.isActive).toBe(true);
    });

    it('should default priority to medium', async () => {
      const request: CreateNoteRequest = {
        content: 'Test note',
        category: 'context'
      };

      const mockDbNote = {
        id: 'test-id',
        content: request.content,
        category: request.category,
        priority: 'medium',
        isActive: true,
        tokens: ['Test', 'note'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.personalityNote.create.mockResolvedValue(mockDbNote);

      const note = await service.createNote(request);

      expect(mockPrisma.personalityNote.create).toHaveBeenCalledWith({
        data: {
          content: request.content,
          category: request.category,
          priority: 'medium',
          isActive: true,
          tokens: expect.any(Array)
        }
      });

      expect(note.priority).toBe('medium');
    });
  });

  describe('getNotes', () => {
    it('should return all notes when no filters provided', async () => {
      const mockDbNotes = [
        {
          id: 'note-1',
          content: 'Test note 1',
          category: 'instruction',
          priority: 'high',
          isActive: true,
          tokens: ['Test', 'note', '1'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.personalityNote.findMany.mockResolvedValue(mockDbNotes);

      const notes = await service.getNotes();

      expect(mockPrisma.personalityNote.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [
          { priority: 'desc' },
          { updatedAt: 'desc' }
        ]
      });

      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe('note-1');
    });

    it('should filter by category', async () => {
      mockPrisma.personalityNote.findMany.mockResolvedValue([]);

      await service.getNotes({ category: 'personality' });

      expect(mockPrisma.personalityNote.findMany).toHaveBeenCalledWith({
        where: { category: 'personality' },
        orderBy: [
          { priority: 'desc' },
          { updatedAt: 'desc' }
        ]
      });
    });

    it('should filter by search term', async () => {
      mockPrisma.personalityNote.findMany.mockResolvedValue([]);

      await service.getNotes({ search: 'helpful' });

      expect(mockPrisma.personalityNote.findMany).toHaveBeenCalledWith({
        where: {
          content: {
            contains: 'helpful',
            mode: 'insensitive'
          }
        },
        orderBy: [
          { priority: 'desc' },
          { updatedAt: 'desc' }
        ]
      });
    });
  });

  describe('updateNote', () => {
    it('should update existing note', async () => {
      const mockUpdatedNote = {
        id: 'test-id',
        content: 'Updated content',
        category: 'personality',
        priority: 'high',
        isActive: true,
        tokens: ['Updated', 'content'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.personalityNote.update.mockResolvedValue(mockUpdatedNote);

      const result = await service.updateNote('test-id', {
        content: 'Updated content'
      });

      expect(mockPrisma.personalityNote.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          content: 'Updated content',
          tokens: expect.any(Array)
        }
      });

      expect(result?.content).toBe('Updated content');
    });

    it('should return null for non-existent note', async () => {
      const error = new Error('Record not found');
      (error as any).code = 'P2025';
      mockPrisma.personalityNote.update.mockRejectedValue(error);

      const result = await service.updateNote('non-existent', {
        content: 'New content'
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteNote', () => {
    it('should delete existing note', async () => {
      mockPrisma.personalityNote.delete.mockResolvedValue({});

      const result = await service.deleteNote('test-id');

      expect(mockPrisma.personalityNote.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      });

      expect(result).toBe(true);
    });

    it('should return false for non-existent note', async () => {
      const error = new Error('Record not found');
      (error as any).code = 'P2025';
      mockPrisma.personalityNote.delete.mockRejectedValue(error);

      const result = await service.deleteNote('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getActiveNotesForLLM', () => {
    it('should return formatted context for LLM', async () => {
      const mockActiveNotes = [
        {
          id: 'note-1',
          content: 'Always be helpful and kind',
          category: 'personality',
          priority: 'high',
          isActive: true,
          tokens: [],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'note-2',
          content: 'Use emojis occasionally',
          category: 'behavior',
          priority: 'medium',
          isActive: true,
          tokens: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Mock the getNotes call within getActiveNotesForLLM
      jest.spyOn(service, 'getNotes').mockResolvedValue(mockActiveNotes as PersonalityNote[]);

      const context = await service.getActiveNotesForLLM();

      expect(context).toContain('Current personality instructions and context:');
      expect(context).toContain('Personality:');
      expect(context).toContain('Behavior:');
      expect(context).toContain('[IMPORTANT] Always be helpful and kind');
      expect(context).toContain('Use emojis occasionally');
    });

    it('should return empty string when no active notes', async () => {
      jest.spyOn(service, 'getNotes').mockResolvedValue([]);

      const context = await service.getActiveNotesForLLM();

      expect(context).toBe('');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      mockPrisma.personalityNote.count
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(3); // active

      mockPrisma.personalityNote.groupBy
        .mockResolvedValueOnce([ // by category
          { category: 'instruction', _count: { category: 2 } },
          { category: 'personality', _count: { category: 3 } }
        ])
        .mockResolvedValueOnce([ // by priority
          { priority: 'high', _count: { priority: 1 } },
          { priority: 'medium', _count: { priority: 3 } },
          { priority: 'low', _count: { priority: 1 } }
        ]);

      const stats = await service.getStats();

      expect(stats.total).toBe(5);
      expect(stats.active).toBe(3);
      expect(stats.byCategory.instruction).toBe(2);
      expect(stats.byCategory.personality).toBe(3);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.medium).toBe(3);
      expect(stats.byPriority.low).toBe(1);
    });
  });
});
