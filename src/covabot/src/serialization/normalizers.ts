import type {
  BotIdentityConfig,
  LlmConfig,
  SpeechPatterns,
  TriggerCondition,
  TriggerConfig,
} from '@/models/memory-types';
import type {
  IdentityConfig,
  LlmSchemaType,
  SpeechPatternsConfig,
  ConditionConfig,
  TriggerSchemaType,
} from './personality-schema';

export function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function clamp01(n: number | undefined): number | undefined {
  if (n === undefined) return undefined;
  return clamp(n, 0, 1);
}

export function normalizeSpeechPatterns(sp: SpeechPatternsConfig): SpeechPatterns {
  return {
    lowercase: Boolean(sp.lowercase),
    sarcasmLevel: clamp(sp.sarcasm_level, 0, 1),
    technicalBias: clamp(sp.technical_bias, 0, 1),
  };
}

export function normalizeIdentity(id: IdentityConfig): BotIdentityConfig {
  switch (id.type) {
    case 'static':
      return {
        type: 'static',
        botName: id.botName,
        avatarUrl: id.avatarUrl,
      };
    case 'mimic':
      return { type: 'mimic', as_member: id.as_member };
    case 'random':
      return { type: 'random' };
    default:
      // Exhaustiveness
      return { type: 'random' } as BotIdentityConfig;
  }
}

export function normalizeCondition(cond: ConditionConfig): TriggerCondition {
  const out: TriggerCondition = {};
  if (cond.matches_pattern !== undefined) out.matches_pattern = String(cond.matches_pattern);
  if (cond.contains_word !== undefined) out.contains_word = String(cond.contains_word);
  if (cond.contains_phrase !== undefined) out.contains_phrase = String(cond.contains_phrase);
  if (cond.from_user !== undefined) out.from_user = String(cond.from_user);
  if (cond.with_chance !== undefined) out.with_chance = clamp01(cond.with_chance);
  if (cond.always !== undefined) out.always = Boolean(cond.always);

  if (cond.any_of) out.any_of = cond.any_of.map(c => normalizeCondition(c));
  if (cond.all_of) out.all_of = cond.all_of.map(c => normalizeCondition(c));
  if (cond.none_of) out.none_of = cond.none_of.map(c => normalizeCondition(c));

  return out;
}

export function normalizeTrigger(t: TriggerSchemaType): TriggerConfig {
  const responses = t.responses;
  const normalizedResponses = Array.isArray(responses)
    ? responses.map(r => String(r))
    : responses !== undefined
      ? String(responses)
      : undefined;

  return {
    name: t.name.trim(),
    conditions: normalizeCondition(t.conditions),
    use_llm: Boolean(t.use_llm),
    response_chance: clamp01(t.response_chance),
    responses: normalizedResponses,
  };
}

export function normalizeLlmConfig(llm: LlmSchemaType): LlmConfig {
  return {
    model: llm.model,
    temperature: clamp(llm.temperature, 0, 2),
    max_tokens: Math.max(1, Math.trunc(llm.max_tokens)),
  };
}
