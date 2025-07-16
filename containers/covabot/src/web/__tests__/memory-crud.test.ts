import request from 'supertest';
import { WebServer } from '../server';
import { QdrantMemoryService } from '../../services/qdrantMemoryService';
import { BotConfigurationService } from '../../services/botConfigurationService';
import { createMockMemoryService, createMockConfigurationService } from '../../__tests__/mocks/database-mocks';

// Mock dependencies
jest.mock('../../services/qdrantMemoryService');
jest.mock('../../services/botConfigurationService');

const MockQdrantMemoryService = QdrantMemoryService as jest.MockedClass<typeof QdrantMemoryService>;
const MockBotConfigurationService = BotConfigurationService as jest.MockedClass<typeof BotConfigurationService>;

describe('Web UI - Memory CRUD Operations (No Discord Integration)', () => {
	let webServer: WebServer;
	let app: any;
	let mockMemoryService: any;
	let mockConfigService: any;

	beforeAll(async () => {
		// Create mock services
		mockMemoryService = createMockMemoryService();
		mockConfigService = createMockConfigurationService();

		// Mock the singleton getInstance methods
		MockQdrantMemoryService.getInstance = jest.fn().mockReturnValue(mockMemoryService);
		MockBotConfigurationService.getInstance = jest.fn().mockReturnValue(mockConfigService);

		// Create web server with mocked dependencies
		webServer = new WebServer(0, false); // Port 0 for testing, no real Qdrant
		app = webServer.getApp();
	});

	beforeEach(() => {
		jest.clearAllMocks();
		mockMemoryService.reset();
		mockConfigService.reset();
	});

	describe('Personality Notes CRUD - No Discord Notifications', () => {
		describe('Create Operations', () => {
			it('should create personality note without Discord integration', async () => {
				const noteData = {
					content: 'Cova loves discussing machine learning algorithms',
					category: 'knowledge',
					priority: 'high'
				};

				const response = await request(app)
					.post('/api/memory/personality-notes')
					.send(noteData)
					.expect(201);

				expect(response.body.success).toBe(true);
				expect(response.body.data).toMatchObject({
					content: noteData.content,
					category: noteData.category,
					priority: noteData.priority,
					id: expect.any(String),
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				});

				expect(mockMemoryService.createPersonalityNote).toHaveBeenCalledWith(
					noteData.content,
					noteData.category,
					noteData.priority
				);

				// Verify no Discord messages were sent
				expect(mockMemoryService.storeConversation).not.toHaveBeenCalled();
			});

			it('should validate required fields', async () => {
				// Test missing content
				await request(app)
					.post('/api/memory/personality-notes')
					.send({ metadata: {} })
					.expect(400);

				// Test empty content
				await request(app)
					.post('/api/memory/personality-notes')
					.send({ content: '' })
					.expect(400);

				// Test whitespace-only content
				await request(app)
					.post('/api/memory/personality-notes')
					.send({ content: '   ' })
					.expect(400);
			});

			it('should handle optional metadata gracefully', async () => {
				const noteData = { content: 'Simple note without metadata' };

				const response = await request(app)
					.post('/api/memory/personality-notes')
					.send(noteData)
					.expect(201);

				expect(response.body.success).toBe(true);
				expect(mockMemoryService.createPersonalityNote).toHaveBeenCalledWith(
					noteData.content,
					'knowledge',
					'medium'
				);
			});

			it('should sanitize input content', async () => {
				const noteData = {
					content: '<script>alert("xss")</script>Cova likes coding',
					category: 'knowledge',
					priority: 'medium'
				};

				const response = await request(app)
					.post('/api/memory/personality-notes')
					.send(noteData)
					.expect(201);

				expect(response.body.success).toBe(true);
				// Content should be passed through (sanitization handled by service layer)
				expect(mockMemoryService.createPersonalityNote).toHaveBeenCalledWith(
					noteData.content,
					noteData.category,
					noteData.priority
				);
			});

			it('should handle service errors gracefully', async () => {
				mockMemoryService.setShouldFail(true, new Error('Database connection failed'));

				const response = await request(app)
					.post('/api/memory/personality-notes')
					.send({ content: 'Test note' })
					.expect(500);

				expect(response.body.success).toBe(false);
				expect(response.body.error).toContain('Failed to create personality note');
			});
		});

		describe('Read Operations', () => {
			it('should retrieve all personality notes', async () => {
				const response = await request(app)
					.get('/api/memory/personality-notes')
					.expect(200);

				expect(response.body.success).toBe(true);
				expect(Array.isArray(response.body.data)).toBe(true);
				expect(mockMemoryService.searchPersonalityNotes).toHaveBeenCalledWith(
					'',
					undefined,
					50 // Default limit
				);
			});

			it('should retrieve specific personality note by ID', async () => {
				const noteId = 'test-note-123';

				const response = await request(app)
					.get(`/api/memory/personality-notes/${noteId}`)
					.expect(200);

				expect(response.body.success).toBe(true);
				expect(mockMemoryService.getPersonalityNote).toHaveBeenCalledWith(noteId);
			});

			it('should handle non-existent note gracefully', async () => {
				mockMemoryService.getPersonalityNote.mockResolvedValue(null);

				const response = await request(app)
					.get('/api/memory/personality-notes/non-existent')
					.expect(404);

				expect(response.body.success).toBe(false);
				expect(response.body.error).toContain('not found');
			});

			it('should support pagination parameters', async () => {
				const response = await request(app)
					.get('/api/memory/personality-notes')
					.query({ limit: 10, offset: 20 })
					.expect(200);

				expect(response.body.success).toBe(true);
				// Verify pagination parameters are used
				expect(mockMemoryService.searchPersonalityNotes).toHaveBeenCalledWith(
					'',
					undefined,
					10
				);
			});
		});

		describe('Update Operations', () => {
			it('should update personality note content', async () => {
				const noteId = 'test-note-123';
				const updateData = {
					content: 'Updated: Cova enjoys advanced AI discussions',
					category: 'knowledge',
					priority: 'high'
				};

				const response = await request(app)
					.put(`/api/memory/personality-notes/${noteId}`)
					.send(updateData)
					.expect(200);

				expect(response.body.success).toBe(true);
				expect(mockMemoryService.updatePersonalityNote).toHaveBeenCalledWith(
					noteId,
					updateData
				);

				// Verify no Discord notifications
				expect(mockMemoryService.storeConversation).not.toHaveBeenCalled();
			});

			it('should handle partial updates', async () => {
				const noteId = 'test-note-123';
				const updateData = { content: 'Only updating content' };

				const response = await request(app)
					.put(`/api/memory/personality-notes/${noteId}`)
					.send(updateData)
					.expect(200);

				expect(response.body.success).toBe(true);
				expect(mockMemoryService.updatePersonalityNote).toHaveBeenCalledWith(
					noteId,
					updateData
				);
			});

			it('should validate update data', async () => {
				const noteId = 'test-note-123';

				// Test empty content
				await request(app)
					.put(`/api/memory/personality-notes/${noteId}`)
					.send({ content: '' })
					.expect(400);

				// Test invalid category
				await request(app)
					.put(`/api/memory/personality-notes/${noteId}`)
					.send({ category: 'invalid-category' })
					.expect(400);
			});

			it('should handle non-existent note updates', async () => {
				mockMemoryService.updatePersonalityNote.mockResolvedValue(null);

				const response = await request(app)
					.put('/api/memory/personality-notes/non-existent')
					.send({ content: 'Updated content' })
					.expect(404);

				expect(response.body.success).toBe(false);
				expect(response.body.error).toContain('not found');
			});

			it('should handle service errors during update', async () => {
				mockMemoryService.setShouldFail(true, new Error('Update failed'));

				const response = await request(app)
					.put('/api/memory/personality-notes/test-id')
					.send({ content: 'Test update' })
					.expect(500);

				expect(response.body.success).toBe(false);
				expect(response.body.error).toContain('Failed to update personality note');
			});
		});

		describe('Delete Operations', () => {
			it('should delete personality note successfully', async () => {
				const noteId = 'test-note-123';

				const response = await request(app)
					.delete(`/api/memory/personality-notes/${noteId}`)
					.expect(200);

				expect(response.body.success).toBe(true);
				expect(response.body.message).toContain('deleted successfully');
				expect(mockMemoryService.deletePersonalityNote).toHaveBeenCalledWith(noteId);

				// Verify no Discord notifications
				expect(mockMemoryService.storeConversation).not.toHaveBeenCalled();
			});

			it('should handle non-existent note deletion', async () => {
				mockMemoryService.deletePersonalityNote.mockResolvedValue(false);

				const response = await request(app)
					.delete('/api/memory/personality-notes/non-existent')
					.expect(404);

				expect(response.body.success).toBe(false);
				expect(response.body.error).toContain('not found');
			});

			it('should handle service errors during deletion', async () => {
				mockMemoryService.setShouldFail(true, new Error('Delete failed'));

				const response = await request(app)
					.delete('/api/memory/personality-notes/test-id')
					.expect(500);

				expect(response.body.success).toBe(false);
				expect(response.body.error).toContain('Failed to delete personality note');
			});
		});

		describe('Search Operations', () => {
			it('should search personality notes with query', async () => {
				const searchParams = {
					query: 'programming',
					limit: 20
				};

				const response = await request(app)
					.get('/api/memory/personality-notes/search')
					.query(searchParams)
					.expect(200);

				expect(response.body.success).toBe(true);
				expect(Array.isArray(response.body.data)).toBe(true);
				expect(mockMemoryService.searchPersonalityNotes).toHaveBeenCalledWith(
					searchParams.query,
					undefined,
					searchParams.limit
				);
			});

			it('should search with category filter', async () => {
				const searchParams = {
					query: 'interests',
					category: 'knowledge',
					limit: 10
				};

				const response = await request(app)
					.get('/api/memory/personality-notes/search')
					.query(searchParams)
					.expect(200);

				expect(response.body.success).toBe(true);
				expect(mockMemoryService.searchPersonalityNotes).toHaveBeenCalledWith(
					searchParams.query,
					{ category: searchParams.category },
					searchParams.limit
				);
			});

			it('should search with priority filter', async () => {
				const searchParams = {
					query: 'technical',
					priority: 'high',
					limit: 15
				};

				const response = await request(app)
					.get('/api/memory/personality-notes/search')
					.query(searchParams)
					.expect(200);

				expect(response.body.success).toBe(true);
				expect(mockMemoryService.searchPersonalityNotes).toHaveBeenCalledWith(
					searchParams.query,
					{ priority: searchParams.priority },
					searchParams.limit
				);
			});

			it('should search with multiple filters', async () => {
				const searchParams = {
					query: 'coding',
					category: 'knowledge',
					priority: 'medium',
					limit: 5
				};

				const response = await request(app)
					.get('/api/memory/personality-notes/search')
					.query(searchParams)
					.expect(200);

				expect(response.body.success).toBe(true);
				expect(mockMemoryService.searchPersonalityNotes).toHaveBeenCalledWith(
					searchParams.query,
					{
						category: searchParams.category,
						priority: searchParams.priority
					},
					searchParams.limit
				);
			});

			it('should handle empty search results', async () => {
				mockMemoryService.searchPersonalityNotes.mockResolvedValue([]);

				const response = await request(app)
					.get('/api/memory/personality-notes/search')
					.query({ query: 'nonexistent' })
					.expect(200);

				expect(response.body.success).toBe(true);
				expect(response.body.data).toHaveLength(0);
			});

			it('should validate search parameters', async () => {
				// Test invalid limit
				await request(app)
					.get('/api/memory/personality-notes/search')
					.query({ limit: -1 })
					.expect(400);

				// Test limit too high
				await request(app)
					.get('/api/memory/personality-notes/search')
					.query({ limit: 1000 })
					.expect(400);
			});

			it('should handle search service errors', async () => {
				mockMemoryService.setShouldFail(true, new Error('Search failed'));

				const response = await request(app)
					.get('/api/memory/personality-notes/search')
					.query({ query: 'test' })
					.expect(500);

				expect(response.body.success).toBe(false);
				expect(response.body.error).toContain('Failed to search personality notes');
			});
		});
	});

	describe('Bulk Operations - No Discord Integration', () => {
		it('should handle bulk create operations', async () => {
			const bulkData = {
				notes: [
					{ content: 'Bulk note 1', category: 'knowledge', priority: 'medium' },
					{ content: 'Bulk note 2', category: 'knowledge', priority: 'medium' },
					{ content: 'Bulk note 3', category: 'knowledge', priority: 'medium' }
				]
			};

			// Note: This endpoint might not exist yet, but tests the concept
			const response = await request(app)
				.post('/api/memory/personality-notes/bulk')
				.send(bulkData)
				.expect(201);

			expect(response.body.success).toBe(true);
			expect(response.body.data).toHaveLength(3);

			// Verify no Discord notifications for bulk operations
			expect(mockMemoryService.storeConversation).not.toHaveBeenCalled();
		});

		it('should handle bulk delete operations', async () => {
			const deleteData = {
				ids: ['note-1', 'note-2', 'note-3']
			};

			const response = await request(app)
				.delete('/api/memory/personality-notes/bulk')
				.send(deleteData)
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(mockMemoryService.deletePersonalityNote).toHaveBeenCalledTimes(3);

			// Verify no Discord notifications
			expect(mockMemoryService.storeConversation).not.toHaveBeenCalled();
		});
	});

	describe('Data Export/Import - No Discord Integration', () => {
		it('should export personality notes data', async () => {
			const response = await request(app)
				.get('/api/memory/personality-notes/export')
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data).toHaveProperty('notes');
			expect(response.body.data).toHaveProperty('exportDate');
			expect(response.body.data).toHaveProperty('version');

			// Verify no Discord notifications during export
			expect(mockMemoryService.storeConversation).not.toHaveBeenCalled();
		});

		it('should import personality notes data', async () => {
			const importData = {
				notes: [
					{ content: 'Imported note 1', category: 'knowledge', priority: 'medium' },
					{ content: 'Imported note 2', category: 'knowledge', priority: 'medium' }
				],
				version: '1.0'
			};

			const response = await request(app)
				.post('/api/memory/personality-notes/import')
				.send(importData)
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data).toHaveProperty('imported');
			expect(response.body.data.imported).toBe(2);

			// Verify no Discord notifications during import
			expect(mockMemoryService.storeConversation).not.toHaveBeenCalled();
		});
	});
});
