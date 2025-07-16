import { PersonalityNote } from '../../types/personalityNote';
import { MemorySearchFilters, PersonalityCategory, Priority } from '../../types/memoryTypes';

/**
 * Mock personality notes for testing
 */
export const MOCK_PERSONALITY_NOTES: PersonalityNote[] = [
	{
		id: '1',
		content: 'Cova loves discussing technical topics and programming',
		category: 'knowledge',
		priority: 'high',
		isActive: true,
		createdAt: new Date('2024-01-01T10:00:00Z'),
		updatedAt: new Date('2024-01-01T10:00:00Z'),
	},
	{
		id: '2',
		content: 'Cova is supportive and encouraging to community members',
		category: 'personality',
		priority: 'high',
		isActive: true,
		createdAt: new Date('2024-01-02T10:00:00Z'),
		updatedAt: new Date('2024-01-02T10:00:00Z'),
	},
	{
		id: '3',
		content: 'Cova enjoys casual conversations and making jokes',
		category: 'behavior',
		priority: 'medium',
		isActive: true,
		createdAt: new Date('2024-01-03T10:00:00Z'),
		updatedAt: new Date('2024-01-03T10:00:00Z'),
	},
];

/**
 * Mock conversation history
 */
export const MOCK_CONVERSATION_HISTORY = [
	{
		id: 'conv-1',
		userId: 'user-123',
		channelId: 'channel-123',
		content: 'Hey Cova, how are you doing today?',
		timestamp: new Date('2024-01-01T12:00:00Z'),
		embedding: [0.4, 0.5, 0.6, 0.7, 0.8],
	},
	{
		id: 'conv-2',
		userId: 'user-456',
		channelId: 'channel-123',
		content: 'Can you help me with this coding problem?',
		timestamp: new Date('2024-01-01T12:05:00Z'),
		embedding: [0.5, 0.6, 0.7, 0.8, 0.9],
	},
];

/**
 * Mock Qdrant Memory Service for testing
 */
export class MockQdrantMemoryService {
	private personalityNotes: PersonalityNote[] = [...MOCK_PERSONALITY_NOTES];
	private conversationHistory: any[] = [...MOCK_CONVERSATION_HISTORY];
	private shouldFail: boolean = false;
	private failureError: Error = new Error('Mock database connection failed');

	/**
	 * Configure the mock to fail on next operation
	 */
	setShouldFail(shouldFail: boolean, error?: Error): void {
		this.shouldFail = shouldFail;
		if (error) {
			this.failureError = error;
		}
	}

	/**
	 * Mock health check
	 */
	async healthCheck(): Promise<{ status: string; details?: any }> {
		if (this.shouldFail) {
			return { status: 'unhealthy', details: { error: this.failureError.message } };
		}
		return { status: 'healthy', details: { collections: 2, points: this.personalityNotes.length } };
	}

