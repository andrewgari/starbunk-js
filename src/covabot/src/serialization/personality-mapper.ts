import type { CovaProfile } from '@/models/memory-types';
import type { YamlConfigType } from './personality-schema';
import { deepFreeze } from './deep-freeze';
import {
  normalizeIdentity,
  normalizeLlmConfig,
  normalizeSpeechPatterns,
  normalizeTrigger,
} from './normalizers';

/**
 * Maps validated YAML config to the runtime CovaProfile model.
 * Returns an immutable object to prevent accidental mutation at runtime.
 */
export function mapToCovaProfile(config: YamlConfigType): CovaProfile {
  const p = config.profile;

  const personality = {
    systemPrompt: String(p.personality.system_prompt).trim(),
    traits: (p.personality.traits ?? []).map(t => String(t).trim()).filter(Boolean),
    interests: (p.personality.interests ?? []).map(i => String(i).trim()).filter(Boolean),
    speechPatterns: normalizeSpeechPatterns(p.personality.speech_patterns),
  } as CovaProfile['personality'];

  const triggers = p.triggers.map(t => normalizeTrigger(t));

  const result: CovaProfile = {
    id: p.id,
    displayName: p.display_name,
    avatarUrl: p.avatar_url,
    identity: normalizeIdentity(p.identity),
    personality,
    triggers,
    socialBattery: {
      maxMessages: Math.max(1, Math.trunc(p.social_battery.max_messages)),
      windowMinutes: Math.max(1, Math.trunc(p.social_battery.window_minutes)),
      cooldownSeconds: Math.max(0, Math.trunc(p.social_battery.cooldown_seconds)),
    },
    llmConfig: normalizeLlmConfig(p.llm),
    ignoreBots: Boolean(p.ignore_bots),
  };

  return deepFreeze(result) as unknown as CovaProfile;
}
