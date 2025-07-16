import request from 'supertest';
import { WebServer } from '../server';
import { QdrantMemoryService } from '../../services/qdrantMemoryService';
import { BotConfigurationService } from '../../services/botConfigurationService';
import { createMockMemoryService, createMockConfigurationService } from '../../__tests__/mocks/database-mocks';

// Mock dependencies - no network calls
jest.mock('../../services/qdrantMemoryService');
jest.mock('../../services/botConfigurationService');

const MockQdrantMemoryService = QdrantMemoryService as jest.MockedClass<typeof QdrantMemoryService>;
const MockBotConfigurationService = BotConfigurationService as jest.MockedClass<typeof BotConfigurationService>;

describe('CovaBot Memory CRUD - Core Functionality Tests', () => {
	let webServer: WebServer;
	let app: any;
	let mockMemoryService: any;
	let mockConfigService: any;

	beforeAll(async () => {
		// Create simple, predictable mocks
		mockMemoryService = createMockMemoryService();
		mockConfigService = createMockConfigurationService();

		// Mock singleton instances
		MockQdrantMemoryService.getInstance = jest.fn().mockReturnValue(mockMemoryService);
		MockBotConfigurationService.getInstance = jest.fn().mockReturnValue(mockConfigService);

		// Create web server with mocked dependencies
		webServer = new WebServer(0, false);
		app = webServer.getApp();
	});

	beforeEach(() => {
		// Clean slate for each test
		jest.clearAllMocks();
		mockMemoryService.reset();
		mockConfigService.reset();
	});

	describe('Essential CRUD Operations', () => {
		it('should create and retrieve personality notes', async () => {
			// Test data flow: Web UI → Service → Mock Storage
			const noteData = {
				content: 'Cova enjoys discussing advanced AI topics',
				category: 'personality',
				priority: 'high'
			};

			// Create note
			const createResponse = await request(app)
				.post('/api/memory/personality-notes')
				.send(noteData)
				.expect(201);

			expect(createResponse.body.success).toBe(true);
			expect(createResponse.body.data.content).toBe(noteData.content);
			expect(createResponse.body.data.id).toBeDefined();

			// Retrieve note
			const noteId = createResponse.body.data.id;
			const getResponse = await request(app)
				.get(`/api/memory/personality-notes/${noteId}`)
				.expect(200);

			expect(getResponse.body.success).toBe(true);
			expect(getResponse.body.data.content).toBe(noteData.content);
		});

		it('should update existing notes', async () => {
			// Create note first
			const noteData = { content: 'Original content', category: 'knowledge', priority: 'medium' };
			const createResponse = await request(app)
				.post('/api/memory/personality-notes')
				.send(noteData)
				.expect(201);

			const noteId = createResponse.body.data.id;

			// Update note
			const updateData = { content: 'Updated content', priority: 'high' };
			const updateResponse = await request(app)
				.put(`/api/memory/personality-notes/${noteId}`)
				.send(updateData)
				.expect(200);

			expect(updateResponse.body.success).toBe(true);
			expect(mockMemoryService.updatePersonalityNote).toHaveBeenCalledWith(noteId, updateData);
		});

		it('should delete notes', async () => {
			// Create note first
			const noteData = { content: 'Note to delete', category: 'knowledge', priority: 'medium' };
			const createResponse = await request(app)
				.post('/api/memory/personality-notes')
				.send(noteData)
				.expect(201);

			const noteId = createResponse.body.data.id;

			// Delete note
			const deleteResponse = await request(app)
				.delete(`/api/memory/personality-notes/${noteId}`)
				.expect(200);

			expect(deleteResponse.body.success).toBe(true);
			expect(mockMemoryService.deletePersonalityNote).toHaveBeenCalledWith(noteId);
		});

		it('should search notes', async () => {
			const searchResponse = await request(app)
				.get('/api/memory/personality-notes/search')
				.query({ query: 'AI discussions' })
				.expect(200);

			expect(searchResponse.body.success).toBe(true);
			expect(Array.isArray(searchResponse.body.data)).toBe(true);
			expect(mockMemoryService.searchPersonalityNotes).toHaveBeenCalledWith('AI discussions', undefined, 10);
		});
	});

	describe('Data Validation', () => {
		it('should validate required fields', async () => {
			const invalidData = { category: 'personality' }; // Missing content

			const response = await request(app)
				.post('/api/memory/personality-notes')
				.send(invalidData)
				.expect(400);

			expect(response.body.success).toBe(false);
			expect(response.body.error).toContain('Content is required');
		});

		it('should validate category values', async () => {
			const invalidData = { content: 'Test', category: 'invalid-category' };

			const response = await request(app)
				.post('/api/memory/personality-notes')
				.send(invalidData)
				.expect(400);

			expect(response.body.success).toBe(false);
			expect(response.body.error).toContain('Invalid category');
		});

		it('should handle empty content in updates', async () => {
			const response = await request(app)
				.put('/api/memory/personality-notes/test-id')
				.send({ content: '' })
				.expect(400);

			expect(response.body.success).toBe(false);
			expect(response.body.error).toContain('Content cannot be empty');
		});
	});

	describe('Error Handling', () => {
		it('should handle non-existent notes gracefully', async () => {
			// Mock returns null for non-existent notes
			mockMemoryService.getPersonalityNote.mockResolvedValue(null);

			const response = await request(app)
				.get('/api/memory/personality-notes/non-existent-id')
				.expect(404);

			expect(response.body.success).toBe(false);
			expect(response.body.error).toContain('not found');
		});

		it('should handle service failures', async () => {
			// Simple mock failure - just test that errors are handled properly
			mockMemoryService.createPersonalityNote.mockRejectedValue(new Error('Service unavailable'));

			const response = await request(app)
				.post('/api/memory/personality-notes')
				.send({ content: 'Test', category: 'knowledge', priority: 'medium' })
				.expect(500);

			expect(response.body.success).toBe(false);
			expect(response.body.error).toContain('Failed to create personality note');
		});
	});

	describe('Integration Points', () => {
		it('should not trigger Discord notifications for web UI operations', async () => {
			const noteData = { content: 'Test note', category: 'knowledge', priority: 'medium' };

			await request(app)
				.post('/api/memory/personality-notes')
				.send(noteData)
				.expect(201);

			// Verify Discord integration is not called
			expect(mockMemoryService.storeConversation).not.toHaveBeenCalled();
		});

		it('should handle bulk operations', async () => {
			const bulkData = [
				{ content: 'Note 1', category: 'personality', priority: 'high' },
				{ content: 'Note 2', category: 'knowledge', priority: 'medium' }
			];

			const response = await request(app)
				.post('/api/memory/personality-notes/bulk')
				.send({ notes: bulkData })
				.expect(201);

			expect(response.body.success).toBe(true);
			expect(Array.isArray(response.body.data)).toBe(true);
		});

		it('should support data export/import', async () => {
			// Test export
			const exportResponse = await request(app)
				.get('/api/memory/personality-notes/export')
				.expect(200);

			expect(exportResponse.body.success).toBe(true);
			expect(exportResponse.body.data.notes).toBeDefined();

			// Test import
			const importData = {
				notes: [{ content: 'Imported note', category: 'knowledge', priority: 'medium' }]
			};

			const importResponse = await request(app)
				.post('/api/memory/personality-notes/import')
				.send(importData)
				.expect(200);

			expect(importResponse.body.success).toBe(true);
		});
	});

	describe('Request/Response Structure Validation', () => {
		it('should return consistent response structure for successful operations', async () => {
			const noteData = { content: 'Test note', category: 'knowledge', priority: 'medium' };

			const response = await request(app)
				.post('/api/memory/personality-notes')
				.send(noteData)
				.expect(201);

			// Validate response structure
			expect(response.body).toHaveProperty('success', true);
			expect(response.body).toHaveProperty('data');
			expect(response.body.data).toHaveProperty('id');
			expect(response.body.data).toHaveProperty('content', noteData.content);
			expect(response.body.data).toHaveProperty('createdAt');
		});

		it('should return consistent error response structure', async () => {
			mockMemoryService.getPersonalityNote.mockResolvedValue(null);

			const response = await request(app)
				.get('/api/memory/personality-notes/non-existent')
				.expect(404);

			// Validate error response structure
			expect(response.body).toHaveProperty('success', false);
			expect(response.body).toHaveProperty('error');
			expect(typeof response.body.error).toBe('string');
		});

		it('should handle search parameters correctly', async () => {
			const response = await request(app)
				.get('/api/memory/personality-notes/search')
				.query({ query: 'test', category: 'personality', limit: 5 })
				.expect(200);

			expect(mockMemoryService.searchPersonalityNotes).toHaveBeenCalledWith(
				'test',
				{ category: 'personality' },
				5
			);
		});
	});
});