	/**
	 * Mock personality note creation
	 */
	async createPersonalityNote(content: string, metadata?: any): Promise<PersonalityNote> {
		if (this.shouldFail) {
			throw this.failureError;
		}

		// Extract category and priority from metadata, with fallbacks
		const category: PersonalityCategory = metadata?.category || 'knowledge';
		const priority: Priority = metadata?.importance || metadata?.priority || 'medium';

		const note: PersonalityNote = {
			id: `mock-${Date.now()}`,
			content,
			category,
			priority,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		this.personalityNotes.push(note);
		return note;
	}

	/**
	 * Mock personality note retrieval
	 */
	async getPersonalityNote(id: string): Promise<PersonalityNote | null> {
		if (this.shouldFail) {
			throw this.failureError;
		}

		return this.personalityNotes.find(note => note.id === id) || null;
	}

	/**
	 * Mock personality notes search
	 */
	async searchPersonalityNotes(
		query: string,
		filters?: MemorySearchFilters,
		limit: number = 10
	): Promise<PersonalityNote[]> {
		if (this.shouldFail) {
			throw this.failureError;
		}

		// Simple mock search - return notes that contain the query
		let results = this.personalityNotes.filter(note => 
			note.content.toLowerCase().includes(query.toLowerCase())
		);

		// Apply filters if provided
		if (filters?.category) {
			results = results.filter(note => note.category === filters.category);
		}

		if (filters?.priority) {
			results = results.filter(note => note.priority === filters.priority);
		}

		return results.slice(0, limit);
	}

	/**
	 * Mock personality note update
	 */
	async updatePersonalityNote(id: string, updates: Partial<PersonalityNote>): Promise<PersonalityNote | null> {
		if (this.shouldFail) {
			throw this.failureError;
		}

		const noteIndex = this.personalityNotes.findIndex(note => note.id === id);
		if (noteIndex === -1) {
			return null;
		}

		this.personalityNotes[noteIndex] = {
			...this.personalityNotes[noteIndex],
			...updates,
			updatedAt: new Date(),
		};

		return this.personalityNotes[noteIndex];
	}

	/**
	 * Mock personality note deletion
	 */
	async deletePersonalityNote(id: string): Promise<boolean> {
		if (this.shouldFail) {
			throw this.failureError;
		}

		const noteIndex = this.personalityNotes.findIndex(note => note.id === id);
		if (noteIndex === -1) {
			return false;
		}

		this.personalityNotes.splice(noteIndex, 1);
		return true;
	}

	/**
	 * Mock enhanced context generation
	 */
	async generateEnhancedContext(
		query: string,
		userId: string,
		channelId: string,
		options?: any
	): Promise<{ combinedContext: string; personalityNotes: PersonalityNote[]; conversationHistory: any[] }> {
		if (this.shouldFail) {
			throw this.failureError;
		}

		const relevantNotes = await this.searchPersonalityNotes(query, undefined, options?.maxPersonalityNotes || 5);
		const relevantHistory = this.conversationHistory
			.filter(conv => conv.channelId === channelId)
			.slice(0, options?.maxConversationHistory || 5);

		const combinedContext = [
			'Personality Context:',
			...relevantNotes.map(note => `- ${note.content}`),
			'',
			'Recent Conversation:',
			...relevantHistory.map(conv => `- ${conv.content}`),
		].join('\n');

		return {
			combinedContext,
			personalityNotes: relevantNotes,
			conversationHistory: relevantHistory,
		};
	}

	/**
	 * Mock conversation storage
	 */
	async storeConversation(
		userId: string,
		channelId: string,
		content: string,
		metadata?: any
	): Promise<void> {
		if (this.shouldFail) {
			throw this.failureError;
		}

		this.conversationHistory.push({
			id: `conv-${Date.now()}`,
			userId,
			channelId,
			content,
			timestamp: new Date(),
			embedding: [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()],
			metadata: metadata || {},
		});
	}

	/**
	 * Reset mock data to initial state
	 */
	reset(): void {
		this.personalityNotes = [...MOCK_PERSONALITY_NOTES];
		this.conversationHistory = [...MOCK_CONVERSATION_HISTORY];
		this.shouldFail = false;
		this.failureError = new Error('Mock database connection failed');
	}

	/**
	 * Get current mock data for testing
	 */
	getMockData(): { personalityNotes: PersonalityNote[]; conversationHistory: any[] } {
		return {
			personalityNotes: [...this.personalityNotes],
			conversationHistory: [...this.conversationHistory],
		};
	}

	/**
	 * Set mock data for testing
	 */
	setMockData(data: { personalityNotes?: PersonalityNote[]; conversationHistory?: any[] }): void {
		if (data.personalityNotes) {
			this.personalityNotes = [...data.personalityNotes];
		}
		if (data.conversationHistory) {
			this.conversationHistory = [...data.conversationHistory];
		}
	}
}

/**
 * Interface describing the mock memory service returned by createMockMemoryService
 */
export interface MockMemoryService {
	// Core QdrantMemoryService methods
	createPersonalityNote: jest.MockedFunction<(content: string, metadata?: any) => Promise<PersonalityNote>>;
	getPersonalityNote: jest.MockedFunction<(id: string) => Promise<PersonalityNote | null>>;
	searchPersonalityNotes: jest.MockedFunction<(query: string, filters?: MemorySearchFilters, limit?: number) => Promise<PersonalityNote[]>>;
	updatePersonalityNote: jest.MockedFunction<(id: string, updates: Partial<PersonalityNote>) => Promise<PersonalityNote | null>>;
	deletePersonalityNote: jest.MockedFunction<(id: string) => Promise<boolean>>;
	storeConversation: jest.MockedFunction<(userId: string, channelId: string, content: string, metadata?: any) => Promise<void>>;
	generateEnhancedContext: jest.MockedFunction<(query: string, userId: string, channelId: string, options?: any) => Promise<{ combinedContext: string; personalityNotes: PersonalityNote[]; conversationHistory: any[] }>>;
	healthCheck: jest.MockedFunction<() => Promise<{ status: string; details?: any }>>;

