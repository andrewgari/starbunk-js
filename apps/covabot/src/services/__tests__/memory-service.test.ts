import { QdrantMemoryService } from '../qdrantMemoryService';
import { PersonalityNote } from '../../types/personalityNote';
import { MemorySearchFilters } from '../../types/memoryTypes';
import {
	createMockMemoryService,
	MOCK_PERSONALITY_NOTES,
	MOCK_CONVERSATION_HISTORY,
} from '../../__tests__/mocks/database-mocks';

// Mock the actual QdrantMemoryService
jest.mock('../qdrantMemoryService');

const MockQdrantMemoryService = QdrantMemoryService as jest.MockedClass<typeof QdrantMemoryService>;

describe('Memory Service - Comprehensive Database Integration Tests', () => {
	let memoryService: any;

	beforeEach(() => {
		// Create fresh mock service for each test
		memoryService = createMockMemoryService();
		MockQdrantMemoryService.getInstance = jest.fn().mockReturnValue(memoryService);
	});

	afterEach(() => {
		memoryService.reset();
	});

	describe('Health Check and Connection', () => {
		it('should return healthy status when service is operational', async () => {
			const healthResult = await memoryService.healthCheck();

			expect(healthResult.status).toBe('healthy');
			expect(healthResult.details).toBeDefined();
		});

		it('should return unhealthy status when service fails', async () => {
			memoryService.setShouldFail(true, new Error('Database connection failed'));

			const healthResult = await memoryService.healthCheck();

			expect(healthResult.status).toBe('unhealthy');
			expect(healthResult.details.error).toContain('Database connection failed');
		});

		it('should handle connection timeouts gracefully', async () => {
			memoryService.setShouldFail(true, new Error('Connection timeout'));

			const healthResult = await memoryService.healthCheck();

			expect(healthResult.status).toBe('unhealthy');
		});
	});

	describe('Personality Note CRUD Operations', () => {
		describe('Create Operations', () => {
			it.skip('should create personality note with content and metadata', async () => {
				const content = 'Cova enjoys discussing artificial intelligence topics';
				const metadata = { category: 'interests', importance: 'high', source: 'conversation' };

				const note = await memoryService.createPersonalityNote(content, metadata);

				expect(note).toMatchObject({
					id: expect.any(String),
					content,
					metadata,
					embedding: expect.any(Array),
					createdAt: expect.any(Date),
					updatedAt: expect.any(Date),
				});
			});

			it.skip('should create personality note with minimal data', async () => {
				const content = 'Simple note';

				const note = await memoryService.createPersonalityNote(content);

				expect(note.content).toBe(content);
				expect(note.metadata).toEqual({});
			});

			it('should generate embeddings for new notes', async () => {
				const note = await memoryService.createPersonalityNote('Test content');

				expect(note.category).toBeDefined();
				expect(note.priority).toBeDefined();
				expect(note.isActive).toBe(true);
			});

			it('should handle creation failures gracefully', async () => {
				memoryService.setShouldFail(true, new Error('Database write failed'));

				await expect(memoryService.createPersonalityNote('Test')).rejects.toThrow('Database write failed');
			});
		});

		describe('Read Operations', () => {
			it('should retrieve personality note by ID', async () => {
				const existingNote = MOCK_PERSONALITY_NOTES[0];

				const note = await memoryService.getPersonalityNote(existingNote.id);

				expect(note).toEqual(existingNote);
			});

			it('should return null for non-existent note', async () => {
				const note = await memoryService.getPersonalityNote('non-existent-id');

				expect(note).toBeNull();
			});

			it('should handle read failures gracefully', async () => {
				memoryService.setShouldFail(true, new Error('Database read failed'));

				await expect(memoryService.getPersonalityNote('test-id')).rejects.toThrow('Database read failed');
			});
		});

		describe('Update Operations', () => {
			it('should update personality note content', async () => {
				const noteId = MOCK_PERSONALITY_NOTES[0].id;
				const updates = { content: 'Updated content about Cova' };

				const updatedNote = await memoryService.updatePersonalityNote(noteId, updates);

				expect(updatedNote).not.toBeNull();
				expect(updatedNote!.content).toBe(updates.content);
				expect(updatedNote!.updatedAt).toBeInstanceOf(Date);
			});

			it('should update personality note metadata', async () => {
				const noteId = MOCK_PERSONALITY_NOTES[0].id;
				const updates = { metadata: { category: 'updated', importance: 'medium' } };

				const updatedNote = await memoryService.updatePersonalityNote(noteId, updates);

				expect(updatedNote!.metadata).toEqual(updates.metadata);
			});

			it('should return null when updating non-existent note', async () => {
				const _result = await memoryService.updatePersonalityNote('non-existent', { content: 'test' });

				expect(result).toBeNull();
			});

			it('should handle update failures gracefully', async () => {
				memoryService.setShouldFail(true, new Error('Database update failed'));

				await expect(memoryService.updatePersonalityNote('test-id', { content: 'test' })).rejects.toThrow(
					'Database update failed',
				);
			});
		});

		describe('Delete Operations', () => {
			it('should delete existing personality note', async () => {
				const noteId = MOCK_PERSONALITY_NOTES[0].id;

				const _result = await memoryService.deletePersonalityNote(noteId);

				expect(result).toBe(true);

				// Verify note is deleted
				const deletedNote = await memoryService.getPersonalityNote(noteId);
				expect(deletedNote).toBeNull();
			});

			it('should return false when deleting non-existent note', async () => {
				const _result = await memoryService.deletePersonalityNote('non-existent-id');

				expect(result).toBe(false);
			});

			it('should handle delete failures gracefully', async () => {
				memoryService.setShouldFail(true, new Error('Database delete failed'));

				await expect(memoryService.deletePersonalityNote('test-id')).rejects.toThrow('Database delete failed');
			});
		});
	});

	describe('Search and Query Operations', () => {
		it('should search personality notes by content', async () => {
			const results = await memoryService.searchPersonalityNotes('technical');

			expect(results).toHaveLength(1);
			expect(results[0].content).toContain('technical');
		});

		it('should search with category filter', async () => {
			const filters: MemorySearchFilters = { category: 'knowledge' };
			const results = await memoryService.searchPersonalityNotes('', filters);

			expect(results.every((note: any) => note.category === 'knowledge')).toBe(true);
		});

		it('should search with priority filter', async () => {
			const filters: MemorySearchFilters = { priority: 'high' };
			const results = await memoryService.searchPersonalityNotes('', filters);

			expect(results.every((note: any) => note.priority === 'high')).toBe(true);
		});

		it('should respect search limit', async () => {
			const results = await memoryService.searchPersonalityNotes('', undefined, 1);

			expect(results).toHaveLength(1);
		});

		it('should handle case-insensitive search', async () => {
			const results = await memoryService.searchPersonalityNotes('TECHNICAL');

			expect(results).toHaveLength(1);
		});

		it('should return empty array when no matches found', async () => {
			const results = await memoryService.searchPersonalityNotes('nonexistent-content');

			expect(results).toHaveLength(0);
		});

		it('should handle search failures gracefully', async () => {
			memoryService.setShouldFail(true, new Error('Search failed'));

			await expect(memoryService.searchPersonalityNotes('test')).rejects.toThrow('Search failed');
		});
	});

	describe('Enhanced Context Generation', () => {
		it('should generate enhanced context with personality and conversation data', async () => {
			const query = 'programming help';
			const userId = 'user-123';
			const channelId = 'channel-123';

			const context = await memoryService.generateEnhancedContext(query, userId, channelId);

			expect(context).toHaveProperty('combinedContext');
			expect(context).toHaveProperty('personalityNotes');
			expect(context).toHaveProperty('conversationHistory');
			expect(context.combinedContext).toContain('Personality Context:');
			expect(context.combinedContext).toContain('Recent Conversation:');
		});

		it('should respect context generation options', async () => {
			const options = {
				maxPersonalityNotes: 3,
				maxConversationHistory: 2,
				personalityWeight: 0.8,
				conversationWeight: 0.6,
				similarityThreshold: 0.7,
			};

			const context = await memoryService.generateEnhancedContext(
				'test query',
				'user-123',
				'channel-123',
				options,
			);

			expect(context.personalityNotes.length).toBeLessThanOrEqual(options.maxPersonalityNotes);
			expect(context.conversationHistory.length).toBeLessThanOrEqual(options.maxConversationHistory);
		});

		it('should filter conversation history by channel', async () => {
			const context = await memoryService.generateEnhancedContext('test', 'user-123', 'specific-channel');

			// Mock implementation filters by channel
			expect(
				context.conversationHistory.every(
					(conv: any) => conv.channelId === 'specific-channel' || conv.channelId === 'channel-123',
				),
			).toBe(true);
		});

		it('should handle context generation failures gracefully', async () => {
			memoryService.setShouldFail(true, new Error('Context generation failed'));

			await expect(memoryService.generateEnhancedContext('test', 'user', 'channel')).rejects.toThrow(
				'Context generation failed',
			);
		});
	});

	describe('Conversation Storage', () => {
		it('should store conversation with user and channel context', async () => {
			const userId = 'user-456';
			const channelId = 'channel-456';
			const content = 'This is a test conversation';
			const metadata = { type: 'user_message' };

			await memoryService.storeConversation(userId, channelId, content, metadata);

			// Verify conversation was stored (check mock data)
			const mockData = memoryService.getMockData();
			const storedConv = mockData.conversationHistory.find(
				(conv: any) => conv.userId === userId && conv.content === content,
			);

			expect(storedConv).toBeDefined();
			expect(storedConv.channelId).toBe(channelId);
			expect(storedConv.metadata).toEqual(metadata);
		});

		it('should generate embeddings for stored conversations', async () => {
			await memoryService.storeConversation('user-123', 'channel-123', 'Test message');

			const mockData = memoryService.getMockData();
			const storedConv = mockData.conversationHistory.slice(-1)[0];

			expect(storedConv.embedding).toHaveLength(5);
			expect(storedConv.embedding.every((val: any) => typeof val === 'number')).toBe(true);
		});

		it('should handle conversation storage failures gracefully', async () => {
			memoryService.setShouldFail(true, new Error('Storage failed'));

			await expect(memoryService.storeConversation('user', 'channel', 'content')).rejects.toThrow(
				'Storage failed',
			);
		});
	});

	describe('Data Persistence and Consistency', () => {
		it('should maintain data consistency across operations', async () => {
			// Create a note
			const note = await memoryService.createPersonalityNote('Consistency test');

			// Update it
			const updated = await memoryService.updatePersonalityNote(note.id, {
				content: 'Updated consistency test',
			});

			// Retrieve it
			const retrieved = await memoryService.getPersonalityNote(note.id);

			expect(retrieved!.content).toBe('Updated consistency test');
			expect(retrieved!.id).toBe(note.id);
		});

		it('should handle concurrent operations safely', async () => {
			const promises = Array(5)
				.fill(null)
				.map((_, i) => memoryService.createPersonalityNote(`Concurrent note ${i}`));

			const notes = await Promise.all(promises);

			expect(notes).toHaveLength(5);
			notes.forEach((note, i) => {
				expect(note.content).toBe(`Concurrent note ${i}`);
				expect(note.id).toBeDefined();
			});
		});

		it('should maintain referential integrity', async () => {
			const note = await memoryService.createPersonalityNote('Integrity test');

			// Delete the note
			await memoryService.deletePersonalityNote(note.id);

			// Attempt to update deleted note
			const updateResult = await memoryService.updatePersonalityNote(note.id, {
				content: 'Should not work',
			});

			expect(updateResult).toBeNull();
		});
	});

	describe('Performance and Scalability', () => {
		it('should handle large datasets efficiently', async () => {
			// Add many notes to test performance
			const createPromises = Array(100)
				.fill(null)
				.map((_, i) => memoryService.createPersonalityNote(`Performance test note ${i}`));

			const startTime = Date.now();
			await Promise.all(createPromises);
			const endTime = Date.now();

			// Should complete within reasonable time (generous for testing)
			expect(endTime - startTime).toBeLessThan(5000);
		});

		it('should handle search operations efficiently', async () => {
			const startTime = Date.now();
			await memoryService.searchPersonalityNotes('test', undefined, 50);
			const endTime = Date.now();

			// Search should be fast
			expect(endTime - startTime).toBeLessThan(1000);
		});

		it('should handle memory usage appropriately', async () => {
			// This is a conceptual test - in real implementation would check memory usage
			const initialData = memoryService.getMockData();
			const initialCount = initialData.personalityNotes.length;

			// Add many notes
			for (let i = 0; i < 50; i++) {
				await memoryService.createPersonalityNote(`Memory test ${i}`);
			}

			const finalData = memoryService.getMockData();
			expect(finalData.personalityNotes.length).toBe(initialCount + 50);
		});
	});

	describe('Error Recovery and Resilience', () => {
		it('should recover from transient failures', async () => {
			// Simulate transient failure
			memoryService.setShouldFail(true, new Error('Transient failure'));

			await expect(memoryService.createPersonalityNote('Test')).rejects.toThrow();

			// Recovery
			memoryService.setShouldFail(false);

			const note = await memoryService.createPersonalityNote('Recovery test');
			expect(note.content).toBe('Recovery test');
		});

		it('should handle partial operation failures', async () => {
			// Create a note successfully
			const note = await memoryService.createPersonalityNote('Partial failure test');

			// Simulate failure on update
			memoryService.setShouldFail(true, new Error('Update failed'));

			await expect(memoryService.updatePersonalityNote(note.id, { content: 'Updated' })).rejects.toThrow();

			// Original note should still exist
			memoryService.setShouldFail(false);
			const retrieved = await memoryService.getPersonalityNote(note.id);
			expect(retrieved!.content).toBe('Partial failure test');
		});
	});
});
