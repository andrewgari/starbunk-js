// Configuration management for CovaBot
import { config } from 'dotenv';
import { CovaBotConfig, QdrantConfig, LLMProvider } from '../types';
import { logger } from '@starbunk/shared';

// Load environment variables
config();

/**
 * Validates and creates the CovaBot configuration from environment variables
 */
export function createCovaBotConfig(): CovaBotConfig {
  // Validate required environment variables
  const requiredVars = [
    'STARBUNK_TOKEN',
    'DATABASE_URL',
    'QDRANT_URL'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Parse testing IDs
  const testingServerIds = process.env.TESTING_SERVER_IDS 
    ? process.env.TESTING_SERVER_IDS.split(',').map(id => id.trim())
    : [];
  
  const testingChannelIds = process.env.TESTING_CHANNEL_IDS
    ? process.env.TESTING_CHANNEL_IDS.split(',').map(id => id.trim())
    : [];

  // Create Qdrant configuration
  const qdrantConfig: QdrantConfig = {
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: process.env.QDRANT_COLLECTION_NAME || 'covabot_memories',
    vectorSize: parseInt(process.env.QDRANT_VECTOR_SIZE || '384'),
    distance: (process.env.QDRANT_DISTANCE as 'cosine' | 'euclidean' | 'dot') || 'cosine'
  };

  // Create LLM providers configuration
  const llmProviders: LLMProvider[] = [];
  
  // OpenAI provider
  if (process.env.OPENAI_API_KEY) {
    llmProviders.push({
      name: 'openai',
      type: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')
    });
  }

  // Ollama provider
  if (process.env.OLLAMA_BASE_URL) {
    llmProviders.push({
      name: 'ollama',
      type: 'ollama',
      baseUrl: process.env.OLLAMA_BASE_URL,
      model: process.env.OLLAMA_MODEL || 'llama2',
      maxTokens: parseInt(process.env.OLLAMA_MAX_TOKENS || '2000'),
      temperature: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.7')
    });
  }

  // Anthropic provider
  if (process.env.ANTHROPIC_API_KEY) {
    llmProviders.push({
      name: 'anthropic',
      type: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
      maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '2000'),
      temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE || '0.7')
    });
  }

  if (llmProviders.length === 0) {
    throw new Error('At least one LLM provider must be configured (OpenAI, Ollama, or Anthropic)');
  }

  const config: CovaBotConfig = {
    discord: {
      token: process.env.STARBUNK_TOKEN!,
      clientId: process.env.DISCORD_CLIENT_ID || '',
      guildIds: process.env.DISCORD_GUILD_IDS?.split(',').map(id => id.trim())
    },
    database: {
      url: process.env.DATABASE_URL!,
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10')
    },
    qdrant: qdrantConfig,
    llm: {
      providers: llmProviders,
      defaultProvider: process.env.DEFAULT_LLM_PROVIDER || llmProviders[0].name
    },
    web: {
      port: parseInt(process.env.WEB_PORT || '7080'),
      host: process.env.WEB_HOST || '0.0.0.0',
      cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true
      },
      auth: {
        jwtSecret: process.env.JWT_SECRET || 'covabot-secret-change-in-production',
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400') // 24 hours
      }
    },
    memory: {
      maxMemoriesPerUser: parseInt(process.env.MAX_MEMORIES_PER_USER || '1000'),
      retentionDays: parseInt(process.env.MEMORY_RETENTION_DAYS || '30'),
      cleanupInterval: parseInt(process.env.MEMORY_CLEANUP_INTERVAL || '3600') // 1 hour
    },
    debug: {
      enabled: process.env.DEBUG_MODE === 'true',
      testingServerIds,
      testingChannelIds
    }
  };

  // Log configuration (without sensitive data)
  logger.info('CovaBot configuration loaded:', {
    discord: {
      clientId: config.discord.clientId,
      guildCount: config.discord.guildIds?.length || 0
    },
    qdrant: {
      url: config.qdrant.url,
      collectionName: config.qdrant.collectionName,
      vectorSize: config.qdrant.vectorSize
    },
    llm: {
      providers: config.llm.providers.map(p => ({ name: p.name, type: p.type, model: p.model })),
      defaultProvider: config.llm.defaultProvider
    },
    web: {
      port: config.web.port,
      host: config.web.host
    },
    memory: config.memory,
    debug: config.debug
  });

  return config;
}

/**
 * Default personality profiles for different server contexts
 */
