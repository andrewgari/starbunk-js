import type { CovaProfile } from '@/models/memory-types';
import type { YamlConfigType } from './personality-schema';
import { deepFreeze } from './deep-freeze';
import { normalizeIdentity, normalizeLlmConfig, normalizeSpeechPatterns } from './normalizers';

/**
 * Maps validated YAML config to the runtime CovaProfile model.
 * Returns an immutable object to prevent accidental mutation at runtime.
 */
export function mapToCovaProfile(config: YamlConfigType): CovaProfile {
  const p = config.profile;

  const personality = {
    systemPrompt: String(p.personality.system_prompt ?? '').trim(),
    traits: (p.personality.traits ?? []).map(t => String(t).trim()).filter(Boolean),
    interests: (p.personality.interests ?? []).map(i => String(i).trim()).filter(Boolean),
    topicAffinities: (p.personality.topic_affinities?.length
      ? p.personality.topic_affinities
      : (p.personality.interests ?? [])
    )
      .map(i => String(i).trim())
      .filter(Boolean),
    backgroundFacts: (p.personality.background_facts ?? [])
      .map(s => String(s).trim())
      .filter(Boolean),
    speechPatterns: normalizeSpeechPatterns(p.personality.speech_patterns),
  } as CovaProfile['personality'];

  const result: CovaProfile = {
    id: p.id,
    displayName: p.display_name,
    avatarUrl: p.avatar_url,
    nameAliases: (p.name_aliases ?? []).map(a => String(a).trim().toLowerCase()).filter(Boolean),
    identity: normalizeIdentity(p.identity),
    personality,
    socialBattery: {
      maxMessages: Math.max(1, Math.trunc(p.social_battery.max_messages)),
      windowMinutes: Math.max(1, Math.trunc(p.social_battery.window_minutes)),
      cooldownSeconds: Math.max(0, Math.trunc(p.social_battery.cooldown_seconds)),
    },
    memory: {
      channelWindow: Math.max(1, Math.trunc(p.memory?.channel_window ?? 8)),
    },
    llmConfig: normalizeLlmConfig(p.llm),
    ignoreBots: Boolean(p.ignore_bots),
  };

  return deepFreeze(result) as unknown as CovaProfile;
}
