// Example implementation of Qdrant integration for CovaBot
// This shows how the services would work together

import { QdrantClient } from '@qdrant/js-client-rest';
import { pipeline, Pipeline } from '@xenova/transformers';
import { logger } from '@starbunk/shared';

// Types for conversation memory
interface ConversationMemory {
  id: string;
  content: string;
  userId: string;
  channelId: string;
  timestamp: Date;
  embedding?: number[];
  metadata: {
    messageType: 'user' | 'bot';
    conversationId: string;
    sentiment?: string;
    topics?: string[];
  };
}

interface VectorSearchResult {
  memory: ConversationMemory;
  score: number;
}

// Qdrant Service for vector operations
export class QdrantService {
  private client: QdrantClient;
  private collectionName = 'covabot_conversations';

  constructor(url: string = 'http://localhost:6333') {
    this.client = new QdrantClient({ url });
  }

  async initialize(): Promise<void> {
    try {
      // Create collection if it doesn't exist
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === this.collectionName);

      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 384, // sentence-transformers/all-MiniLM-L6-v2 dimension
            distance: 'Cosine'
          }
        });
        logger.info(`[QdrantService] Created collection: ${this.collectionName}`);
      }
    } catch (error) {
      logger.error('[QdrantService] Failed to initialize:', error);
      throw error;
    }
  }

  async storeConversation(memory: ConversationMemory): Promise<void> {
    if (!memory.embedding) {
      throw new Error('Conversation memory must have embedding');
    }

    await this.client.upsert(this.collectionName, {
      wait: true,
      points: [{
        id: memory.id,
        vector: memory.embedding,
        payload: {
          content: memory.content,
          userId: memory.userId,
          channelId: memory.channelId,
          timestamp: memory.timestamp.toISOString(),
          messageType: memory.metadata.messageType,
          conversationId: memory.metadata.conversationId,
          sentiment: memory.metadata.sentiment,
          topics: memory.metadata.topics
        }
      }]
    });
  }

  async searchSimilarConversations(
    queryEmbedding: number[],
    limit: number = 10,
    filters?: any
  ): Promise<VectorSearchResult[]> {
    const searchResult = await this.client.search(this.collectionName, {
      vector: queryEmbedding,
      limit,
      filter: filters,
      with_payload: true
    });

    return searchResult.map(result => ({
      memory: {
        id: result.id as string,
        content: result.payload?.content as string,
        userId: result.payload?.userId as string,
        channelId: result.payload?.channelId as string,
        timestamp: new Date(result.payload?.timestamp as string),
        metadata: {
          messageType: result.payload?.messageType as 'user' | 'bot',
          conversationId: result.payload?.conversationId as string,
          sentiment: result.payload?.sentiment as string,
          topics: result.payload?.topics as string[]
        }
      },
      score: result.score || 0
    }));
  }
}

// Embedding Service for text-to-vector conversion
export class EmbeddingService {
  private pipeline: Pipeline | null = null;
  private modelName = 'Xenova/all-MiniLM-L6-v2';

  async initialize(): Promise<void> {
    try {
      this.pipeline = await pipeline('feature-extraction', this.modelName);
      logger.info('[EmbeddingService] Embedding model loaded');
    } catch (error) {
      logger.error('[EmbeddingService] Failed to load model:', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.pipeline) {
      throw new Error('Embedding service not initialized');
    }

    const output = await this.pipeline(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }
}

// Enhanced Conversation Memory Service
export class ConversationMemoryService {
  private qdrantService: QdrantService;
  private embeddingService: EmbeddingService;
  private memoryCache = new Map<string, ConversationMemory>();

  constructor(qdrantUrl?: string) {
    this.qdrantService = new QdrantService(qdrantUrl);
    this.embeddingService = new EmbeddingService();
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.qdrantService.initialize(),
      this.embeddingService.initialize()
    ]);
    logger.info('[ConversationMemoryService] Initialized');
  }

  async storeConversation(
    content: string,
    userId: string,
    channelId: string,
    messageType: 'user' | 'bot',
    conversationId: string
  ): Promise<void> {
    try {
      // Generate embedding
      const embedding = await this.embeddingService.generateEmbedding(content);

      // Create memory object
      const memory: ConversationMemory = {
        id: `${conversationId}_${Date.now()}`,
        content,
        userId,
        channelId,
        timestamp: new Date(),
        embedding,
        metadata: {
          messageType,
          conversationId,
          sentiment: await this.analyzeSentiment(content),
          topics: await this.extractTopics(content)
        }
      };

      // Store in Qdrant
      await this.qdrantService.storeConversation(memory);

      // Cache for quick access
      this.memoryCache.set(memory.id, memory);

      logger.debug(`[ConversationMemoryService] Stored conversation: ${memory.id}`);
    } catch (error) {
      logger.error('[ConversationMemoryService] Failed to store conversation:', error);
      throw error;
    }
  }