export const DEFAULT_PERSONALITIES = {
  friendly: {
    name: 'Friendly Assistant',
    description: 'A helpful and friendly AI assistant',
    traits: [
      { name: 'helpfulness', value: 90, description: 'Always tries to be helpful' },
      { name: 'friendliness', value: 85, description: 'Warm and approachable' },
      { name: 'patience', value: 80, description: 'Patient with users' },
      { name: 'curiosity', value: 70, description: 'Shows interest in conversations' }
    ],
    responseStyle: {
      formality: 30,
      verbosity: 60,
      emotiveness: 70,
      humor: 50,
      supportiveness: 85
    },
    memoryRetention: {
      maxMemories: 1000,
      retentionDays: 30,
      importanceThreshold: 50,
      autoCleanup: true
    },
    triggerPatterns: [
      'cova',
      'hey cova',
      'covabot',
      '@covabot'
    ],
    contextualBehaviors: [
      {
        context: 'greeting',
        behavior: 'Respond warmly and ask how they are doing',
        priority: 100
      },
      {
        context: 'question',
        behavior: 'Provide helpful and detailed answers',
        priority: 90
      },
      {
        context: 'emotional_support',
        behavior: 'Be empathetic and supportive',
        priority: 95
      }
    ]
  },
  
  professional: {
    name: 'Professional Assistant',
    description: 'A formal and professional AI assistant',
    traits: [
      { name: 'professionalism', value: 95, description: 'Maintains professional demeanor' },
      { name: 'accuracy', value: 90, description: 'Focuses on accurate information' },
      { name: 'efficiency', value: 85, description: 'Provides concise responses' },
      { name: 'reliability', value: 90, description: 'Consistent and dependable' }
    ],
    responseStyle: {
      formality: 80,
      verbosity: 40,
      emotiveness: 20,
      humor: 10,
      supportiveness: 60
    },
    memoryRetention: {
      maxMemories: 1500,
      retentionDays: 60,
      importanceThreshold: 60,
      autoCleanup: true
    },
    triggerPatterns: [
      'cova',
      'assistant',
      'covabot'
    ],
    contextualBehaviors: [
      {
        context: 'business_inquiry',
        behavior: 'Provide formal and detailed business information',
        priority: 100
      },
      {
        context: 'technical_question',
        behavior: 'Give precise technical explanations',
        priority: 95
      }
    ]
  },

  casual: {
    name: 'Casual Friend',
    description: 'A relaxed and casual AI companion',
    traits: [
      { name: 'casualness', value: 90, description: 'Very relaxed and informal' },
      { name: 'humor', value: 80, description: 'Uses humor frequently' },
      { name: 'relatability', value: 85, description: 'Easy to relate to' },
      { name: 'spontaneity', value: 75, description: 'Spontaneous responses' }
    ],
    responseStyle: {
      formality: 10,
      verbosity: 70,
      emotiveness: 80,
      humor: 85,
      supportiveness: 70
    },
    memoryRetention: {
      maxMemories: 800,
      retentionDays: 21,
      importanceThreshold: 40,
      autoCleanup: true
    },
    triggerPatterns: [
      'yo cova',
      'hey cova',
      'cova',
      'buddy'
    ],
    contextualBehaviors: [
      {
        context: 'casual_chat',
        behavior: 'Be relaxed and use casual language',
        priority: 100
      },
      {
        context: 'joke_request',
        behavior: 'Share appropriate jokes and humor',
        priority: 90
      }
    ]
  }
};

/**
 * Get configuration value with fallback
 */
export function getConfigValue<T>(key: string, fallback: T): T {
  const value = process.env[key];
  if (value === undefined) {
    return fallback;
  }
  
  // Try to parse as JSON first, then return as string
  try {
    return JSON.parse(value);
  } catch {
    return value as unknown as T;
  }
}

/**
 * Validate configuration at startup
 */
export function validateConfig(config: CovaBotConfig): void {
  const errors: string[] = [];

  // Validate Discord configuration
  if (!config.discord.token) {
    errors.push('Discord token is required');
  }

  // Validate database configuration
  if (!config.database.url) {
    errors.push('Database URL is required');
  }

  // Validate Qdrant configuration
  if (!config.qdrant.url) {
    errors.push('Qdrant URL is required');
  }

  if (config.qdrant.vectorSize <= 0) {
    errors.push('Qdrant vector size must be positive');
  }

  // Validate LLM configuration
  if (config.llm.providers.length === 0) {
    errors.push('At least one LLM provider must be configured');
  }

  const defaultProvider = config.llm.providers.find(p => p.name === config.llm.defaultProvider);
  if (!defaultProvider) {
    errors.push(`Default LLM provider '${config.llm.defaultProvider}' not found in providers`);
  }

  // Validate web configuration
  if (config.web.port <= 0 || config.web.port > 65535) {
    errors.push('Web port must be between 1 and 65535');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  logger.info('✅ Configuration validation passed');
}
