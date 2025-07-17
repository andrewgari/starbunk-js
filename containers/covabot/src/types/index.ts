// Core types for CovaBot AI personality system
import { Message } from 'discord.js';

// Identity System Types
export interface ServerIdentity {
  id: string;
  serverId: string;
  nickname: string;
  avatarUrl?: string;
  personality: PersonalityProfile;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonalityProfile {
  id: string;
  name: string;
  description: string;
  traits: PersonalityTrait[];
  responseStyle: ResponseStyle;
  memoryRetention: MemoryRetentionSettings;
  triggerPatterns: string[];
  contextualBehaviors: ContextualBehavior[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonalityTrait {
  name: string;
  value: number; // 0-100 scale
  description: string;
}

export interface ResponseStyle {
  formality: number; // 0-100 (casual to formal)
  verbosity: number; // 0-100 (concise to verbose)
  emotiveness: number; // 0-100 (neutral to emotional)
  humor: number; // 0-100 (serious to humorous)
  supportiveness: number; // 0-100 (neutral to supportive)
}

export interface ContextualBehavior {
  context: string;
  behavior: string;
  priority: number;
}

// Memory System Types
export interface ConversationMemory {
  id: string;
  serverId: string;
  channelId: string;
  userId: string;
  content: string;
  embedding: number[];
  metadata: MemoryMetadata;
  importance: number; // 0-100 scale
  createdAt: Date;
  expiresAt?: Date;
}

export interface MemoryMetadata {
  messageId: string;
  username: string;
  messageType: 'text' | 'image' | 'file' | 'reaction';
  sentiment?: number; // -1 to 1
  topics?: string[];
  entities?: NamedEntity[];
  relationships?: string[];
}

export interface NamedEntity {
  text: string;
  type: 'person' | 'place' | 'organization' | 'event' | 'other';
  confidence: number;
}

export interface MemoryRetentionSettings {
  maxMemories: number;
  retentionDays: number;
  importanceThreshold: number;
  autoCleanup: boolean;
}

// LLM Integration Types
export interface LLMProvider {
  name: string;
  type: 'openai' | 'ollama' | 'anthropic';
  baseUrl?: string;
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface LLMRequest {
  messages: LLMMessage[];
  provider: LLMProvider;
  context?: ConversationContext;
  personality: PersonalityProfile;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  usage: TokenUsage;
  metadata: ResponseMetadata;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ResponseMetadata {
  model: string;
  provider: string;
  processingTime: number;
  confidence?: number;
}

// Conversation Context Types
export interface ConversationContext {
  serverId: string;
  channelId: string;
  userId: string;
  recentMessages: Message[];
  relevantMemories: ConversationMemory[];
  userProfile?: UserProfile;
  channelContext?: ChannelContext;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  interactionHistory: InteractionSummary;
  preferences: UserPreferences;
  relationships: UserRelationship[];
}

export interface InteractionSummary {
  totalMessages: number;
  lastInteraction: Date;
  commonTopics: string[];
  sentimentHistory: number[];
  averageSentiment: number;
}

export interface UserPreferences {
  preferredResponseStyle?: Partial<ResponseStyle>;
  topics: TopicPreference[];
  communicationStyle: string;
}

export interface TopicPreference {
  topic: string;
  interest: number; // 0-100
  expertise: number; // 0-100
}

export interface UserRelationship {
  userId: string;
  type: 'friend' | 'acquaintance' | 'colleague' | 'family';
  strength: number; // 0-100
  context: string;
}

export interface ChannelContext {
  id: string;
  name: string;
  type: string;
  topic?: string;
  recentActivity: ActivitySummary;
  participants: string[];
}

export interface ActivitySummary {
  messageCount: number;
  activeUsers: number;
  dominantTopics: string[];
  averageSentiment: number;
  timeframe: string;
}

// Qdrant Integration Types
export interface QdrantConfig {
  url: string;
  apiKey?: string;
  collectionName: string;
  vectorSize: number;
  distance: 'cosine' | 'euclidean' | 'dot';
}

export interface VectorSearchResult {
  id: string;
  score: number;
  payload: ConversationMemory;
}

export interface VectorSearchQuery {
  vector: number[];
  limit: number;
  threshold?: number;
  filter?: Record<string, unknown>;
}

// Web Interface Types
export interface WebUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'moderator' | 'user';
  permissions: string[];
  createdAt: Date;
  lastLogin?: Date;
}

export interface MemoryManagementRequest {
  action: 'create' | 'update' | 'delete' | 'search';
  data: unknown;
  filters?: Record<string, unknown>;
}

export interface MemoryManagementResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Configuration Types
export interface CovaBotConfig {
  discord: {
    token: string;
    clientId: string;
    guildIds?: string[];
  };
  database: {
    url: string;
    maxConnections: number;
  };
  qdrant: QdrantConfig;
  llm: {
    providers: LLMProvider[];
    defaultProvider: string;
  };
  web: {
    port: number;
    host: string;
    cors: {
      origin: string[];
      credentials: boolean;
    };
    auth: {
      jwtSecret: string;
      sessionTimeout: number;
    };
  };
  memory: {
    maxMemoriesPerUser: number;
    retentionDays: number;
    cleanupInterval: number;
  };
  debug: {
    enabled: boolean;
    testingServerIds: string[];
    testingChannelIds: string[];
  };
}

// Error Types
export class CovaBotError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'CovaBotError';
  }
}

export class MemoryError extends CovaBotError {
  constructor(message: string, details?: unknown) {
    super(message, 'MEMORY_ERROR', 500, details);
    this.name = 'MemoryError';
  }
}

export class LLMError extends CovaBotError {
  constructor(message: string, details?: unknown) {
    super(message, 'LLM_ERROR', 500, details);
    this.name = 'LLMError';
  }
}

export class IdentityError extends CovaBotError {
  constructor(message: string, details?: unknown) {
    super(message, 'IDENTITY_ERROR', 500, details);
    this.name = 'IdentityError';
  }
}

// Event Types
export interface CovaBotEvent {
  type: string;
  data: unknown;
  timestamp: Date;
  source: string;
}

export interface MessageProcessedEvent extends CovaBotEvent {
  type: 'message_processed';
  data: {
    messageId: string;
    userId: string;
    serverId: string;
    channelId: string;
    response?: string;
    processingTime: number;
  };
}

export interface MemoryCreatedEvent extends CovaBotEvent {
  type: 'memory_created';
  data: {
    memoryId: string;
    userId: string;
    serverId: string;
    importance: number;
  };
}

export interface PersonalityUpdatedEvent extends CovaBotEvent {
  type: 'personality_updated';
  data: {
    personalityId: string;
    serverId: string;
    changes: string[];
  };
}
