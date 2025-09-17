import { v4 as uuidv4 } from 'uuid';
import { logger } from '@starbunk/shared';
import { QdrantService } from './qdrantService';
import { EmbeddingService } from './embeddingService';
import {
	// MemoryItem, // Unused import
	PersonalityMemory,
	ConversationMemory,
	MemorySearchFilters,
	MemorySearchResult,
	CreatePersonalityNoteRequest,
	UpdatePersonalityNoteRequest,
	CreateConversationRequest,
	ContextGenerationOptions,
	GeneratedContext,
	MemoryStats,
	HealthCheckResult,
	PersonalityCategory,
	Priority,
} from '../types/memoryTypes';

// Compatibility types for legacy API calls (replacing any)
interface PersonalityNoteMetadataCompat {
	category?: PersonalityCategory;
	priority?: Priority;
	importance?: Priority; // legacy alias for priority
}

interface PersonalityNoteUpdateCompat {
	content?: string;
	category?: PersonalityCategory;
	priority?: Priority;
	importance?: Priority; // legacy alias for priority
	isActive?: boolean;
}

interface PersonalityNoteSearchFiltersCompat {
	category?: PersonalityCategory;
	priority?: Priority;
	importance?: Priority; // legacy alias for priority
}

/**
 * Unified memory service using Qdrant for both personality notes and conversation history
 * Replaces PersonalityNotesService and PersonalityNotesServiceDb
 */
export class QdrantMemoryService {
	private static instance: QdrantMemoryService;
	private qdrantService: QdrantService;
	private embeddingService: EmbeddingService;
	private isInitialized = false;
	private performanceMetrics = {
		searchTimes: [] as number[],
		embeddingTimes: [] as number[],
	};

	constructor() {
		this.qdrantService = QdrantService.getInstance();
		this.embeddingService = EmbeddingService.getInstance();
	}

	static getInstance(): QdrantMemoryService {
		if (!QdrantMemoryService.instance) {
			QdrantMemoryService.instance = new QdrantMemoryService();
		}
		return QdrantMemoryService.instance;
	}

