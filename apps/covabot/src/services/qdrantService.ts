import { QdrantClient } from '@qdrant/js-client-rest';
import { logger } from '@starbunk/shared';
import {
	MemoryItem,
	MemorySearchFilters,
	MemorySearchResult,
	QdrantCollectionConfig,
	MemoryType,
} from '../types/memoryTypes';

/**
 * Qdrant vector database service for memory storage and retrieval
 */
export class QdrantService {
	private static instance: QdrantService;
	private client: QdrantClient;
	private isConnected = false;
	private collections: Map<string, QdrantCollectionConfig> = new Map();

	// Collection names
	private readonly PERSONALITY_COLLECTION = 'covabot_personality';
	private readonly CONVERSATION_COLLECTION = 'covabot_conversations';

	constructor() {
		const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
		const apiKey = process.env.QDRANT_API_KEY;

		this.client = new QdrantClient({
			url: qdrantUrl,
			apiKey: apiKey,
		});

		logger.info(`[QdrantService] Configured for URL: ${qdrantUrl}`);
	}

	static getInstance(): QdrantService {
		if (!QdrantService.instance) {
			QdrantService.instance = new QdrantService();
		}
		return QdrantService.instance;
	}

	/**
	 * Initialize Qdrant connection and collections
	 */
	async initialize(): Promise<void> {
		try {
			// Test connection
			await this.client.getCollections();
			this.isConnected = true;
			logger.info('[QdrantService] Connected to Qdrant successfully');

			// Initialize collections
			await this.initializeCollections();

			logger.info('[QdrantService] Initialization complete');
		} catch (error) {
			logger.error(
				`[QdrantService] Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			throw error;
		}
	}

	/**
	 * Initialize required collections
	 */
	private async initializeCollections(): Promise<void> {
		const vectorSize = parseInt(process.env.EMBEDDING_DIMENSIONS || '384');

		const personalityConfig: QdrantCollectionConfig = {
			name: this.PERSONALITY_COLLECTION,
			vectorSize,
			distance: 'Cosine',
			onDiskPayload: true,
		};

		const conversationConfig: QdrantCollectionConfig = {
			name: this.CONVERSATION_COLLECTION,
			vectorSize,
			distance: 'Cosine',
			onDiskPayload: true,
			optimizersConfig: {
				deletedThreshold: 0.2,
				vacuumMinVectorNumber: 1000,
				defaultSegmentNumber: 2,
			},
		};

		await this.createCollectionIfNotExists(personalityConfig);
		await this.createCollectionIfNotExists(conversationConfig);
	}

	/**
	 * Create collection if it doesn't exist
	 */
	private async createCollectionIfNotExists(config: QdrantCollectionConfig): Promise<void> {
		try {
			const collections = await this.client.getCollections();
			const exists = collections.collections.some((c) => c.name === config.name);

			if (!exists) {
				await this.client.createCollection(config.name, {
					vectors: {
						size: config.vectorSize,
						distance: config.distance,
						on_disk: config.onDiskPayload,
					},
					optimizers_config: config.optimizersConfig,
				});
				logger.info(`[QdrantService] Created collection: ${config.name}`);
			} else {
				logger.debug(`[QdrantService] Collection already exists: ${config.name}`);
			}

			this.collections.set(config.name, config);
		} catch (error) {
			logger.error(
				`[QdrantService] Failed to create collection ${config.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			throw error;
		}
	}

	/**
	 * Store a memory item in Qdrant
	 */
	async storeMemoryItem(item: MemoryItem): Promise<void> {
		if (!item.embedding) {
			throw new Error('Memory item must have embedding vector');
		}

		const collectionName = this.getCollectionName(item.type);

		try {
			await this.client.upsert(collectionName, {
				wait: true,
				points: [
					{
						id: item.id,
						vector: item.embedding,
						payload: {
							content: item.content,
							type: item.type,
							createdAt: item.createdAt.toISOString(),
							updatedAt: item.updatedAt.toISOString(),
							...item.metadata,
							// Type-specific fields
							...(item.type === 'personality'
								? {
										category: item.category,
										priority: item.priority,
										isActive: item.isActive,
										tokens: item.tokens,
									}
								: {
										userId: item.userId,
										channelId: item.channelId,
										messageType: item.messageType,
										conversationId: item.conversationId,
										sentiment: item.sentiment,
										topics: item.topics,
										replyToId: item.replyToId,
									}),
						},
					},
				],
			});

			logger.debug(`[QdrantService] Stored ${item.type} memory item: ${item.id}`);
		} catch (error) {
			logger.error(
				`[QdrantService] Failed to store memory item: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			throw error;
		}
	}

	/**
	 * Search for similar memory items
	 */
	async searchSimilar(queryEmbedding: number[], filters: MemorySearchFilters = {}): Promise<MemorySearchResult[]> {
		const collectionName = filters.type ? this.getCollectionName(filters.type) : null;
		const limit = filters.limit || 10;
		const threshold = filters.similarityThreshold || 0.7;

		try {
			// Build Qdrant filter
			const qdrantFilter = this.buildQdrantFilter(filters);

			// Search in specific collection or both
			const collections = collectionName
				? [collectionName]
				: [this.PERSONALITY_COLLECTION, this.CONVERSATION_COLLECTION];
			const allResults: MemorySearchResult[] = [];

			for (const collection of collections) {
				try {
					const searchResult = await this.client.search(collection, {
						vector: queryEmbedding,
						limit,
						filter: qdrantFilter,
						with_payload: true,
						score_threshold: threshold,
					});

					const results = searchResult.map((result) => ({
						item: this.payloadToMemoryItem(result.payload!, result.id as string),
						score: result.score || 0,
						distance: 1 - (result.score || 0), // Convert similarity to distance
					}));

					allResults.push(...results);
				} catch (error) {
					logger.warn(
						`[QdrantService] Search failed for collection ${collection}: ${error instanceof Error ? error.message : 'Unknown error'}`,
					);
				}
			}

			// Sort by score and limit results
			allResults.sort((a, b) => b.score - a.score);
			return allResults.slice(0, limit);
		} catch (error) {
			logger.error(`[QdrantService] Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
			throw error;
		}
	}

	/**
	 * Get memory item by ID
	 */
	async getMemoryItem(id: string, type?: MemoryType): Promise<MemoryItem | null> {
		const collections = type
			? [this.getCollectionName(type)]
			: [this.PERSONALITY_COLLECTION, this.CONVERSATION_COLLECTION];

		for (const collection of collections) {
			try {
				const _result = await this.client.retrieve(collection, {
					ids: [id],
					with_payload: true,
				});

				if (_result.length > 0) {
					return this.payloadToMemoryItem(_result[0].payload!, id);
				}
			} catch (_error) {
				logger.debug(`[QdrantService] Item not found in collection ${collection}: ${id}`);
			}
		}

		return null;
	}

	/**
	 * Update memory item
	 */
	async updateMemoryItem(item: MemoryItem): Promise<void> {
		await this.storeMemoryItem(item); // Upsert operation
	}

	/**
	 * Delete memory item
	 */
	async deleteMemoryItem(id: string, type?: MemoryType): Promise<boolean> {
		const collections = type
			? [this.getCollectionName(type)]
			: [this.PERSONALITY_COLLECTION, this.CONVERSATION_COLLECTION];

		for (const collection of collections) {
			try {
				await this.client.delete(collection, {
					wait: true,
					points: [id],
				});
				logger.debug(`[QdrantService] Deleted memory item: ${id} from ${collection}`);
				return true;
			} catch (_error) {
				logger.debug(`[QdrantService] Item not found for deletion in ${collection}: ${id}`);
			}
		}

		return false;
	}

	/**
	 * Get collection statistics
	 */
	async getStats(): Promise<{
		collections: Record<string, { vectorCount: number; indexedVectorsCount: number }>;
		totalVectors: number;
	}> {
		try {
			const stats: Record<string, any> = {};
			let totalVectors = 0;

			for (const collectionName of [this.PERSONALITY_COLLECTION, this.CONVERSATION_COLLECTION]) {
				try {
					const info = await this.client.getCollection(collectionName);
					const vectorCount = info.vectors_count || 0;
					const indexedCount = info.indexed_vectors_count || 0;

					stats[collectionName] = {
						vectorCount,
						indexedVectorsCount: indexedCount,
					};
					totalVectors += vectorCount;
				} catch (error) {
					logger.warn(
						`[QdrantService] Failed to get stats for ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
					);
					stats[collectionName] = { vectorCount: 0, indexedVectorsCount: 0 };
				}
			}

			return {
				collections: stats,
				totalVectors,
			};
		} catch (error) {
			logger.error(
				`[QdrantService] Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			throw error;
		}
	}

	/**
	 * Health check
	 */
	async healthCheck(): Promise<{
		connected: boolean;
		collections: string[];
		vectorCount: number;
	}> {
		// In test environments (or when Qdrant is not explicitly enabled), avoid network calls
		if (process.env.NODE_ENV === 'test' && process.env.USE_QDRANT !== 'true') {
			return { connected: false, collections: [], vectorCount: 0 };
		}
		try {
			const collections = await this.client.getCollections();
			const stats = await this.getStats();
			return {
				connected: true,
				collections: collections.collections.map((c) => c.name),
				vectorCount: stats.totalVectors,
			};
		} catch (_error) {
			return { connected: false, collections: [], vectorCount: 0 };
		}
	}

	/**
	 * Get collection name for memory type
	 */
	private getCollectionName(type: MemoryType): string {
		switch (type) {
			case 'personality':
				return this.PERSONALITY_COLLECTION;
			case 'conversation':
				return this.CONVERSATION_COLLECTION;
			default:
				throw new Error(`Unknown memory type: ${type}`);
		}
	}

	/**
	 * Build Qdrant filter from search filters
	 */
	private buildQdrantFilter(filters: MemorySearchFilters): any {
		const conditions: any[] = [];

		if (filters.category) {
			conditions.push({ key: 'category', match: { value: filters.category } });
		}

		if (filters.priority) {
			conditions.push({ key: 'priority', match: { value: filters.priority } });
		}

		if (filters.isActive !== undefined) {
			conditions.push({ key: 'isActive', match: { value: filters.isActive } });
		}

		if (filters.userId) {
			conditions.push({ key: 'userId', match: { value: filters.userId } });
		}

		if (filters.channelId) {
			conditions.push({ key: 'channelId', match: { value: filters.channelId } });
		}

		if (filters.messageType) {
			conditions.push({ key: 'messageType', match: { value: filters.messageType } });
		}

		if (filters.conversationId) {
			conditions.push({ key: 'conversationId', match: { value: filters.conversationId } });
		}

		if (filters.timeRange) {
			if (filters.timeRange.start) {
				conditions.push({
					key: 'createdAt',
					range: { gte: filters.timeRange.start.toISOString() },
				});
			}
			if (filters.timeRange.end) {
				conditions.push({
					key: 'createdAt',
					range: { lte: filters.timeRange.end.toISOString() },
				});
			}
		}

		return conditions.length > 0 ? { must: conditions } : undefined;
	}

	/**
	 * Convert Qdrant payload to MemoryItem
	 */
	private payloadToMemoryItem(payload: any, id: string): MemoryItem {
		const base = {
			id,
			content: payload.content,
			createdAt: new Date(payload.createdAt),
			updatedAt: new Date(payload.updatedAt),
			metadata: payload.metadata || {},
		};

		if (payload.type === 'personality') {
			return {
				...base,
				type: 'personality',
				category: payload.category,
				priority: payload.priority,
				isActive: payload.isActive,
				tokens: payload.tokens,
			};
		} else {
			return {
				...base,
				type: 'conversation',
				userId: payload.userId,
				channelId: payload.channelId,
				messageType: payload.messageType,
				conversationId: payload.conversationId,
				sentiment: payload.sentiment,
				topics: payload.topics,
				replyToId: payload.replyToId,
			};
		}
	}
}