	// WebServer compatibility methods
	createNote: jest.MockedFunction<(request: any) => Promise<PersonalityNote>>;
	getNotes: jest.MockedFunction<(filters?: any) => Promise<PersonalityNote[]>>;
	getNoteById: jest.MockedFunction<(id: string) => Promise<PersonalityNote | null>>;
	updateNote: jest.MockedFunction<(id: string, request: any) => Promise<PersonalityNote | null>>;
	deleteNote: jest.MockedFunction<(id: string) => Promise<boolean>>;
	searchMemory: jest.MockedFunction<(query: string, filters?: any) => Promise<PersonalityNote[]>>;
	getStats: jest.MockedFunction<() => Promise<{ totalNotes: number; activeNotes: number; inactiveNotes: number }>>;
	getActiveNotesForLLM: jest.MockedFunction<() => Promise<string>>;
	initialize: jest.MockedFunction<() => Promise<void>>;

	// Mock control methods
	reset: () => void;
	setShouldFail: (shouldFail: boolean, error?: Error) => void;
	getMockData: () => { personalityNotes: PersonalityNote[]; conversationHistory: any[] };
	setMockData: (data: any) => void;
}

/**
 * Factory function to create a mock memory service with Jest mock methods
 */
export function createMockMemoryService(): MockMemoryService {
	const mockService = new MockQdrantMemoryService();

	// Add Jest mock methods for compatibility with tests
	return {
		...mockService,
		// Alias methods for test compatibility
		createPersonalityNote: jest.fn().mockImplementation((content: string, metadata?: any) =>
			mockService.createPersonalityNote(content, metadata)
		),
		getPersonalityNote: jest.fn().mockImplementation((id: string) =>
			mockService.getPersonalityNote(id)
		),
		searchPersonalityNotes: jest.fn().mockImplementation((query: string, filters?: MemorySearchFilters, limit?: number) =>
			mockService.searchPersonalityNotes(query, filters, limit)
		),
		updatePersonalityNote: jest.fn().mockImplementation((id: string, updates: Partial<PersonalityNote>) =>
			mockService.updatePersonalityNote(id, updates)
		),
		deletePersonalityNote: jest.fn().mockImplementation((id: string) =>
			mockService.deletePersonalityNote(id)
		),
		storeConversation: jest.fn().mockImplementation((userId: string, channelId: string, content: string, metadata?: any) =>
			mockService.storeConversation(userId, channelId, content, metadata)
		),
		generateEnhancedContext: jest.fn().mockImplementation((query: string, userId: string, channelId: string, options?: any) =>
			mockService.generateEnhancedContext(query, userId, channelId, options)
		),
		healthCheck: jest.fn().mockImplementation(() =>
			mockService.healthCheck()
		),
		// Main service methods (for WebServer compatibility)
		createNote: jest.fn().mockImplementation((request: any) =>
			mockService.createPersonalityNote(request.content, { category: request.category, priority: request.priority })
		),
		getNotes: jest.fn().mockImplementation((filters?: any) => {
			// Simple implementation for testing
			return Promise.resolve(mockService.getMockData().personalityNotes.filter(note => {
				if (filters?.category && note.category !== filters.category) return false;
				if (filters?.priority && note.priority !== filters.priority) return false;
				if (filters?.isActive !== undefined && note.isActive !== filters.isActive) return false;
				if (filters?.search && !note.content.toLowerCase().includes(filters.search.toLowerCase())) return false;
				return true;
			}));
		}),
		getNoteById: jest.fn().mockImplementation((id: string) =>
			mockService.getPersonalityNote(id)
		),
		updateNote: jest.fn().mockImplementation((id: string, request: any) =>
			mockService.updatePersonalityNote(id, request)
		),
		deleteNote: jest.fn().mockImplementation((id: string) =>
			mockService.deletePersonalityNote(id)
		),
		searchMemory: jest.fn().mockImplementation((query: string, filters?: any) =>
			mockService.searchPersonalityNotes(query, filters)
		),
		getStats: jest.fn().mockImplementation(() => {
			const notes = mockService.getMockData().personalityNotes;
			return Promise.resolve({
				totalNotes: notes.length,
				activeNotes: notes.filter(n => n.isActive).length,
				inactiveNotes: notes.filter(n => !n.isActive).length
			});
		}),
		getActiveNotesForLLM: jest.fn().mockImplementation(() => {
			const activeNotes = mockService.getMockData().personalityNotes.filter(n => n.isActive);
			return Promise.resolve(activeNotes.map(n => n.content).join('\n'));
		}),
		initialize: jest.fn().mockResolvedValue(undefined),
		reset: () => mockService.reset(),
		setShouldFail: (shouldFail: boolean, error?: Error) => mockService.setShouldFail(shouldFail, error),
		getMockData: () => mockService.getMockData(),
		setMockData: (data: any) => mockService.setMockData(data)
	};
}

/**
 * Mock Bot Configuration Service
 */
export class MockBotConfigurationService {
	private configurations: Map<string, any> = new Map();
	private shouldFail: boolean = false;

