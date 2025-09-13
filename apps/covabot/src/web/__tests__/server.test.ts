import request from 'supertest';
import { WebServer } from '../server';
import { QdrantMemoryService } from '../../services/qdrantMemoryService';
import { BotConfigurationService } from '../../services/botConfigurationService';

// Mock the services
jest.mock('../../services/qdrantMemoryService');
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
	let mockMemoryService: jest.Mocked<QdrantMemoryService>;
	let mockConfigService: jest.Mocked<BotConfigurationService>;

	beforeEach(() => {
		// Reset mocks
		jest.clearAllMocks();

		// Mock service instances
		mockMemoryService = {
			initialize: jest.fn(),
			getNotes: jest.fn(),
			getNoteById: jest.fn(),
			createNote: jest.fn(),
			updateNote: jest.fn(),
			deleteNote: jest.fn(),
			getStats: jest.fn(),
			getActiveNotesForLLM: jest.fn(),
			healthCheck: jest.fn(),
			searchMemory: jest.fn(),
			generateEnhancedContext: jest.fn(),
			storeConversation: jest.fn(),
			cleanup: jest.fn(),
		} as any;

		mockConfigService = {
			loadConfiguration: jest.fn(),
			getConfiguration: jest.fn(),
			updateConfiguration: jest.fn(),
			createConfiguration: jest.fn(),
			resetToDefaults: jest.fn(),
		} as any;

		// Mock getInstance methods
		(
			QdrantMemoryService.getInstance as jest.MockedFunction<typeof QdrantMemoryService.getInstance>
		).mockReturnValue(mockMemoryService);
		(
			BotConfigurationService.getInstance as jest.MockedFunction<typeof BotConfigurationService.getInstance>
		).mockReturnValue(mockConfigService);

		// Create web server instance (useQdrant = true)
		webServer = new WebServer(7080, true);
		app = webServer.getApp();
	});

	describe('Health Check', () => {
		it('should return healthy status', async () => {
			mockMemoryService.healthCheck.mockResolvedValue({
				status: 'healthy',
				qdrant: { connected: true, collections: [], vectorCount: 0 },
				embedding: { loaded: true, model: 'test', dimensions: 384 },
				memory: { personalityNotes: 0, conversations: 0, cacheHitRate: 0 },
				performance: { averageSearchTime: 0, averageEmbeddingTime: 0 },
			});

			const response = await request(app).get('/api/health').expect(200);

			expect(response.body).toEqual({
				success: true,
				status: 'healthy',
				storage: 'qdrant',
				timestamp: expect.any(String),
				details: expect.any(Object),
			});
		});

		it('should handle service errors gracefully', async () => {
			mockMemoryService.healthCheck.mockRejectedValue(new Error('Service error'));

			const response = await request(app).get('/api/health').expect(500);

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
			type: 'personality' as const,
			content: 'Test note',
			category: 'instruction' as const,
			priority: 'high' as const,
			isActive: true,
			tokens: [],
			createdAt: new Date(),
			updatedAt: new Date(),
			metadata: {},
		};

		it('should get all notes', async () => {
			mockMemoryService.getNotes.mockResolvedValue([mockNote]);

			const response = await request(app).get('/api/notes').expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data).toHaveLength(1);
			expect(response.body.data[0].id).toBe(mockNote.id);
			expect(response.body.data[0].content).toBe(mockNote.content);
		});

		it('should get notes with filters', async () => {
			mockMemoryService.getNotes.mockResolvedValue([mockNote]);

			await request(app)
				.get('/api/notes?category=instruction&priority=high&isActive=true&search=test&limit=10')
				.expect(200);

			expect(mockMemoryService.getNotes).toHaveBeenCalledWith({
				category: 'instruction',
				priority: 'high',
				isActive: true,
				search: 'test',
				limit: 10,
			});
		});

		it('should get note by ID', async () => {
			mockMemoryService.getNoteById.mockResolvedValue(mockNote);

			const response = await request(app).get('/api/notes/1').expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data.id).toBe(mockNote.id);
			expect(response.body.data.content).toBe(mockNote.content);
			expect(response.body.data.category).toBe(mockNote.category);
		});

		it('should return 404 for non-existent note', async () => {
			mockMemoryService.getNoteById.mockResolvedValue(null);

			const response = await request(app).get('/api/notes/999').expect(404);

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

			mockMemoryService.createNote.mockResolvedValue({
				...mockNote,
				content: newNote.content,
				category: newNote.category as any,
				priority: newNote.priority as any,
			});

			const response = await request(app).post('/api/notes').send(newNote).expect(201);

			expect(response.body.success).toBe(true);
			expect(mockMemoryService.createNote).toHaveBeenCalledWith(newNote);
		});

		it('should validate required fields when creating note', async () => {
			const response = await request(app).post('/api/notes').send({}).expect(400);

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

			mockMemoryService.updateNote.mockResolvedValue({
				...mockNote,
				content: updateData.content,
				priority: updateData.priority as any,
			});

			const response = await request(app).put('/api/notes/1').send(updateData).expect(200);

			expect(response.body.success).toBe(true);
			expect(mockMemoryService.updateNote).toHaveBeenCalledWith('1', updateData);
		});

		it('should delete a note', async () => {
			mockMemoryService.deleteNote.mockResolvedValue(true);

			const response = await request(app).delete('/api/notes/1').expect(200);

			expect(response.body).toEqual({
				success: true,
				message: 'Note deleted successfully',
			});
		});
	});

	describe('Statistics API', () => {
		it('should get statistics', async () => {
			const mockStats = {
				total: 5,
				byType: { personality: 5, conversation: 0 },
				byCategory: { instruction: 2, personality: 3 },
				byPriority: { high: 1, medium: 2, low: 2 },
				activePersonalityNotes: 3,
				conversationHistory: { total: 0, last24Hours: 0, last7Days: 0, last30Days: 0 },
				storage: { vectorCount: 5, collectionSize: 5, indexSize: 5 },
			};

			mockMemoryService.getStats.mockResolvedValue(mockStats);

			const response = await request(app).get('/api/stats').expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data).toEqual(mockStats);
		});
	});

	describe('LLM Context API', () => {
		it('should get LLM context', async () => {
			const mockContext = 'Test personality context for LLM';
			mockMemoryService.getActiveNotesForLLM.mockResolvedValue(mockContext);

			const response = await request(app).get('/api/context').expect(200);

			expect(response.text).toBe(mockContext);
		});
	});

	describe('Semantic Search API', () => {
		it('should perform semantic search', async () => {
			const mockNote = {
				id: '1',
				type: 'personality' as const,
				content: 'Test note',
				category: 'instruction' as const,
				priority: 'high' as const,
				isActive: true,
				tokens: [],
				createdAt: new Date(),
				updatedAt: new Date(),
				metadata: {},
			};

			const mockResults = [
				{
					item: mockNote,
					score: 0.9,
				},
			];

			mockMemoryService.searchMemory.mockResolvedValue(mockResults);

			const response = await request(app)
				.post('/api/search')
				.send({
					query: 'test query',
					filters: { type: 'personality', limit: 5 },
				})
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						item: expect.objectContaining({
							id: '1',
							type: 'personality',
							content: 'Test note',
							category: 'instruction',
							priority: 'high',
							isActive: true,
						}),
						score: 0.9,
					}),
				]),
			);
			expect(mockMemoryService.searchMemory).toHaveBeenCalledWith('test query', {
				type: 'personality',
				limit: 5,
			});
		});

		it('should validate search query', async () => {
			const response = await request(app).post('/api/search').send({}).expect(400);

			expect(response.body).toEqual({
				success: false,
				error: 'Query is required',
			});
		});
	});

	describe('Enhanced Context API', () => {
		it('should generate enhanced context', async () => {
			const mockEnhancedContext = {
				personalityContext: 'Personality context',
				conversationContext: 'Conversation context',
				combinedContext: 'Combined context',
				metadata: {
					personalityNotesUsed: 2,
					conversationItemsUsed: 3,
					averageSimilarity: 0.8,
					contextLength: 100,
				},
			};

			mockMemoryService.generateEnhancedContext.mockResolvedValue(mockEnhancedContext);

			const response = await request(app)
				.post('/api/context/enhanced')
				.send({
					message: 'Test message',
					userId: 'user123',
					channelId: 'channel456',
					options: { maxPersonalityNotes: 5 },
				})
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data).toEqual(mockEnhancedContext);
			expect(mockMemoryService.generateEnhancedContext).toHaveBeenCalledWith(
				'Test message',
				'user123',
				'channel456',
				{ maxPersonalityNotes: 5 },
			);
		});

		it('should validate enhanced context request', async () => {
			const response = await request(app)
				.post('/api/context/enhanced')
				.send({ message: 'Test message' }) // Missing userId and channelId
				.expect(400);

			expect(response.body).toEqual({
				success: false,
				error: 'Message, userId, and channelId are required',
			});
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

			const response = await request(app).get('/api/configuration').expect(200);

			expect(response.body.id).toBe(mockConfig.id);
			expect(response.body.corePersonality).toBe(mockConfig.corePersonality);
			expect(response.body.responseFrequency).toBe(mockConfig.responseFrequency);
		});

		it('should update configuration', async () => {
			const updateData = { responseFrequency: 50 };
			mockConfigService.updateConfiguration.mockResolvedValue({ ...mockConfig, ...updateData });

			const response = await request(app).put('/api/configuration').send(updateData).expect(200);

			expect(mockConfigService.updateConfiguration).toHaveBeenCalledWith(updateData);
		});

		it('should reset configuration to defaults', async () => {
			mockConfigService.resetToDefaults.mockResolvedValue(mockConfig);

			const response = await request(app).post('/api/configuration/reset').expect(200);

			expect(response.body.id).toBe(mockConfig.id);
			expect(response.body.corePersonality).toBe(mockConfig.corePersonality);
			expect(response.body.responseFrequency).toBe(mockConfig.responseFrequency);
		});
	});

	describe('Import/Export API', () => {
		it('should export data', async () => {
			const mockNotes = [{ id: '1', content: 'Test' }];
			const mockConfig = { id: '1', isEnabled: true };

			mockMemoryService.getNotes.mockResolvedValue(mockNotes as any);
			mockConfigService.getConfiguration.mockResolvedValue(mockConfig as any);

			const response = await request(app).get('/api/export').expect(200);

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

			mockMemoryService.getNotes.mockResolvedValue([]);
			mockMemoryService.deleteNote.mockResolvedValue(true);
			mockMemoryService.createNote.mockResolvedValue({} as any);
			mockConfigService.updateConfiguration.mockResolvedValue({} as any);

			const response = await request(app).post('/api/import').send(importData).expect(200);

			expect(response.body).toEqual({
				success: true,
				message: 'Data imported successfully',
			});
		});
	});

	describe('Static Files', () => {
		it('should serve the main webpage', async () => {
			const response = await request(app).get('/').expect(200);

			expect(response.type).toBe('text/html');
		});

		it('should return 404 for unknown routes', async () => {
			const response = await request(app).get('/unknown-route').expect(404);

			expect(response.body).toEqual({
				success: false,
				error: 'Not found',
			});
		});
	});
});
