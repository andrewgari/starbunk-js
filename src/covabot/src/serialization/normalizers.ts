/**
 * Normalization helpers used by personality-mapper.ts to convert Zod-parsed
 * YAML config values into the runtime CovaProfile types.
 *
 * Each function handles a distinct sub-object:
 * - normalizeSpeechPatterns: snake_case YAML → camelCase SpeechPatterns, with clamping
 * - normalizeIdentity: Zod discriminated union → BotIdentityConfig
 * - normalizeLlmConfig: raw LLM schema → LlmConfig with bounds enforcement
 *
 * clamp and clamp01 are general utilities exported for testing and ad-hoc use.
 */

import type { BotIdentityConfig, LlmConfig, SpeechPatterns } from '@/models/memory-types';
import type { IdentityConfig, LlmSchemaType, SpeechPatternsConfig } from './personality-schema';

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

export function normalizeLlmConfig(llm: LlmSchemaType): LlmConfig {
  return {
    model: llm.model,
    temperature: clamp(llm.temperature, 0, 2),
    max_tokens: Math.max(1, Math.trunc(llm.max_tokens)),
  };
}