	/**
	 * Initialize the memory service
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		try {
			logger.info('[QdrantMemoryService] Initializing...');

			// Initialize services in parallel
			await Promise.all([this.qdrantService.initialize(), this.embeddingService.initialize()]);

			this.isInitialized = true;
			logger.info('[QdrantMemoryService] Initialization complete');
		} catch (error) {
			logger.error(
				`[QdrantMemoryService] Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			throw error;
		}
	}

	// =============================================================================
	// PERSONALITY NOTES API (maintains compatibility with existing PersonalityNotesService)
	// =============================================================================

	/**
	 * Get personality notes with optional filtering
	 */
	async getNotes(filters: Partial<MemorySearchFilters> = {}): Promise<PersonalityMemory[]> {
		await this.ensureInitialized();

		try {
			const searchFilters: MemorySearchFilters = {
				...filters,
				type: 'personality',
				limit: filters.limit || 100,
			};

			if (filters.search) {
				// Semantic search using embedding
				const queryEmbedding = await this.embeddingService.generateEmbedding(filters.search);
				const results = await this.qdrantService.searchSimilar(queryEmbedding, searchFilters);
				return results.map((r) => r.item as PersonalityMemory);
			} else {
				// Get all personality notes and filter
				const allResults = await this.qdrantService.searchSimilar(
					new Array(this.embeddingService.getConfig().dimensions).fill(0), // Zero vector for all results
					{ ...searchFilters, similarityThreshold: 0 },
				);
				return allResults.map((r) => r.item as PersonalityMemory);
			}
		} catch (error) {
			logger.error(
				`[QdrantMemoryService] Failed to get notes: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			throw error;
		}
	}

	/**
	 * Get personality note by ID
	 */
	async getNoteById(id: string): Promise<PersonalityMemory | null> {
		await this.ensureInitialized();

		try {
			const item = await this.qdrantService.getMemoryItem(id, 'personality');
			return item as PersonalityMemory | null;
		} catch (error) {
			logger.error(
				`[QdrantMemoryService] Failed to get note by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			throw error;
		}
	}

	/**
	 * Create a new personality note
	 */
	async createNote(request: CreatePersonalityNoteRequest): Promise<PersonalityMemory> {
		await this.ensureInitialized();

		try {
			const startTime = Date.now();

			// Generate embedding
			const embedding = await this.embeddingService.generateEmbedding(request.content);
			this.recordEmbeddingTime(Date.now() - startTime);

			// Create memory item
			const _now = new Date();
			const note: PersonalityMemory = {
				id: uuidv4(),
				type: 'personality',
				content: request.content.trim(),
				category: request.category,
				priority: request.priority || 'medium',
				isActive: true,
				tokens: this.tokenizeContent(request.content),
				embedding,
				createdAt: now,
				updatedAt: now,
				metadata: {},
			};

			// Store in Qdrant
			await this.qdrantService.storeMemoryItem(note);

			logger.info(`[QdrantMemoryService] Created personality note: ${note.id} (${note.category})`);
			return note;
		} catch (error) {
			logger.error(
				`[QdrantMemoryService] Failed to create note: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			throw error;
		}
	}

	/**
	 * Create a new personality note with content and optional metadata (for test compatibility)
	 */
	async createPersonalityNote(content: string, metadata?: PersonalityNoteMetadataCompat): Promise<PersonalityMemory> {
		const request: CreatePersonalityNoteRequest = {
			content,
			category: metadata?.category || 'knowledge',
			priority: metadata?.importance || metadata?.priority || 'medium',
		};

		const note = await this.createNote(request);

		// Add the metadata and embedding to the returned note for test compatibility
		note.metadata = (metadata as Record<string, unknown>) || {};
		note.embedding = note.embedding || []; // Ensure embedding field exists

		return note;
	}

	/**
	 * Update personality note (for test compatibility)
	 */
	async updatePersonalityNote(id: string, updates: PersonalityNoteUpdateCompat): Promise<PersonalityMemory | null> {
		const request: UpdatePersonalityNoteRequest = {
			content: updates.content,
			category: updates.category,
			priority: updates.priority || updates.importance,
			isActive: updates.isActive,
		};

		return this.updateNote(id, request);
	}

	/**
	 * Delete personality note (for test compatibility)
	 */
	async deletePersonalityNote(id: string): Promise<boolean> {
		return this.deleteNote(id);
	}

	/**
	 * Search personality notes (for test compatibility)
	 */
	async searchPersonalityNotes(
		query: string,
		filters?: PersonalityNoteSearchFiltersCompat,
		limit?: number,
	): Promise<PersonalityMemory[]> {
		const searchFilters: MemorySearchFilters = {
			search: query,
			category: filters?.category,
			priority: filters?.importance || filters?.priority,
			limit: limit || 10,
		};

		const results = await this.searchNotes(searchFilters);
		return results.items;
	}

	/**
	 * Get personality note (alias for getNoteById for test compatibility)
	 */
	async getPersonalityNote(id: string): Promise<PersonalityMemory | null> {
		return this.getNoteById(id);
	}

	/**
	 * Search notes (alias for getNotes for test compatibility)
	 */
	async searchNotes(filters: MemorySearchFilters): Promise<{ items: PersonalityMemory[] }> {
		const items = await this.getNotes(filters);
		return { items };
	}

	/**
	 * Update an existing personality note
	 */
	async updateNote(id: string, request: UpdatePersonalityNoteRequest): Promise<PersonalityMemory | null> {
		await this.ensureInitialized();

		try {
			// Get existing note
			const existingNote = await this.getNoteById(id);
			if (!existingNote) {
				return null;
			}

			// Update fields
			const updatedNote: PersonalityMemory = {
				...existingNote,
				updatedAt: new Date(),
			};

			if (request.content !== undefined) {
				updatedNote.content = request.content.trim();
				updatedNote.tokens = this.tokenizeContent(updatedNote.content);
				// Regenerate embedding for new content
				updatedNote.embedding = await this.embeddingService.generateEmbedding(updatedNote.content);
			}

			if (request.category !== undefined) {
				updatedNote.category = request.category;
			}

			if (request.priority !== undefined) {
				updatedNote.priority = request.priority;
			}

			if (request.isActive !== undefined) {
				updatedNote.isActive = request.isActive;
			}

			// Store updated note
			await this.qdrantService.updateMemoryItem(updatedNote);

			logger.info(`[QdrantMemoryService] Updated personality note: ${id}`);
			return updatedNote;
		} catch (error) {
			logger.error(
				`[QdrantMemoryService] Failed to update note: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			throw error;
		}
	}

	/**
	 * Delete a personality note
	 */
	async deleteNote(id: string): Promise<boolean> {
		await this.ensureInitialized();

		try {
			const deleted = await this.qdrantService.deleteMemoryItem(id, 'personality');
			if (deleted) {
				logger.info(`[QdrantMemoryService] Deleted personality note: ${id}`);
			}
			return deleted;
		} catch (error) {
			logger.error(
				`[QdrantMemoryService] Failed to delete note: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			throw error;
		}
	}

	/**
	 * Get active personality notes formatted for LLM context
	 */
	async getActiveNotesForLLM(): Promise<string> {
		try {
			const activeNotes = await this.getNotes({ isActive: true });

			if (activeNotes.length === 0) {
				return '';
			}

			// Group notes by category and priority
			const notesByCategory = activeNotes.reduce(
				(acc, note) => {
					if (!acc[note.category]) {
						acc[note.category] = [];
					}
					acc[note.category].push(note);
					return acc;
				},
				{} as Record<string, PersonalityMemory[]>,
			);

			let contextString = 'PERSONALITY INSTRUCTIONS:\n\n';

			// Add notes by category in priority order
			const categoryOrder = ['instruction', 'personality', 'behavior', 'context', 'knowledge'];

			for (const category of categoryOrder) {
				if (notesByCategory[category]) {
					contextString += `${category.charAt(0).toUpperCase() + category.slice(1)}:\n`;
					for (const note of notesByCategory[category]) {
						const priorityPrefix = note.priority === 'high' ? '[IMPORTANT] ' : '';
						contextString += `- ${priorityPrefix}${note.content}\n`;
					}
					contextString += '\n';
				}
			}

			return contextString.trim();
		} catch (error) {
			logger.error(
				`[QdrantMemoryService] Failed to get active notes for LLM: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			return '';
		}
	}

	// =============================================================================
	// CONVERSATION MEMORY API (new functionality)
	// =============================================================================

	/**
	 * Store a conversation message
	 */
	async storeConversation(request: CreateConversationRequest): Promise<ConversationMemory> {
		await this.ensureInitialized();

		try {
			const startTime = Date.now();

			// Generate embedding
			const embedding = await this.embeddingService.generateEmbedding(request.content);
			this.recordEmbeddingTime(Date.now() - startTime);

			// Create conversation memory
			const _now = new Date();
			const conversation: ConversationMemory = {
				id: uuidv4(),
				type: 'conversation',
				content: request.content.trim(),
				userId: request.userId,
				channelId: request.channelId,
				messageType: request.messageType,
				conversationId: request.conversationId || `${request.channelId}_${Date.now()}`,
				sentiment: await this.analyzeSentiment(request.content),
				topics: await this.extractTopics(request.content),
				replyToId: request.replyToId,
				embedding,
				createdAt: now,
				updatedAt: now,
				metadata: {},
			};

			// Store in Qdrant
			await this.qdrantService.storeMemoryItem(conversation);

			logger.debug(`[QdrantMemoryService] Stored conversation: ${conversation.id}`);
			return conversation;
		} catch (error) {
			logger.error(
				`[QdrantMemoryService] Failed to store conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			throw error;
		}
	}

	/**
	 * Get relevant conversation context for LLM
	 */
	async getConversationContext(
		currentMessage: string,
		userId: string,
		channelId: string,
		options: ContextGenerationOptions = {},
	): Promise<string> {
		await this.ensureInitialized();

		try {
			const startTime = Date.now();

			// Generate embedding for current message
			const queryEmbedding = await this.embeddingService.generateEmbedding(currentMessage);

			// Search for relevant conversations
			const searchFilters: MemorySearchFilters = {
				type: 'conversation',
				limit: options.maxConversationHistory || 10,
				similarityThreshold: options.similarityThreshold || 0.6,
				timeRange: {
					start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
				},
			};

			// Prefer same user/channel but allow cross-channel if needed
			const results = await this.qdrantService.searchSimilar(queryEmbedding, searchFilters);
			this.recordSearchTime(Date.now() - startTime);

			if (results.length === 0) {
				return '';
			}

			// Format context
			let context = 'RELEVANT CONVERSATION HISTORY:\n\n';

			for (const _result of results) {
				const conv = result.item as ConversationMemory;
				const timeAgo = this.getTimeAgo(conv.createdAt);
				const userLabel = conv.messageType === 'user' ? 'User' : 'Cova';

				context += `[${timeAgo}] ${userLabel}: ${conv.content}\n`;

				// Stop if similarity drops too low
				if (result.score < (options.similarityThreshold || 0.6)) break;
			}

			return context.trim();
		} catch (error) {
			logger.error(
				`[QdrantMemoryService] Failed to get conversation context: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			return '';
		}
	}

	/**
	 * Generate enhanced context combining personality and conversation history
	 */
	async generateEnhancedContext(
		currentMessage: string,
		userId: string,
		channelId: string,
		options: ContextGenerationOptions = {},
	): Promise<GeneratedContext> {
		await this.ensureInitialized();

		try {
			// Get both personality and conversation context
			const [personalityContext, conversationContext] = await Promise.all([
				this.getActiveNotesForLLM(),
				this.getConversationContext(currentMessage, userId, channelId, options),
			]);

			// Combine contexts with weights
			const _personalityWeight = options.personalityWeight || 1.0; // Reserved for future weighting
			const _conversationWeight = options.conversationWeight || 0.8; // Reserved for future weighting

			let combinedContext = '';

			if (personalityContext) {
				combinedContext += personalityContext;
			}

			if (conversationContext) {
				if (combinedContext) combinedContext += '\n\n';
				combinedContext += conversationContext;
			}

			return {
				personalityContext,
				conversationContext,
				combinedContext,
				metadata: {
					personalityNotesUsed: personalityContext
						? personalityContext.split('\n').filter((l) => l.startsWith('- ')).length
						: 0,
					conversationItemsUsed: conversationContext
						? conversationContext.split('\n').filter((l) => l.startsWith('[')).length
						: 0,
					averageSimilarity: 0.8, // TODO: Calculate actual average
					contextLength: combinedContext.length,
				},
			};
		} catch (error) {
			logger.error(
				`[QdrantMemoryService] Failed to generate enhanced context: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			throw error;
		}
	}

	// =============================================================================
	// UTILITY METHODS
	// =============================================================================

	/**
	 * Tokenizes content into both sentence-level and word-level segments for Qdrant metadata filtering.
	 *
	 * This method returns a mixed array containing:
	 * - Sentence-level tokens: Split on sentence boundaries (.!?) and trimmed
	 * - Word-level tokens: Individual words (≥3 characters) in lowercase
	 *
	 * The combined tokenization enables flexible metadata filtering in Qdrant:
	 * - Sentence tokens allow matching against longer phrases and context
	 * - Word tokens enable precise keyword-based filtering
	 *
	 * @param content - The text content to tokenize
	 * @returns Array of mixed sentence and word tokens for metadata filtering
	 *
	 * @example
	 * tokenizeContent("Hello world! How are you?")
	 * // Returns: ["Hello world", "How are you", "hello", "world", "how", "are", "you"]
	 */
	private tokenizeContent(content: string): string[] {
		const sentences = this.tokenizeSentences(content);
		const words = this.tokenizeWords(content);
		return [...sentences, ...words];
	}

	/**
	 * Extracts sentence-level tokens from content by splitting on sentence boundaries.
	 *
	 * @param content - The text content to tokenize
	 * @returns Array of trimmed sentence tokens
	 */
	private tokenizeSentences(content: string): string[] {
		return content
			.split(/[.!?]+/)
			.filter((s) => s.trim().length > 0)
			.map((s) => s.trim());
	}

	/**
	 * Extracts word-level tokens from content, filtering for words with 3+ characters.
	 *
	 * @param content - The text content to tokenize
	 * @returns Array of lowercase word tokens (≥3 characters)
	 */
	private tokenizeWords(content: string): string[] {
		return content
			.toLowerCase()
			.split(/\s+/)
			.filter((w) => w.length > 2);
	}

	/**
	 * Simple sentiment analysis
	 */
	private async analyzeSentiment(text: string): Promise<'positive' | 'negative' | 'neutral'> {
		const positiveWords = ['good', 'great', 'awesome', 'love', 'like', 'happy', 'excellent', 'amazing'];
		const negativeWords = ['bad', 'terrible', 'hate', 'sad', 'angry', 'frustrated', 'awful', 'horrible'];

		const words = text.toLowerCase().split(/\s+/);
		const positiveCount = words.filter((word) => positiveWords.includes(word)).length;
		const negativeCount = words.filter((word) => negativeWords.includes(word)).length;

		if (positiveCount > negativeCount) return 'positive';
		if (negativeCount > positiveCount) return 'negative';
		return 'neutral';
	}

	/**
	 * Simple topic extraction
	 */
	private async extractTopics(text: string): Promise<string[]> {
		const topics: string[] = [];
		const topicKeywords = {
			gaming: ['game', 'play', 'gaming', 'stream', 'twitch', 'discord'],
			music: ['music', 'song', 'album', 'artist', 'listen', 'spotify'],
			tech: ['code', 'programming', 'computer', 'software', 'tech', 'dev'],
			food: ['food', 'eat', 'cooking', 'recipe', 'restaurant', 'meal'],
		};

		const words = text.toLowerCase().split(/\s+/);

		for (const [topic, keywords] of Object.entries(topicKeywords)) {
			if (keywords.some((keyword) => words.includes(keyword))) {
				topics.push(topic);
			}
		}

		return topics;
	}

	/**
	 * Get human-readable time ago string
	 */
	private getTimeAgo(timestamp: Date): string {
		const _now = new Date();
		const diffMs = now.getTime() - timestamp.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffDays > 0) return `${diffDays}d ago`;
		if (diffHours > 0) return `${diffHours}h ago`;
		if (diffMins > 0) return `${diffMins}m ago`;
		return 'just now';
	}

	/**
	 * Record performance metrics
	 */
	private recordSearchTime(ms: number): void {
		this.performanceMetrics.searchTimes.push(ms);
		if (this.performanceMetrics.searchTimes.length > 100) {
			this.performanceMetrics.searchTimes.shift();
		}
	}

	private recordEmbeddingTime(ms: number): void {
		this.performanceMetrics.embeddingTimes.push(ms);
		if (this.performanceMetrics.embeddingTimes.length > 100) {
			this.performanceMetrics.embeddingTimes.shift();
		}
	}

	/**
	 * Get memory statistics
	 */
	async getStats(): Promise<MemoryStats> {
		await this.ensureInitialized();

		try {
			const qdrantStats = await this.qdrantService.getStats();

			// Get personality notes
			const personalityNotes = await this.getNotes();
			const activePersonalityNotes = personalityNotes.filter((note) => note.isActive);

			// Get conversation stats
			const _now = new Date();
			const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
			const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

			const conversationFilters = [
				{ timeRange: { start: last24Hours } },
				{ timeRange: { start: last7Days } },
				{ timeRange: { start: last30Days } },
			];

			const [conv24h, conv7d, conv30d] = await Promise.all(
				conversationFilters.map((filter) =>
					this.qdrantService.searchSimilar(new Array(this.embeddingService.getConfig().dimensions).fill(0), {
						type: 'conversation',
						...filter,
						similarityThreshold: 0,
						limit: 10000,
					}),
				),
			);

			// Calculate averages
			const _avgSearchTime =
				this.performanceMetrics.searchTimes.length > 0
					? this.performanceMetrics.searchTimes.reduce((a, b) => a + b, 0) /
						this.performanceMetrics.searchTimes.length
					: 0;

			const _avgEmbeddingTime =
				this.performanceMetrics.embeddingTimes.length > 0
					? this.performanceMetrics.embeddingTimes.reduce((a, b) => a + b, 0) /
						this.performanceMetrics.embeddingTimes.length
					: 0;

			return {
				total: qdrantStats.totalVectors,
				byType: {
					personality: personalityNotes.length,
					conversation: qdrantStats.totalVectors - personalityNotes.length,
				},
				byCategory: personalityNotes.reduce(
					(acc, note) => {
						acc[note.category] = (acc[note.category] || 0) + 1;
						return acc;
					},
					{} as Partial<Record<PersonalityCategory, number>>,
				),
				byPriority: personalityNotes.reduce(
					(acc, note) => {
						acc[note.priority] = (acc[note.priority] || 0) + 1;
						return acc;
					},
					{} as Partial<Record<Priority, number>>,
				),
				activePersonalityNotes: activePersonalityNotes.length,
				conversationHistory: {
					total: qdrantStats.totalVectors - personalityNotes.length,
					last24Hours: conv24h.length,
					last7Days: conv7d.length,
					last30Days: conv30d.length,
				},
				storage: {
					vectorCount: qdrantStats.totalVectors,
					collectionSize: Object.values(qdrantStats.collections).reduce(
						(sum, col) => sum + col.vectorCount,
						0,
					),
					indexSize: Object.values(qdrantStats.collections).reduce(
						(sum, col) => sum + col.indexedVectorsCount,
						0,
					),
				},
			};
		} catch (error) {
			logger.error(
				`[QdrantMemoryService] Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			throw error;
		}
	}

	/**
	 * Health check for the memory service
	 */
	async healthCheck(): Promise<HealthCheckResult> {
		try {
			const [qdrantHealth, embeddingHealth] = await Promise.all([
				this.qdrantService.healthCheck(),
				Promise.resolve(this.embeddingService.getHealthStatus()),
			]);

			const stats = this.isInitialized ? await this.getStats() : null;

			const avgSearchTime =
				this.performanceMetrics.searchTimes.length > 0
					? this.performanceMetrics.searchTimes.reduce((a, b) => a + b, 0) /
						this.performanceMetrics.searchTimes.length
					: 0;

			const avgEmbeddingTime =
				this.performanceMetrics.embeddingTimes.length > 0
					? this.performanceMetrics.embeddingTimes.reduce((a, b) => a + b, 0) /
						this.performanceMetrics.embeddingTimes.length
					: 0;

			const errors: string[] = [];
			if (!qdrantHealth.connected) errors.push('Qdrant connection failed');
			if (!embeddingHealth.isReady) errors.push('Embedding service not ready');
			if (!this.isInitialized) errors.push('Memory service not initialized');

			const status = errors.length === 0 ? 'healthy' : errors.length === 1 ? 'degraded' : 'unhealthy';

			return {
				status,
				qdrant: qdrantHealth,
				embedding: {
					loaded: embeddingHealth.isReady,
					model: embeddingHealth.model,
					dimensions: embeddingHealth.dimensions,
				},
				memory: {
					personalityNotes: stats?.byType.personality || 0,
					conversations: stats?.byType.conversation || 0,
					cacheHitRate: 0, // TODO: Implement cache hit rate tracking
				},
				performance: {
					averageSearchTime: avgSearchTime,
					averageEmbeddingTime: avgEmbeddingTime,
				},
				errors: errors.length > 0 ? errors : undefined,
			};
		} catch (error) {
			return {
				status: 'unhealthy',
				qdrant: { connected: false, collections: [], vectorCount: 0 },
				embedding: { loaded: false, model: 'unknown', dimensions: 0 },
				memory: { personalityNotes: 0, conversations: 0, cacheHitRate: 0 },
				performance: { averageSearchTime: 0, averageEmbeddingTime: 0 },
				errors: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
			};
		}
	}

	/**
	 * Search memory items with semantic similarity
	 */
	async searchMemory(query: string, filters: MemorySearchFilters = {}): Promise<MemorySearchResult[]> {
		await this.ensureInitialized();

		try {
			const startTime = Date.now();

			// Generate embedding for query
			const queryEmbedding = await this.embeddingService.generateEmbedding(query);

			// Search in Qdrant
			const results = await this.qdrantService.searchSimilar(queryEmbedding, filters);

			this.recordSearchTime(Date.now() - startTime);

			logger.debug(`[QdrantMemoryService] Semantic search for "${query}" returned ${results.length} results`);
			return results;
		} catch (error) {
			logger.error(
				`[QdrantMemoryService] Failed to search memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			throw error;
		}
	}

	/**
	 * Cleanup and disconnect
	 */
	async cleanup(): Promise<void> {
		try {
			await this.embeddingService.cleanup();
			this.isInitialized = false;
			logger.info('[QdrantMemoryService] Cleanup completed');
		} catch (error) {
			logger.error(
				`[QdrantMemoryService] Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	/**
	 * Ensure service is initialized
	 */
	private async ensureInitialized(): Promise<void> {
		if (!this.isInitialized) {
			await this.initialize();
		}
	}
}