	setShouldFail(shouldFail: boolean): void {
		this.shouldFail = shouldFail;
	}

	async getConfiguration(key: string): Promise<any> {
		if (this.shouldFail) {
			throw new Error('Mock configuration service failure');
		}
		return this.configurations.get(key);
	}

	async setConfiguration(key: string, value: any): Promise<void> {
		if (this.shouldFail) {
			throw new Error('Mock configuration service failure');
		}
		this.configurations.set(key, value);
	}

	reset(): void {
		this.configurations.clear();
		this.shouldFail = false;
	}
}

/**
 * Interface representing the bot configuration object structure
 */
export interface BotConfiguration {
	isEnabled: boolean;
	responseFrequency: number;
	maxResponseLength: number;
	debugMode: boolean;
}

/**
 * Interface describing the mock configuration service returned by createMockConfigurationService
 */
export interface MockConfigurationService {
	// Core configuration service methods
	getConfiguration: jest.MockedFunction<(key?: string) => Promise<any>>;
	setConfiguration: jest.MockedFunction<(key: string, value: any) => Promise<void>>;
	updateConfiguration: jest.MockedFunction<(updates: Partial<BotConfiguration>) => Promise<BotConfiguration>>;
	createConfiguration: jest.MockedFunction<(request: Partial<BotConfiguration>) => Promise<BotConfiguration>>;
	resetToDefaults: jest.MockedFunction<() => Promise<BotConfiguration>>;
	loadConfiguration: jest.MockedFunction<() => Promise<void>>;

	// Mock control methods
	reset: () => void;
	setShouldFail: (shouldFail: boolean) => void;
}

/**
 * Factory function to create a mock configuration service with Jest mock methods
 */
export function createMockConfigurationService(): MockConfigurationService {
	const mockService = new MockBotConfigurationService();

	return {
		...mockService,
		getConfiguration: jest.fn().mockImplementation((key?: string) => {
			if (key) {
				return mockService.getConfiguration(key);
			}
			// Return default configuration for no key
			return Promise.resolve({
				isEnabled: true,
				responseFrequency: 0.3,
				maxResponseLength: 2000,
				debugMode: false
			});
		}),
		setConfiguration: jest.fn().mockImplementation((key: string, value: any) =>
			mockService.setConfiguration(key, value)
		),
		updateConfiguration: jest.fn().mockImplementation((updates: any) => {
			// Simple implementation for testing
			return Promise.resolve({
				isEnabled: true,
				responseFrequency: 0.3,
				maxResponseLength: 2000,
				debugMode: false,
				...updates
			});
		}),
		createConfiguration: jest.fn().mockImplementation((request: any) => {
			return Promise.resolve({
				isEnabled: true,
				responseFrequency: 0.3,
				maxResponseLength: 2000,
				debugMode: false,
				...request
			});
		}),
		resetToDefaults: jest.fn().mockImplementation(() => {
			return Promise.resolve({
				isEnabled: true,
				responseFrequency: 0.3,
				maxResponseLength: 2000,
				debugMode: false
			});
		}),
		loadConfiguration: jest.fn().mockResolvedValue(undefined),
		reset: () => mockService.reset(),
		setShouldFail: (shouldFail: boolean) => mockService.setShouldFail(shouldFail)
	};
}
