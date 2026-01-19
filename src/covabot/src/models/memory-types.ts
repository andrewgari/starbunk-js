/**
 * Core TypeScript interfaces for CovaBot v2 memory and personality system
 */

// Database row types (match SQLite schema)
export interface ConversationRow {
  id: number;
  profile_id: string;
  channel_id: string;
  user_id: string;
  user_name: string | null;
  message_content: string;
  bot_response: string | null;
  created_at: string;
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
export type ResponseReason =
  | 'direct_mention'
  | 'pattern_trigger'
  | 'interest_match'
  | 'random_chime'
  | 'llm_response'
  | 'ignored';

export interface ResponseDecision {
  shouldRespond: boolean;
  reason: ResponseReason;
  useLlm: boolean;
  patternResponse?: string;
  triggerName?: string;
  interestScore?: number;
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

export interface TriggerCondition {
  matches_pattern?: string;
  contains_word?: string;
  contains_phrase?: string;
  from_user?: string;
  with_chance?: number;
  any_of?: TriggerCondition[];
  all_of?: TriggerCondition[];
  none_of?: TriggerCondition[];
  always?: boolean;
}

export interface TriggerConfig {
  name: string;
  conditions: TriggerCondition;
  use_llm: boolean;
  response_chance?: number;
  responses?: string | string[];
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
  system_prompt: string;
  traits: string[];
  interests: string[];
  speech_patterns: SpeechPatterns;
}

export interface ProfileConfig {
  id: string;
  display_name: string;
  avatar_url?: string;
  identity: BotIdentityConfig;
  personality: PersonalityConfig;
  triggers: TriggerConfig[];
  social_battery: SocialBatteryConfig;
  llm: LlmConfig;
  ignore_bots?: boolean;
}

// Runtime profile (parsed and validated)
export interface CovaProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  identity: BotIdentityConfig;
  personality: {
    systemPrompt: string;
    traits: string[];
    interests: string[];
    speechPatterns: SpeechPatterns;
  };
  triggers: TriggerConfig[];
  socialBattery: {
    maxMessages: number;
    windowMinutes: number;
    cooldownSeconds: number;
  };
  llmConfig: LlmConfig;
  ignoreBots: boolean;
}

// Special markers
export const IGNORE_CONVERSATION_MARKER = '<IGNORE_CONVERSATION>';
