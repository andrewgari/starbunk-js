import { QdrantMemoryService } from '../qdrantMemoryService';
import { QdrantService } from '../qdrantService';
import { EmbeddingService } from '../embeddingService';
import { PersonalityMemory, ConversationMemory } from '../../types/memoryTypes';

// Mock the services
jest.mock('../qdrantService');
jest.mock('../embeddingService');

const mockQdrantService = QdrantService as jest.MockedClass<typeof QdrantService>;
const mockEmbeddingService = EmbeddingService as jest.MockedClass<typeof EmbeddingService>;

describe('QdrantMemoryService', () => {
	let memoryService: QdrantMemoryService;
	let mockQdrantInstance: jest.Mocked<QdrantService>;
	let mockEmbeddingInstance: jest.Mocked<EmbeddingService>;

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Create mock instances with proper return values
		mockQdrantInstance = {
			initialize: jest.fn().mockResolvedValue(undefined),
			storeMemoryItem: jest.fn().mockResolvedValue('mock-id'),
			searchSimilar: jest.fn().mockResolvedValue([
				{ item: { id: '1', content: 'Test note 1', type: 'personality' }, score: 0.9 },
				{ item: { id: '2', content: 'Test note 2', type: 'conversation' }, score: 0.8 },
			]),
			getMemoryItem: jest.fn().mockResolvedValue({ id: '1', content: 'Mock item' }),
			updateMemoryItem: jest.fn().mockResolvedValue({ id: '1', content: 'Updated content', priority: 'high' }),
			deleteMemoryItem: jest.fn().mockResolvedValue(true),
			getStats: jest.fn().mockResolvedValue({
				totalVectors: 100,
				collections: {
					memory: { vectorCount: 50, indexedVectorsCount: 50 },
					personality: { vectorCount: 30, indexedVectorsCount: 30 },
					conversation: { vectorCount: 20, indexedVectorsCount: 20 },
				},
			}),
			healthCheck: jest.fn().mockResolvedValue({ connected: true }),
		} as any;

		mockEmbeddingInstance = {
			initialize: jest.fn().mockResolvedValue(undefined),
			generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
			generateBatchEmbeddings: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
			getConfig: jest.fn().mockReturnValue({ dimensions: 384 }),
			getHealthStatus: jest.fn().mockReturnValue({ loaded: true }),
			cleanup: jest.fn().mockResolvedValue(undefined),
		} as any;

		// Mock the getInstance methods
		(mockQdrantService.getInstance as jest.MockedFunction<typeof QdrantService.getInstance>).mockReturnValue(
			mockQdrantInstance,
		);
		(mockEmbeddingService.getInstance as jest.MockedFunction<typeof EmbeddingService.getInstance>).mockReturnValue(
			mockEmbeddingInstance,
		);

		// Create service instance
		memoryService = QdrantMemoryService.getInstance();
	});

	describe('Initialization', () => {
		it('should initialize both Qdrant and Embedding services', async () => {
			await memoryService.initialize();

			expect(mockQdrantInstance.initialize).toHaveBeenCalledTimes(1);
			expect(mockEmbeddingInstance.initialize).toHaveBeenCalledTimes(1);
		});

		it.skip('should handle initialization errors', async () => {
			mockQdrantInstance.initialize.mockRejectedValue(new Error('Qdrant connection failed'));

			await expect(memoryService.initialize()).rejects.toThrow('Qdrant connection failed');
		});
	});

	describe('Personality Notes Management', () => {
		beforeEach(async () => {
			await memoryService.initialize();
		});

		it.skip('should create a personality note with embedding', async () => {
			const mockEmbedding = new Array(384).fill(0.1);
			mockEmbeddingInstance.generateEmbedding.mockResolvedValue(mockEmbedding);

			const request = {
				content: 'Test personality note',
				category: 'personality' as const,
				priority: 'high' as const,
			};

			const _result = await memoryService.createNote(request);

			expect(mockEmbeddingInstance.generateEmbedding).toHaveBeenCalledWith('Test personality note');
			expect(mockQdrantInstance.storeMemoryItem).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'personality',
					content: 'Test personality note',
					category: 'personality',
					priority: 'high',
					isActive: true,
					embedding: mockEmbedding,
				}),
			);
			expect(result.type).toBe('personality');
			expect(result.content).toBe('Test personality note');
		});

		it.skip('should get personality notes with filtering', async () => {
			const mockResults = [
				{
					item: {
						id: '1',
						type: 'personality',
						content: 'Test note 1',
						category: 'personality',
						priority: 'high',
						isActive: true,
					} as PersonalityMemory,
					score: 0.9,
				},
			];

			mockQdrantInstance.searchSimilar.mockResolvedValue(mockResults);

			const filters = { category: 'personality' as const, isActive: true };
			const _result = await memoryService.getNotes(filters);

			expect(result).toHaveLength(1);
			expect(result[0].content).toBe('Test note 1');
		});

		it.skip('should perform semantic search for notes', async () => {
			const mockEmbedding = new Array(384).fill(0.1);
			const mockResults = [
				{
					item: {
						id: '1',
						type: 'personality',
						content: 'Relevant note',
					} as PersonalityMemory,
					score: 0.8,
				},
			];

			mockEmbeddingInstance.generateEmbedding.mockResolvedValue(mockEmbedding);
			mockQdrantInstance.searchSimilar.mockResolvedValue(mockResults);

			const _result = await memoryService.getNotes({ search: 'test query' });

			expect(mockEmbeddingInstance.generateEmbedding).toHaveBeenCalledWith('test query');
			expect(mockQdrantInstance.searchSimilar).toHaveBeenCalledWith(
				mockEmbedding,
				expect.objectContaining({ type: 'personality' }),
			);
			expect(result).toHaveLength(1);
		});

		it.skip('should update a personality note', async () => {
			const existingNote: PersonalityMemory = {
				id: '1',
				type: 'personality',
				content: 'Original content',
				category: 'personality',
				priority: 'medium',
				isActive: true,
				tokens: [],
				createdAt: new Date(),
				updatedAt: new Date(),
				metadata: {},
			};

			const mockEmbedding = new Array(384).fill(0.2);

			mockQdrantInstance.getMemoryItem.mockResolvedValue(existingNote);
			mockEmbeddingInstance.generateEmbedding.mockResolvedValue(mockEmbedding);

			const updateRequest = {
				content: 'Updated content',
				priority: 'high' as const,
			};

			const _result = await memoryService.updateNote('1', updateRequest);

			expect(result?.content).toBe('Updated content');
			expect(result?.priority).toBe('high');
			expect(mockQdrantInstance.updateMemoryItem).toHaveBeenCalled();
		});

		it.skip('should delete a personality note', async () => {
			mockQdrantInstance.deleteMemoryItem.mockResolvedValue(true);

			const _result = await memoryService.deleteNote('1');

			expect(result).toBe(true);
			expect(mockQdrantInstance.deleteMemoryItem).toHaveBeenCalledWith('1', 'personality');
		});

		it('should generate LLM context from active notes', async () => {
			const mockNotes: PersonalityMemory[] = [
				{
					id: '1',
					type: 'personality',
					content: 'Be helpful and friendly',
					category: 'instruction',
					priority: 'high',
					isActive: true,
					tokens: [],
					createdAt: new Date(),
					updatedAt: new Date(),
					metadata: {},
				},
				{
					id: '2',
					type: 'personality',
					content: 'Love gaming and technology',
					category: 'personality',
					priority: 'medium',
					isActive: true,
					tokens: [],
					createdAt: new Date(),
					updatedAt: new Date(),
					metadata: {},
				},
			];

			// Mock the getNotes method to return our test notes
			jest.spyOn(memoryService, 'getNotes').mockResolvedValue(mockNotes);

			const context = await memoryService.getActiveNotesForLLM();

			expect(context).toContain('PERSONALITY INSTRUCTIONS');
			expect(context).toContain('Instruction:');
			expect(context).toContain('[IMPORTANT] Be helpful and friendly');
			expect(context).toContain('Personality:');
			expect(context).toContain('Love gaming and technology');
		});
	});

	describe('Conversation Memory Management', () => {
		beforeEach(async () => {
			await memoryService.initialize();
		});

		it.skip('should store conversation messages', async () => {
			const mockEmbedding = new Array(384).fill(0.3);
			mockEmbeddingInstance.generateEmbedding.mockResolvedValue(mockEmbedding);

			const request = {
				content: 'Hello, how are you?',
				userId: 'user123',
				channelId: 'channel456',
				messageType: 'user' as const,
			};

			const _result = await memoryService.storeConversation(request);

			expect(mockEmbeddingInstance.generateEmbedding).toHaveBeenCalledWith('Hello, how are you?');
			expect(mockQdrantInstance.storeMemoryItem).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'conversation',
					content: 'Hello, how are you?',
					userId: 'user123',
					channelId: 'channel456',
					messageType: 'user',
					embedding: mockEmbedding,
				}),
			);
			expect(result.type).toBe('conversation');
		});

		it.skip('should get conversation context for LLM', async () => {
			const mockEmbedding = new Array(384).fill(0.4);
			const mockResults = [
				{
					item: {
						id: '1',
						type: 'conversation',
						content: 'Previous message',
						userId: 'user123',
						messageType: 'user',
						createdAt: new Date(Date.now() - 60000), // 1 minute ago
					} as ConversationMemory,
					score: 0.8,
				},
				{
					item: {
						id: '2',
						type: 'conversation',
						content: 'Bot response',
						userId: 'covabot',
						messageType: 'bot',
						createdAt: new Date(Date.now() - 30000), // 30 seconds ago
					} as ConversationMemory,
					score: 0.7,
				},
			];

			mockEmbeddingInstance.generateEmbedding.mockResolvedValue(mockEmbedding);
			mockQdrantInstance.searchSimilar.mockResolvedValue(mockResults);

			const context = await memoryService.getConversationContext('Current message', 'user123', 'channel456');

			expect(context).toContain('RELEVANT CONVERSATION HISTORY');
			expect(context).toContain('[1m ago] User: Previous message');
			expect(context).toContain('[just now] Cova: Bot response');
		});

		it('should generate enhanced context combining personality and conversation', async () => {
			// Mock personality context
			jest.spyOn(memoryService, 'getActiveNotesForLLM').mockResolvedValue('PERSONALITY: Be helpful');

			// Mock conversation context
			jest.spyOn(memoryService, 'getConversationContext').mockResolvedValue('CONVERSATION: Previous chat');

			const _result = await memoryService.generateEnhancedContext('Test message', 'user123', 'channel456');

			expect(result.personalityContext).toBe('PERSONALITY: Be helpful');
			expect(result.conversationContext).toBe('CONVERSATION: Previous chat');
			expect(result.combinedContext).toContain('PERSONALITY: Be helpful');
			expect(result.combinedContext).toContain('CONVERSATION: Previous chat');
			expect(result.metadata.contextLength).toBeGreaterThan(0);
		});
	});

	describe('Health and Statistics', () => {
		beforeEach(async () => {
			await memoryService.initialize();
		});

		it.skip('should return health status', async () => {
			mockQdrantInstance.healthCheck.mockResolvedValue({
				connected: true,
				collections: ['covabot_personality', 'covabot_conversations'],
				vectorCount: 100,
			});

			mockEmbeddingInstance.getHealthStatus.mockReturnValue({
				status: 'healthy',
				model: 'test-model',
				dimensions: 384,
				cacheSize: 10,
				isReady: true,
			});

			// Mock getNotes for stats
			jest.spyOn(memoryService, 'getNotes').mockResolvedValue([]);

			const health = await memoryService.healthCheck();

			expect(health.status).toBe('healthy');
			expect(health.qdrant.connected).toBe(true);
			expect(health.embedding.loaded).toBe(true);
		});

		it.skip('should return memory statistics', async () => {
			const mockPersonalityNotes: PersonalityMemory[] = [
				{
					id: '1',
					type: 'personality',
					category: 'instruction',
					priority: 'high',
					isActive: true,
				} as PersonalityMemory,
			];

			mockQdrantInstance.getStats.mockResolvedValue({
				collections: {
					covabot_personality: { vectorCount: 10, indexedVectorsCount: 10 },
					covabot_conversations: { vectorCount: 50, indexedVectorsCount: 50 },
				},
				totalVectors: 60,
			});

			// Mock getNotes for personality stats
			jest.spyOn(memoryService, 'getNotes').mockResolvedValue(mockPersonalityNotes);

			// Mock search for conversation stats
			mockQdrantInstance.searchSimilar.mockResolvedValue([]);

			const stats = await memoryService.getStats();

			expect(stats.total).toBe(60);
			expect(stats.byType.personality).toBe(1);
			expect(stats.activePersonalityNotes).toBe(1);
		});
	});

	describe('Semantic Search', () => {
		beforeEach(async () => {
			await memoryService.initialize();
		});

		it.skip('should perform semantic search across all memory types', async () => {
			const mockEmbedding = new Array(384).fill(0.5);
			const mockResults = [
				{
					item: {
						id: '1',
						type: 'personality',
						content: 'Relevant personality note',
					} as PersonalityMemory,
					score: 0.9,
				},
				{
					item: {
						id: '2',
						type: 'conversation',
						content: 'Relevant conversation',
					} as ConversationMemory,
					score: 0.8,
				},
			];

			mockEmbeddingInstance.generateEmbedding.mockResolvedValue(mockEmbedding);
			mockQdrantInstance.searchSimilar.mockResolvedValue(mockResults);

			const results = await memoryService.searchMemory('test query', { limit: 5 });

			expect(mockEmbeddingInstance.generateEmbedding).toHaveBeenCalledWith('test query');
			expect(results).toHaveLength(2);
			expect(results[0].score).toBe(0.9);
			expect(results[1].score).toBe(0.8);
		});
	});

	describe.skip('Error Handling', () => {
		it('should handle embedding generation errors gracefully', async () => {
			await memoryService.initialize();

			mockEmbeddingInstance.generateEmbedding.mockRejectedValue(new Error('Embedding failed'));

			await expect(
				memoryService.createNote({
					content: 'Test note',
					category: 'personality',
				}),
			).rejects.toThrow('Embedding failed');
		});

		it('should handle Qdrant storage errors gracefully', async () => {
			await memoryService.initialize();

			const mockEmbedding = new Array(384).fill(0.1);
			mockEmbeddingInstance.generateEmbedding.mockResolvedValue(mockEmbedding);
			mockQdrantInstance.storeMemoryItem.mockRejectedValue(new Error('Storage failed'));

			await expect(
				memoryService.createNote({
					content: 'Test note',
					category: 'personality',
				}),
			).rejects.toThrow('Storage failed');
		});

		it('should return empty context when services fail', async () => {
			await memoryService.initialize();

			mockEmbeddingInstance.generateEmbedding.mockRejectedValue(new Error('Service error'));

			const context = await memoryService.getConversationContext('Test message', 'user123', 'channel456');

			expect(context).toBe('');
		});
	});
});
