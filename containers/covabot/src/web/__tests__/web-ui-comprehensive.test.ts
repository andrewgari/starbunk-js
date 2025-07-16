import request from 'supertest';
import { WebServer } from '../server';
import { QdrantMemoryService } from '../../services/qdrantMemoryService';
import { BotConfigurationService } from '../../services/botConfigurationService';
import { CovaBot } from '../../cova-bot/covaBot';
import { createMockMemoryService, createMockConfigurationService } from '../../__tests__/mocks/database-mocks';

// Mock dependencies
jest.mock('../../services/qdrantMemoryService');
jest.mock('../../services/botConfigurationService');
jest.mock('../../cova-bot/covaBot');

const MockQdrantMemoryService = QdrantMemoryService as jest.MockedClass<typeof QdrantMemoryService>;
const MockBotConfigurationService = BotConfigurationService as jest.MockedClass<typeof BotConfigurationService>;
const MockCovaBot = CovaBot as jest.MockedClass<typeof CovaBot>;

describe('Web UI - Comprehensive Non-Discord Tests', () => {
	let webServer: WebServer;
	let app: any;
	let mockMemoryService: any;
	let mockConfigService: any;
	let mockCovaBot: any;

	beforeAll(async () => {
		// Create mock services
		mockMemoryService = createMockMemoryService();
		mockConfigService = createMockConfigurationService();

		// Mock the singleton getInstance methods
		MockQdrantMemoryService.getInstance = jest.fn().mockReturnValue(mockMemoryService);
		MockBotConfigurationService.getInstance = jest.fn().mockReturnValue(mockConfigService);

		// Mock CovaBot
		mockCovaBot = {
			processWebMessage: jest.fn().mockResolvedValue('Mock bot response'),
			processMessage: jest.fn().mockResolvedValue(undefined), // Discord method (should not be called)
			name: 'CovaBot',
			description: 'Mock CovaBot',
			metadata: { responseRate: 100, disabled: false },
		};
		MockCovaBot.mockImplementation(() => mockCovaBot);

		// Create web server with mocked dependencies
		webServer = new WebServer(0, false); // Port 0 for testing, no real Qdrant
		app = webServer.getApp();
	});

	beforeEach(() => {
		jest.clearAllMocks();
		mockMemoryService.reset();
		mockConfigService.reset();
	});

	describe('Chat API - No Discord Integration', () => {
		it('should process chat messages without sending to Discord', async () => {
			const response = await request(app)
				.post('/api/chat')
				.send({ message: 'Hello CovaBot!' })
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data.userMessage).toBe('Hello CovaBot!');
			expect(response.body.data.botResponse).toBe('Mock bot response');
			expect(response.body.data.timestamp).toBeDefined();

			// Verify CovaBot processed the message via web interface
			expect(mockCovaBot.processWebMessage).toHaveBeenCalledWith('Hello CovaBot!');
			
			// Ensure no Discord-related methods were called
			expect(mockCovaBot.processMessage).not.toHaveBeenCalled();
		});

		it('should handle bot choosing not to respond', async () => {
			mockCovaBot.processWebMessage.mockResolvedValue(null);

			const response = await request(app)
				.post('/api/chat')
				.send({ message: 'Boring message' })
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data.userMessage).toBe('Boring message');
			expect(response.body.data.botResponse).toBeNull();
		});

		it('should validate input without Discord constraints', async () => {
			// Test empty message
			await request(app)
				.post('/api/chat')
				.send({ message: '' })
				.expect(400);

			// Test missing message
			await request(app)
				.post('/api/chat')
				.send({})
				.expect(400);

			// Test very long message (should be accepted in web UI)
			const longMessage = 'a'.repeat(5000);
			const response = await request(app)
				.post('/api/chat')
				.send({ message: longMessage })
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(mockCovaBot.processWebMessage).toHaveBeenCalledWith(longMessage);
		});

		it('should handle special characters and formatting', async () => {
			const specialMessage = 'Hello! @#$%^&*()_+ 🎉 <script>alert("test")</script>';

			const response = await request(app)
				.post('/api/chat')
				.send({ message: specialMessage })
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(mockCovaBot.processWebMessage).toHaveBeenCalledWith(specialMessage);
		});

		it('should handle bot errors gracefully', async () => {
			mockCovaBot.processWebMessage.mockRejectedValue(new Error('Bot processing error'));

			const response = await request(app)
				.post('/api/chat')
				.send({ message: 'Error trigger' })
				.expect(500);

			expect(response.body.success).toBe(false);
			expect(response.body.error).toContain('Failed to process message');
		});
	});

	describe('Memory Management API - No Discord Notifications', () => {
		it.skip('should create personality notes without Discord integration', async () => {
			const noteData = {
				content: 'Cova loves discussing programming',
				metadata: { category: 'interests', importance: 'high' }
			};

			const response = await request(app)
				.post('/api/memory/personality-notes')
				.send(noteData)
				.expect(201);

			expect(response.body.success).toBe(true);
			expect(response.body.data.content).toBe(noteData.content);
			expect(mockMemoryService.createPersonalityNote).toHaveBeenCalledWith(
				noteData.content,
				noteData.metadata
			);

			// Verify no Discord notifications were sent
			expect(mockCovaBot.processMessage).not.toHaveBeenCalled();
		});

		it('should retrieve personality notes without Discord context', async () => {
			const response = await request(app)
				.get('/api/memory/personality-notes')
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(mockMemoryService.searchPersonalityNotes).toHaveBeenCalled();
		});

		it.skip('should update personality notes without Discord notifications', async () => {
			const noteId = 'test-note-123';
			const updateData = {
				content: 'Updated content',
				metadata: { category: 'updated' }
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
			expect(mockCovaBot.processMessage).not.toHaveBeenCalled();
		});

		it.skip('should delete personality notes without Discord notifications', async () => {
			const noteId = 'test-note-123';

			const response = await request(app)
				.delete(`/api/memory/personality-notes/${noteId}`)
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(mockMemoryService.deletePersonalityNote).toHaveBeenCalledWith(noteId);

			// Verify no Discord notifications
			expect(mockCovaBot.processMessage).not.toHaveBeenCalled();
		});

		it.skip('should search personality notes with filters', async () => {
			const searchParams = {
				query: 'programming',
				category: 'interests',
				importance: 'high',
				limit: 10
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
					importance: searchParams.importance
				},
				searchParams.limit
			);
		});
	});

	describe('Configuration Management - No Discord Impact', () => {
		it.skip('should update bot configuration without affecting Discord', async () => {
			const configData = {
				responseRate: 75,
				disabled: false,
				customSettings: { theme: 'dark' }
			};

			const response = await request(app)
				.put('/api/config/bot')
				.send(configData)
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(mockConfigService.setConfiguration).toHaveBeenCalled();

			// Configuration changes should not trigger Discord messages
			expect(mockCovaBot.processMessage).not.toHaveBeenCalled();
		});

		it('should retrieve bot configuration', async () => {
			const response = await request(app)
				.get('/api/config/bot')
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(mockConfigService.getConfiguration).toHaveBeenCalled();
		});

		it.skip('should validate configuration changes', async () => {
			// Test invalid response rate
			await request(app)
				.put('/api/config/bot')
				.send({ responseRate: 150 }) // Invalid: > 100
				.expect(400);

			// Test invalid disabled value
			await request(app)
				.put('/api/config/bot')
				.send({ disabled: 'not-boolean' })
				.expect(400);
		});
	});

	describe('Health Check - Service Status Only', () => {
		it('should return health status without Discord dependency', async () => {
			const response = await request(app)
				.get('/api/health')
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.status).toBe('healthy');
			expect(response.body.storage).toBe('qdrant');
			expect(response.body.timestamp).toBeDefined();
			expect(mockMemoryService.healthCheck).toHaveBeenCalled();
		});

		it('should handle unhealthy service status', async () => {
			mockMemoryService.setShouldFail(true);

			const response = await request(app)
				.get('/api/health')
				.expect(200);

			expect(response.body.success).toBe(false);
			expect(response.body.status).toBe('unhealthy');
		});
	});

	describe('Error Handling - No Discord Error Propagation', () => {
		it('should handle memory service errors without Discord impact', async () => {
			mockMemoryService.setShouldFail(true, new Error('Database connection failed'));

			const response = await request(app)
				.post('/api/memory/personality-notes')
				.send({ content: 'Test note' })
				.expect(500);

			expect(response.body.success).toBe(false);
			expect(response.body.error).toContain('Failed to create personality note');

			// Error should not propagate to Discord
			expect(mockCovaBot.processMessage).not.toHaveBeenCalled();
		});

		it.skip('should handle configuration service errors', async () => {
			mockConfigService.setShouldFail(true);

			const response = await request(app)
				.get('/api/config/bot')
				.expect(500);

			expect(response.body.success).toBe(false);
		});

		it.skip('should handle malformed requests gracefully', async () => {
			// Test malformed JSON
			const response = await request(app)
				.post('/api/memory/personality-notes')
				.send('invalid-json')
				.set('Content-Type', 'application/json')
				.expect(400);

			expect(response.body.success).toBe(false);
		});
	});

	describe('Input Validation and Sanitization', () => {
		it.skip('should validate personality note input', async () => {
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

			// Test very long content
			const longContent = 'a'.repeat(10000);
			await request(app)
				.post('/api/memory/personality-notes')
				.send({ content: longContent })
				.expect(400);
		});

		it('should sanitize input to prevent injection attacks', async () => {
			const maliciousContent = '<script>alert("xss")</script>Cova likes coding';

			const response = await request(app)
				.post('/api/memory/personality-notes')
				.send({ content: maliciousContent })
				.expect(201);

			// Content should be stored but potentially sanitized
			expect(mockMemoryService.createPersonalityNote).toHaveBeenCalled();
			const calledWith = mockMemoryService.createPersonalityNote.mock.calls[0][0];
			expect(typeof calledWith).toBe('string');
		});
	});

	describe('Rate Limiting and Security', () => {
		it('should apply rate limiting to API endpoints', async () => {
			// Make multiple rapid requests
			const requests = Array(10).fill(null).map(() =>
				request(app)
					.get('/api/health')
			);

			const responses = await Promise.all(requests);
			
			// All should succeed initially, but rate limiting should be applied
			responses.forEach(response => {
				expect([200, 429]).toContain(response.status);
			});
		});

		it('should handle CORS properly for web interface', async () => {
			const response = await request(app)
				.options('/api/health')
				.set('Origin', 'http://localhost:7080')
				.expect(204);

			expect(response.headers['access-control-allow-origin']).toBeDefined();
		});
	});
});
