/**
 * Vector Memory Service
 *
 * Semantic conversation memory using vector embeddings.
 * Enables retrieval of relevant past conversations, not just recent ones.
 *
 * How it works:
 * 1. Each conversation exchange is embedded and stored
 * 2. When building context, query finds semantically similar past conversations
 * 3. The LLM receives relevant context even from weeks/months ago
 *
 * Benefits over chronological retrieval:
 * - "Remember that bug?" finds related debugging conversations
 * - Topic continuity across sessions
 * - More coherent personality over time
 */

import { logLayer } from '@/observability/log-layer';
import { VectorStore, SimilarityResult } from './vector-store';
import { EmbeddingManager } from '../llm/embedding-manager';

const logger = logLayer.withPrefix('VectorMemoryService');

const CONVERSATION_COLLECTION = 'conversations';

export interface ConversationEntry {
	messageContent: string;
	botResponse: string;
	userId: string;
	userName: string;
	channelId: string;
	timestamp: Date;
}

export interface RelevantMemory {
	messageContent: string;
	botResponse: string;
	userName: string;
	score: number;
	timestamp: Date;
}

export class VectorMemoryService {
	private vectorStore: VectorStore;
	private embeddingManager: EmbeddingManager;

	constructor(vectorStore: VectorStore, embeddingManager: EmbeddingManager) {
		this.vectorStore = vectorStore;
		this.embeddingManager = embeddingManager;
	}

	/**
	 * Store a conversation exchange as a vector
	 */
	async storeConversation(profileId: string, entry: ConversationEntry): Promise<void> {
		if (!this.embeddingManager.hasAvailableProvider()) {
			return;
		}

		// Create a combined text for embedding that captures the exchange
		const combinedText = `${entry.userName}: ${entry.messageContent}\nBot: ${entry.botResponse}`;

		try {
			const embedding = await this.embeddingManager.generateEmbedding(combinedText);

			const id = `${profileId}:conv:${entry.channelId}:${Date.now()}`;

			await this.vectorStore.upsert({
				id,
				profileId,
				collection: CONVERSATION_COLLECTION,
				text: combinedText,
				vector: embedding.embedding,
				metadata: {
					messageContent: entry.messageContent,
					botResponse: entry.botResponse,
					userId: entry.userId,
					userName: entry.userName,
					channelId: entry.channelId,
					timestamp: entry.timestamp.toISOString(),
				},
			});

			logger
				.withMetadata({
					profile_id: profileId,
					channel_id: entry.channelId,
					text_length: combinedText.length,
				})
				.debug('Conversation stored as vector');
		} catch (error) {
			logger.withError(error).warn('Failed to store conversation vector');
		}
	}

	/**
	 * Find relevant past conversations for context building
	 */
	async findRelevantMemories(
		profileId: string,
		queryText: string,
		limit: number = 5,
		minScore: number = 0.5,
	): Promise<RelevantMemory[]> {
		if (!this.embeddingManager.hasAvailableProvider()) {
			return [];
		}

		try {
			const queryEmbedding = await this.embeddingManager.generateEmbedding(queryText);

			const results = this.vectorStore.search(
				profileId,
				CONVERSATION_COLLECTION,
				queryEmbedding.embedding,
				limit,
				minScore,
			);

			const memories = results.map((r) => this.resultToMemory(r));

			logger
				.withMetadata({
					profile_id: profileId,
					query_preview: queryText.substring(0, 50),
					memories_found: memories.length,
				})
				.debug('Relevant memories retrieved');

			return memories;
		} catch (error) {
			logger.withError(error).warn('Failed to retrieve relevant memories');
			return [];
		}
	}

	/**
	 * Format relevant memories for LLM context
	 */
	formatMemoriesForLlm(memories: RelevantMemory[], botName: string): string {
		if (memories.length === 0) {
			return '';
		}

		const lines = memories.map((m) => {
			const dateStr = m.timestamp.toLocaleDateString();
			return `[${dateStr}] ${m.userName}: ${m.messageContent}\n${botName}: ${m.botResponse}`;
		});

		return `Relevant past conversations:\n${lines.join('\n\n')}`;
	}

	/**
	 * Get memory count for a profile
	 */
	getMemoryCount(profileId: string): number {
		return this.vectorStore.getCollectionSize(profileId, CONVERSATION_COLLECTION);
	}

	/**
	 * Prune old memories to manage storage
	 */
	async pruneOldMemories(profileId: string, keepCount: number = 1000): Promise<number> {
		// This is a simple implementation - for production, you'd want
		// more sophisticated pruning based on importance/recency
		const currentCount = this.getMemoryCount(profileId);

		if (currentCount <= keepCount) {
			return 0;
		}

		// For now, just log - actual pruning would require timestamp sorting
		logger
			.withMetadata({
				profile_id: profileId,
				current_count: currentCount,
				target_count: keepCount,
			})
			.info('Memory pruning needed (not implemented yet)');

		return 0;
	}

	private resultToMemory(result: SimilarityResult): RelevantMemory {
		const metadata = result.metadata || {};

		return {
			messageContent: (metadata.messageContent as string) || '',
			botResponse: (metadata.botResponse as string) || '',
			userName: (metadata.userName as string) || 'Unknown',
			score: result.score,
			timestamp: metadata.timestamp ? new Date(metadata.timestamp as string) : new Date(),
		};
	}
}