  async getRelevantContext(
    currentMessage: string,
    userId: string,
    channelId: string,
    maxResults: number = 5
  ): Promise<string> {
    try {
      // Generate embedding for current message
      const queryEmbedding = await this.embeddingService.generateEmbedding(currentMessage);

      // Search for similar conversations
      const filters = {
        should: [
          { key: 'userId', match: { value: userId } },
          { key: 'channelId', match: { value: channelId } }
        ]
      };

      const similarConversations = await this.qdrantService.searchSimilarConversations(
        queryEmbedding,
        maxResults,
        filters
      );

      // Format context for LLM
      if (similarConversations.length === 0) {
        return '';
      }

      let context = 'RELEVANT CONVERSATION HISTORY:\n\n';
      
      for (const result of similarConversations) {
        const { memory, score } = result;
        const timeAgo = this.getTimeAgo(memory.timestamp);
        
        context += `[${timeAgo}] ${memory.metadata.messageType === 'user' ? 'User' : 'Cova'}: ${memory.content}\n`;
        
        if (score < 0.7) break; // Stop if similarity drops too low
      }

      return context.trim();
    } catch (error) {
      logger.error('[ConversationMemoryService] Failed to get relevant context:', error);
      return '';
    }
  }

  private async analyzeSentiment(text: string): Promise<string> {
    // Simple sentiment analysis - could be enhanced with ML models
    const positiveWords = ['good', 'great', 'awesome', 'love', 'like', 'happy'];
    const negativeWords = ['bad', 'terrible', 'hate', 'sad', 'angry', 'frustrated'];
    
    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private async extractTopics(text: string): Promise<string[]> {
    // Simple topic extraction - could be enhanced with NLP models
    const topics: string[] = [];
    const topicKeywords = {
      gaming: ['game', 'play', 'gaming', 'stream', 'twitch'],
      music: ['music', 'song', 'album', 'artist', 'listen'],
      tech: ['code', 'programming', 'computer', 'software', 'tech'],
      food: ['food', 'eat', 'cooking', 'recipe', 'restaurant']
    };

    const words = text.toLowerCase().split(/\s+/);
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => words.includes(keyword))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  private getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'just now';
  }
}

// Enhanced LLM Triggers with Qdrant Integration
export const createEnhancedLLMResponse = (memoryService: ConversationMemoryService) => {
  return async (message: any): Promise<string> => {
    try {
      // Get relevant conversation context
      const conversationContext = await memoryService.getRelevantContext(
        message.content,
        message.author.id,
        message.channel.id
      );

      // Get existing personality notes (from current system)
      const useDatabase = process.env.USE_DATABASE === 'true';
      let personalityNotes: string;

      if (useDatabase) {
        const { PersonalityNotesServiceDb } = await import('../services/personalityNotesServiceDb');
        const dbService = PersonalityNotesServiceDb.getInstance();
        personalityNotes = await dbService.getActiveNotesForLLM();
      } else {
        const { PersonalityNotesService } = await import('../services/personalityNotesService');
        const fileService = PersonalityNotesService.getInstance();
        personalityNotes = await fileService.getActiveNotesForLLM();
      }

      // Combine all context
      let fullContext = personalityNotes;
      if (conversationContext) {
        fullContext += '\n\n' + conversationContext;
      }

      // Create enhanced prompt
      const userPrompt = `
Channel: ${message.channel.name || 'Unknown'}
User: ${message.author.username}
Message: ${message.content}

${fullContext}

Respond as Cova would, taking into account both the personality instructions and the relevant conversation history above.`;

      // Generate LLM response (using existing LLM integration)
      const { getLLMManager } = await import('@starbunk/shared');
      const { PromptType } = await import('@starbunk/shared');
      
      const response = await getLLMManager().createPromptCompletion(
        PromptType.COVA_EMULATOR,
        userPrompt,
        {
          temperature: 0.7,
          maxTokens: 250,
          fallbackToDefault: true
        }
      );

      // Store both user message and bot response in memory
      const conversationId = `${message.channel.id}_${Date.now()}`;
      
      await memoryService.storeConversation(
        message.content,
        message.author.id,
        message.channel.id,
        'user',
        conversationId
      );

      if (response) {
        await memoryService.storeConversation(
          response,
          'covabot',
          message.channel.id,
          'bot',
          conversationId
        );
      }

      return response || '';
    } catch (error) {
      logger.error('[EnhancedLLMResponse] Error:', error);
      return '';
    }
  };
};
