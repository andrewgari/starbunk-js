-- CovaBot Conversation Memory Schema - Migration 001
-- Issue: https://github.com/andrewgari/starbunk-js/issues/516
-- Purpose: Initialize PostgreSQL schema for conversation memory with TTL support

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Main conversation history table
CREATE TABLE IF NOT EXISTS covabot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(32) NOT NULL,
  channel_id VARCHAR(32) NOT NULL,
  profile_id VARCHAR(255) NOT NULL,
  message_content TEXT NOT NULL,
  response_content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_conversations_user_created
  ON covabot_conversations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_channel_created
  ON covabot_conversations(channel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_profile
  ON covabot_conversations(profile_id);

CREATE INDEX IF NOT EXISTS idx_conversations_metadata
  ON covabot_conversations USING GIN(metadata);

-- Index for TTL cleanup queries
CREATE INDEX IF NOT EXISTS idx_conversations_created_at
  ON covabot_conversations(created_at);

-- User facts table (learned information about users)
CREATE TABLE IF NOT EXISTS covabot_user_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  fact_type VARCHAR(50) NOT NULL CHECK (fact_type IN ('interest', 'relationship', 'preference')),
  fact_key VARCHAR(255) NOT NULL,
  fact_value TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  learned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(profile_id, user_id, fact_type, fact_key)
);

CREATE INDEX IF NOT EXISTS idx_user_facts_profile_user
  ON covabot_user_facts(profile_id, user_id);

CREATE INDEX IF NOT EXISTS idx_user_facts_type
  ON covabot_user_facts(fact_type);

-- Personality evolution tracking
CREATE TABLE IF NOT EXISTS covabot_personality_evolution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id VARCHAR(255) NOT NULL,
  trait_name VARCHAR(100) NOT NULL,
  trait_value DECIMAL(5,2) NOT NULL,
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_personality_evolution_profile
  ON covabot_personality_evolution(profile_id, changed_at DESC);

-- Social battery state per channel
CREATE TABLE IF NOT EXISTS covabot_social_battery (
  profile_id VARCHAR(255) NOT NULL,
  channel_id VARCHAR(32) NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (profile_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_social_battery_last_message
  ON covabot_social_battery(last_message_at);

-- Keyword interest tracking
CREATE TABLE IF NOT EXISTS covabot_keyword_interests (
  profile_id VARCHAR(255) NOT NULL,
  keyword VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  weight DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  PRIMARY KEY (profile_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_keyword_interests_profile
  ON covabot_keyword_interests(profile_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating timestamps
-- Note: PostgreSQL does not have CREATE TRIGGER IF NOT EXISTS,
-- so we drop and recreate for true idempotency
DROP TRIGGER IF EXISTS update_conversations_updated_at ON covabot_conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON covabot_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_facts_updated_at ON covabot_user_facts;
CREATE TRIGGER update_user_facts_updated_at
  BEFORE UPDATE ON covabot_user_facts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
