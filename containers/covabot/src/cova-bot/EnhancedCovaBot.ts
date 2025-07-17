// Enhanced CovaBot - AI personality Discord bot with comprehensive features
import { Client, GatewayIntentBits, Message, Events, Guild } from 'discord.js';
import { logger } from '@starbunk/shared';
import { CovaIdentityService } from '../services/identity/CovaIdentityService';
import { QdrantMemoryService } from '../services/memory/QdrantMemoryService';
import { EmbeddingService } from '../services/embedding/EmbeddingService';
import { LLMService } from '../services/llm/LLMService';
import { 
  CovaBotConfig, 
  ConversationMemory, 
  ConversationContext, 
  LLMRequest,
  ServerIdentity,
  MemoryMetadata,
  CovaBotError,
  UserProfile,
  ChannelContext 
} from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced CovaBot with AI personality, memory, and identity management
 */
export class EnhancedCovaBot {
  private client: Client;
  private identityService: CovaIdentityService;
  private memoryService: QdrantMemoryService;
  private embeddingService: EmbeddingService;
  private llmService: LLMService;
  private isInitialized = false;
  private messageProcessingQueue = new Map<string, Promise<void>>();

  constructor(private config: CovaBotConfig) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
      ]
    });

    // Initialize services
    this.identityService = new CovaIdentityService(config);
    this.memoryService = new QdrantMemoryService(config.qdrant);
    this.embeddingService = new EmbeddingService();
    this.llmService = new LLMService(config.llm.providers, config.llm.defaultProvider);

    this.setupEventHandlers();
  }

  /**
   * Initialize all services and start the bot
   */
  async start(): Promise<void> {
    try {
      logger.info('🚀 Starting Enhanced CovaBot...');

      // Initialize services in order
      await this.embeddingService.initialize();
      await this.memoryService.initialize();

      // Login to Discord
      await this.client.login(this.config.discord.token);

      this.isInitialized = true;
      logger.info('✅ Enhanced CovaBot started successfully');

    } catch (error) {
      logger.error('Failed to start Enhanced CovaBot:', error);
      throw new CovaBotError('Failed to start Enhanced CovaBot', 'STARTUP_ERROR', 500, error);
    }
  }

  /**
   * Stop the bot and cleanup resources
   */
  async stop(): Promise<void> {
    try {
      logger.info('🛑 Stopping Enhanced CovaBot...');

      // Wait for all message processing to complete
      await Promise.all(this.messageProcessingQueue.values());

      await this.client.destroy();
      await this.embeddingService.cleanup();

      this.isInitialized = false;
      logger.info('✅ Enhanced CovaBot stopped successfully');

    } catch (error) {
      logger.error('Error stopping Enhanced CovaBot:', error);
    }
  }

  /**
   * Setup Discord event handlers
   */
  private setupEventHandlers(): void {
    this.client.on(Events.ClientReady, async () => {
      logger.info(`✅ Enhanced CovaBot is ready! Logged in as ${this.client.user?.tag}`);
      
      // Apply identities to all guilds
      for (const guild of this.client.guilds.cache.values()) {
        await this.applyIdentityToGuild(guild);
      }
    });

    this.client.on(Events.GuildCreate, async (guild: Guild) => {
      logger.info(`📥 Joined new guild: ${guild.name} (${guild.id})`);
      await this.applyIdentityToGuild(guild);
    });

    this.client.on(Events.MessageCreate, async (message: Message) => {
      if (!this.isInitialized || message.author.bot) return;
      
      // Check debug mode safety
      if (this.config.debug.enabled && !this.isTestingChannelAllowed(message.channelId)) {
        return;
      }

      await this.handleMessage(message);
    });

    this.client.on(Events.Error, (error) => {
      logger.error('Discord client error:', error);
    });
  }

  /**
   * Check if channel is allowed in debug mode
   */
  private isTestingChannelAllowed(channelId: string): boolean {
    if (!this.config.debug.enabled) return true;
    return this.config.debug.testingChannelIds.includes(channelId);
  }

  /**
   * Apply server-specific identity to guild
   */
  private async applyIdentityToGuild(guild: Guild): Promise<void> {
    try {
      const botMember = guild.members.cache.get(this.client.user!.id);
      if (!botMember) return;

      await this.identityService.applyIdentityToGuild(guild, botMember);
    } catch (error) {
      logger.error(`Failed to apply identity to guild ${guild.id}:`, error);
    }
  }

  /**
   * Handle incoming Discord messages
   */
  private async handleMessage(message: Message): Promise<void> {
    const messageId = message.id;
    
    // Prevent duplicate processing
    if (this.messageProcessingQueue.has(messageId)) {
      return;
    }

    const processingPromise = this.processMessage(message);
    this.messageProcessingQueue.set(messageId, processingPromise);

    try {
      await processingPromise;
    } finally {
      this.messageProcessingQueue.delete(messageId);
    }
  }

  /**
   * Process a Discord message with AI personality
   */
  private async processMessage(message: Message): Promise<void> {
    try {
      const startTime = Date.now();

      // Get server identity
      const identity = await this.identityService.getServerIdentity(message.guildId!);

      // Check if should respond based on trigger patterns
      if (!this.identityService.shouldRespond(message.content, identity)) {
        // Store memory even if not responding
        await this.storeMessageMemory(message, identity);
        return;
      }

      // Build conversation context
      const context = await this.buildConversationContext(message, identity);

      // Generate AI response
      const response = await this.generateAIResponse(message, identity, context);

      if (response) {
        // Send response
        await message.reply(response);

        // Store both user message and bot response in memory
        await this.storeMessageMemory(message, identity);
        await this.storeResponseMemory(message, response, identity);

        const processingTime = Date.now() - startTime;
        logger.info('✅ Processed message with AI response', {
          serverId: message.guildId,
          channelId: message.channelId,
          userId: message.author.id,
          processingTime,
          responseLength: response.length
        });
      }

    } catch (error) {
      logger.error('Failed to process message:', error);
      
      // Send error response if appropriate
      if (message.content.toLowerCase().includes('cova')) {
        try {
          await message.reply('Sorry, I encountered an error processing your message. Please try again later.');
        } catch (replyError) {
          logger.error('Failed to send error reply:', replyError);
        }
      }
    }
  }

  /**
   * Build conversation context for AI response
   */
  private async buildConversationContext(
    message: Message,
    _identity: ServerIdentity
  ): Promise<ConversationContext> {
    try {
      // Generate embedding for current message
      const messageEmbedding = await this.embeddingService.generateEmbedding(message.content);

      // Search for relevant memories
      const relevantMemories = await this.memoryService.searchSimilarMemories({
        vector: messageEmbedding,
        limit: 5,
        threshold: 0.7,
        filter: {
          must: [
            { key: 'serverId', match: { value: message.guildId } },
            { key: 'channelId', match: { value: message.channelId } }
          ]
        }
      });

      // Get recent messages from channel
      const recentMessages = await message.channel.messages.fetch({ limit: 10 });

      // Build user profile (simplified for now)
      const userProfile: UserProfile = {
        id: message.author.id,
        username: message.author.username,
        displayName: message.author.displayName || message.author.username,
        interactionHistory: {
          totalMessages: 1, // Would be tracked in database
          lastInteraction: new Date(),
          commonTopics: [],
          sentimentHistory: [],
          averageSentiment: 0
        },
        preferences: {
          topics: [],
          communicationStyle: 'casual'
        },
        relationships: []
      };

      // Build channel context
      const channelContext: ChannelContext = {
        id: message.channelId,
        name: message.channel.type === 0 ? message.channel.name : 'DM',
        type: message.channel.type.toString(),
        topic: message.channel.type === 0 ? message.channel.topic || undefined : undefined,
        recentActivity: {
          messageCount: recentMessages.size,
          activeUsers: new Set(recentMessages.map(m => m.author.id)).size,
          dominantTopics: [],
          averageSentiment: 0,
          timeframe: '10 messages'
        },
        participants: Array.from(new Set(recentMessages.map(m => m.author.id)))
      };

      return {
        serverId: message.guildId!,
        channelId: message.channelId,
        userId: message.author.id,
        recentMessages: Array.from(recentMessages.values()),
        relevantMemories: relevantMemories.map(r => r.payload),
        userProfile,
        channelContext
      };

    } catch (error) {
      logger.error('Failed to build conversation context:', error);
      
      // Return minimal context
      return {
        serverId: message.guildId!,
        channelId: message.channelId,
        userId: message.author.id,
        recentMessages: [message],
        relevantMemories: []
      };
    }
  }

  /**
   * Generate AI response using LLM service
   */
  private async generateAIResponse(
    message: Message,
    _identity: ServerIdentity,
    context: ConversationContext
  ): Promise<string | null> {
    try {
      const llmRequest: LLMRequest = {
        messages: [
          {
            role: 'user',
            content: message.content
          }
        ],
        personality: _identity.personality,
        context
      };

      const response = await this.llmService.generateResponse(llmRequest);
      return response.content;

    } catch (error) {
      logger.error('Failed to generate AI response:', error);
      return null;
    }
  }

  /**
   * Store message in memory
   */
  private async storeMessageMemory(message: Message, _identity: ServerIdentity): Promise<void> {
    try {
      const embedding = await this.embeddingService.generateEmbedding(message.content);
      
      const metadata: MemoryMetadata = {
        messageId: message.id,
        username: message.author.username,
        messageType: 'text',
        topics: [], // Would be extracted using NLP
        entities: [] // Would be extracted using NER
      };

      const memory: ConversationMemory = {
        id: uuidv4(),
        serverId: message.guildId!,
        channelId: message.channelId,
        userId: message.author.id,
        content: message.content,
        embedding,
        metadata,
        importance: this.calculateMessageImportance(message, _identity),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + _identity.personality.memoryRetention.retentionDays * 24 * 60 * 60 * 1000)
      };

      await this.memoryService.storeMemory(memory);

    } catch (error) {
      logger.error('Failed to store message memory:', error);
    }
  }

  /**
   * Store bot response in memory
   */
  private async storeResponseMemory(
    originalMessage: Message,
    response: string,
    _identity: ServerIdentity
  ): Promise<void> {
    try {
      const embedding = await this.embeddingService.generateEmbedding(response);
      
      const metadata: MemoryMetadata = {
        messageId: `${originalMessage.id}_response`,
        username: _identity.nickname,
        messageType: 'text',
        topics: [],
        entities: []
      };

      const memory: ConversationMemory = {
        id: uuidv4(),
        serverId: originalMessage.guildId!,
        channelId: originalMessage.channelId,
        userId: this.client.user!.id,
        content: response,
        embedding,
        metadata,
        importance: 80, // Bot responses are generally important
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + _identity.personality.memoryRetention.retentionDays * 24 * 60 * 60 * 1000)
      };

      await this.memoryService.storeMemory(memory);

    } catch (error) {
      logger.error('Failed to store response memory:', error);
    }
  }

  /**
   * Calculate message importance score
   */
  private calculateMessageImportance(message: Message, _identity: ServerIdentity): number {
    let importance = 50; // Base importance

    // Higher importance for direct mentions
    if (message.mentions.users.has(this.client.user!.id)) {
      importance += 30;
    }

    // Higher importance for trigger patterns
    if (_identity.personality.triggerPatterns.some(pattern =>
      message.content.toLowerCase().includes(pattern.toLowerCase())
    )) {
      importance += 20;
    }

    // Higher importance for questions
    if (message.content.includes('?')) {
      importance += 10;
    }

    // Higher importance for longer messages
    if (message.content.length > 100) {
      importance += 10;
    }

    return Math.min(100, importance);
  }

  /**
   * Get bot statistics
   */
  async getStats(): Promise<Record<string, unknown>> {
    try {
      const [identityStats, memoryStats, embeddingStats] = await Promise.all([
        this.identityService.getStats(),
        this.memoryService.getStats(),
        this.embeddingService.getStats()
      ]);

      return {
        bot: {
          isInitialized: this.isInitialized,
          guilds: this.client.guilds.cache.size,
          users: this.client.users.cache.size,
          uptime: this.client.uptime
        },
        identity: identityStats,
        memory: memoryStats,
        embedding: embeddingStats,
        processing: {
          queueSize: this.messageProcessingQueue.size
        }
      };

    } catch (error) {
      logger.error('Failed to get bot stats:', error);
      return { error: 'Failed to get statistics' };
    }
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, unknown> }> {
    try {
      const [identityHealth, memoryHealth, embeddingHealth, llmHealth] = await Promise.all([
        this.identityService.healthCheck(),
        this.memoryService.healthCheck(),
        this.embeddingService.healthCheck(),
        this.llmService.healthCheck()
      ]);

      const allHealthy = [identityHealth, memoryHealth, embeddingHealth, llmHealth]
        .every(health => health.status === 'healthy');

      return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        details: {
          bot: {
            isInitialized: this.isInitialized,
            connected: this.client.isReady()
          },
          services: {
            identity: identityHealth,
            memory: memoryHealth,
            embedding: embeddingHealth,
            llm: llmHealth
          },
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
