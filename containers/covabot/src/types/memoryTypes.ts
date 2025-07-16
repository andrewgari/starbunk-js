/**
 * Unified memory types for Qdrant-based storage system
 * Handles both personality notes and conversation history as vectors
 */

export type MemoryType = 'personality' | 'conversation';

export type PersonalityCategory = 'instruction' | 'personality' | 'behavior' | 'knowledge' | 'context';
export type Priority = 'high' | 'medium' | 'low';
export type MessageType = 'user' | 'bot';

/**
 * Base memory item stored in Qdrant
 */
export interface BaseMemoryItem {
	id: string;
	content: string;
	embedding?: number[];
	createdAt: Date;
	updatedAt: Date;
	metadata: Record<string, unknown>;
}

/**
 * Personality note memory item
 */
export interface PersonalityMemory extends BaseMemoryItem {
	type: 'personality';
	category: PersonalityCategory;
	priority: Priority;
	isActive: boolean;
	/**
	 * Mixed tokenization array containing both sentence-level and word-level tokens
	 * for flexible Qdrant metadata filtering. Includes trimmed sentences and individual
	 * words (≥3 characters) in lowercase for comprehensive search capabilities.
	 *
	 * Note: This field contains heterogeneous segments (both sentences and words).
	 * Consider renaming to 'segments' in future refactoring for better clarity.
	 */
	tokens?: string[];
}

/**
 * Conversation memory item
 */
export interface ConversationMemory extends BaseMemoryItem {
	type: 'conversation';
	userId: string;
	channelId: string;
	messageType: MessageType;
	conversationId: string;
	sentiment?: 'positive' | 'negative' | 'neutral';
	topics?: string[];
	replyToId?: string;
}

/**
 * Union type for all memory items
 */
export type MemoryItem = PersonalityMemory | ConversationMemory;

/**
 * Search filters for memory retrieval
 */
export interface MemorySearchFilters {
	type?: MemoryType;
	category?: PersonalityCategory;
	priority?: Priority;
	isActive?: boolean;
	userId?: string;
	channelId?: string;
	messageType?: MessageType;
	conversationId?: string;
	sentiment?: string;
	topics?: string[];
	search?: string;
	timeRange?: {
		start?: Date;
		end?: Date;
	};
	limit?: number;
	similarityThreshold?: number;
}

/**
 * Search result with similarity score
 */
export interface MemorySearchResult<T extends MemoryItem = MemoryItem> {
	item: T;
	score: number;
	distance?: number;
}

/**
 * Context generation options
 */
export interface ContextGenerationOptions {
	maxPersonalityNotes?: number;
	maxConversationHistory?: number;
	personalityWeight?: number;
	conversationWeight?: number;
	timeDecayFactor?: number;
	similarityThreshold?: number;
	includeInactive?: boolean;
}

/**
 * Generated context for LLM
 */
export interface GeneratedContext {
	personalityContext: string;
	conversationContext: string;
	combinedContext: string;
	metadata: {
		personalityNotesUsed: number;
		conversationItemsUsed: number;
		averageSimilarity: number;
		contextLength: number;
	};
}

/**
 * Memory statistics
 */
export interface MemoryStats {
	total: number;
	byType: Record<MemoryType, number>;
	byCategory: Partial<Record<PersonalityCategory, number>>;
	byPriority: Partial<Record<Priority, number>>;
	activePersonalityNotes: number;
	conversationHistory: {
		total: number;
		last24Hours: number;
		last7Days: number;
		last30Days: number;
	};
	storage: {
		vectorCount: number;
		collectionSize: number;
		indexSize: number;
	};
}

/**
 * Request types for API compatibility
 */
export interface CreatePersonalityNoteRequest {
	content: string;
	category: PersonalityCategory;
	priority?: Priority;
}

export interface UpdatePersonalityNoteRequest {
	content?: string;
	category?: PersonalityCategory;
	priority?: Priority;
	isActive?: boolean;
}

export interface CreateConversationRequest {
	content: string;
	userId: string;
	channelId: string;
	messageType: MessageType;
	conversationId?: string;
	replyToId?: string;
}

/**
 * Migration data structure
 */
export interface MigrationData {
	personalityNotes: Array<{
		id?: string;
		content: string;
		category: PersonalityCategory;
		priority: Priority;
		isActive: boolean;
		createdAt?: Date;
		updatedAt?: Date;
	}>;
	conversations?: Array<{
		content: string;
		userId: string;
		channelId: string;
		messageType: MessageType;
		timestamp: Date;
		conversationId?: string;
	}>;
}

/**
 * Embedding service configuration
 */
export interface EmbeddingConfig {
	model: string;
	dimensions: number;
	batchSize: number;
	cacheSize: number;
	timeout: number;
}

/**
 * Qdrant collection configuration
 */
export interface QdrantCollectionConfig {
	name: string;
	vectorSize: number;
	distance: 'Cosine' | 'Euclid' | 'Dot';
	onDiskPayload?: boolean;
	optimizersConfig?: {
		deletedThreshold?: number;
		vacuumMinVectorNumber?: number;
		defaultSegmentNumber?: number;
	};
}

/**
 * Health check result
 */
export interface HealthCheckResult {
	status: 'healthy' | 'unhealthy' | 'degraded';
	qdrant: {
		connected: boolean;
		collections: string[];
		vectorCount: number;
	};
	embedding: {
		loaded: boolean;
		model: string;
		dimensions: number;
	};
	memory: {
		personalityNotes: number;
		conversations: number;
		cacheHitRate: number;
	};
	performance: {
		averageSearchTime: number;
		averageEmbeddingTime: number;
	};
	errors?: string[];
}
