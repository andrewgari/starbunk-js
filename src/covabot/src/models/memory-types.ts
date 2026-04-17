/**
 * Core TypeScript interfaces for CovaBot v2 memory and personality system
 */

// Database row types
// Note: ConversationRow is aligned with PostgreSQL schema (UUID IDs, timestamptz columns).
// Other row types (UserFactRow, PersonalityEvolutionRow, etc.) require similar updates
// to match the PostgreSQL schema defined in src/covabot/migrations/covabot_001_init_conversations.sql
export interface ConversationRow {
  id: string; // UUID
  profile_id: string;
  channel_id: string;
  user_id: string;
  message_content: string;
  response_content: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface UserFactRow {
  id: number;
  profile_id: string;
  user_id: string;
  fact_type: 'interest' | 'relationship' | 'preference';
  fact_key: string;
  fact_value: string;
  confidence: number;
  learned_at: string;
}

export interface PersonalityEvolutionRow {
  id: number;
  profile_id: string;
  trait_name: string;
  trait_value: number;
  change_reason: string | null;
  changed_at: string;
}

export interface SocialBatteryStateRow {
  profile_id: string;
  channel_id: string;
  message_count: number;
  window_start: string | null;
  last_message_at: string | null;
}

export interface KeywordInterestRow {
  profile_id: string;
  keyword: string;
  category: string | null;
  weight: number;
}

// Runtime types
export interface ConversationContext {
  messages: {
    userId: string;
    userName: string | null;
    content: string;
    botResponse: string | null;
    timestamp: Date;
  }[];
}

export interface UserFact {
  type: 'interest' | 'relationship' | 'preference';
  key: string;
  value: string;
  confidence: number;
}

export interface SocialBatteryState {
  messageCount: number;
  windowStart: Date | null;
  lastMessageAt: Date | null;
}

export interface InterestMatch {
  keyword: string;
  category: string | null;
  weight: number;
  score: number;
}

// Response decision types
export type ResponseReason = 'direct_mention' | 'llm_response' | 'ignored';

export interface ResponseDecision {
  shouldRespond: boolean;
  reason: ResponseReason;
}

// Structured engagement context passed to LLM for natural engagement decisions
export interface EngagementContext {
  wasMentioned: boolean; // Discord @mention
  nameReferenced: boolean; // bot name/alias appears in message text
  isDirectExchange: boolean; // only 1-2 unique human speakers in recent history
  activeParticipants: string[]; // display names of recent human speakers
  secondsSinceLastResponse: number | null;
  conversationMessageCount: number;
}

export interface SocialBatteryCheck {
  canSpeak: boolean;
  currentCount: number;
  maxAllowed: number;
  reason: 'ok' | 'rate_limited' | 'cooldown';
  windowResetSeconds?: number;
}

// LLM context building
export interface LlmContext {
  systemPrompt: string;
  conversationHistory: string;
  userFacts: string;
  traitModifiers: string;
  engagementContext: EngagementContext;
}

// Personality profile types (match YAML schema)
export interface BotIdentityConfig {
  type: 'static' | 'mimic' | 'random';
  botName?: string;
  avatarUrl?: string;
  as_member?: string;
}

export interface SpeechPatterns {
  lowercase: boolean;
  sarcasmLevel: number;
  technicalBias: number;
}

export interface SocialBatteryConfig {
  max_messages: number;
  window_minutes: number;
  cooldown_seconds: number;
}

export interface LlmConfig {
  model: string;
  temperature: number;
  max_tokens: number;
}

export interface PersonalityConfig {
  system_prompt?: string;
  traits: string[];
  interests: string[];
  topic_affinities?: string[];
  background_facts?: string[];
  speech_patterns: SpeechPatterns;
}

export interface ProfileConfig {
  id: string;
  display_name: string;
  avatar_url?: string;
  name_aliases?: string[];
  identity: BotIdentityConfig;
  personality: PersonalityConfig;
  social_battery: SocialBatteryConfig;
  memory?: { channel_window?: number };
  llm: LlmConfig;
  ignore_bots?: boolean;
}

// Runtime profile (parsed and validated)
export interface CovaProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  nameAliases: string[]; // names/aliases used to detect when the bot is being addressed
  identity: BotIdentityConfig;
  personality: {
    systemPrompt: string;
    traits: string[];
    interests: string[]; // kept for backward compat / InterestService
    topicAffinities: string[]; // engagement signals — not talking points
    backgroundFacts: string[]; // personal details — rarely mentioned
    speechPatterns: SpeechPatterns;
  };
  socialBattery: {
    maxMessages: number;
    windowMinutes: number;
    cooldownSeconds: number;
  };
  memory: {
    channelWindow: number; // how many recent messages to pull as context
  };
  llmConfig: LlmConfig;
  ignoreBots: boolean;
}

// Special markers
export const IGNORE_CONVERSATION_MARKER = '<IGNORE_CONVERSATION>';
