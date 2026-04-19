import type { CovaProfile } from '@/models/memory-types';
import type { YamlConfigType } from './personality-schema';
import { deepFreeze } from './deep-freeze';
import { normalizeIdentity, normalizeLlmConfig, normalizeSpeechPatterns } from './normalizers';

/**
 * Maps a validated, Zod-parsed YAML config to the immutable CovaProfile runtime model.
 *
 * Responsibilities:
 * - Converts snake_case YAML fields to camelCase TypeScript conventions
 * - Applies safe defaults and value clamping (via normalizers)
 * - Falls back from topic_affinities to interests when topic_affinities is absent
 * - Lowercases name aliases for case-insensitive matching at decision time
 * - Deep-freezes the result to prevent accidental mutation during bot operation
 */
export function mapToCovaProfile(config: YamlConfigType): CovaProfile {
  const rawProfile = config.profile;

  const personality = {
    systemPrompt: String(rawProfile.personality.system_prompt ?? '').trim(),
    traits: (rawProfile.personality.traits ?? []).map(t => String(t).trim()).filter(Boolean),
    interests: (rawProfile.personality.interests ?? []).map(i => String(i).trim()).filter(Boolean),
    // topic_affinities falls back to interests for profiles that haven't migrated yet
    topicAffinities: (rawProfile.personality.topic_affinities?.length
      ? rawProfile.personality.topic_affinities
      : (rawProfile.personality.interests ?? [])
    )
      .map(i => String(i).trim())
      .filter(Boolean),
    backgroundFacts: (rawProfile.personality.background_facts ?? [])
      .map(s => String(s).trim())
      .filter(Boolean),
    speechPatterns: normalizeSpeechPatterns(rawProfile.personality.speech_patterns),
  } as CovaProfile['personality'];

  const result: CovaProfile = {
    id: rawProfile.id,
    displayName: rawProfile.display_name,
    avatarUrl: rawProfile.avatar_url,
    // Lowercased so name-reference checks don't need case handling at call sites
    nameAliases: (rawProfile.name_aliases ?? [])
      .map(a => String(a).trim().toLowerCase())
      .filter(Boolean),
    identity: normalizeIdentity(rawProfile.identity),
    personality,
    socialBattery: {
      // Truncate to integers and enforce minimums — YAML floats and zeros are common mistakes
      maxMessages: Math.max(1, Math.trunc(rawProfile.social_battery.max_messages)),
      windowMinutes: Math.max(1, Math.trunc(rawProfile.social_battery.window_minutes)),
      cooldownSeconds: Math.max(0, Math.trunc(rawProfile.social_battery.cooldown_seconds)),
    },
    memory: {
      channelWindow: Math.max(1, Math.trunc(rawProfile.memory?.channel_window ?? 8)),
    },
    llmConfig: normalizeLlmConfig(rawProfile.llm),
    ignoreBots: Boolean(rawProfile.ignore_bots),
  };

  return deepFreeze(result) as unknown as CovaProfile;
}
