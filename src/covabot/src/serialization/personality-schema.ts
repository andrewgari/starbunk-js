/**
 * Zod validation schemas for YAML personality configuration
 */

import { z } from 'zod';

// Identity discriminated union
export const identitySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('static'),
    botName: z.string().describe('Display name for the bot'),
    avatarUrl: z.string().url().optional().describe('Avatar URL for webhook messages'),
  }),
  z.object({
    type: z.literal('mimic'),
    as_member: z.string().regex(/^\d{17,19}$/).describe('Discord User ID to mimic'),
  }),
  z.object({
    type: z.literal('random'),
  }),
]);

// Speech patterns
export const speechPatternsSchema = z.object({
  lowercase: z.boolean().default(false).describe('Force lowercase responses'),
  sarcasm_level: z.number().min(0).max(1).default(0.3).describe('Sarcasm tendency 0.0-1.0'),
  technical_bias: z.number().min(0).max(1).default(0.5).describe('Technical language tendency 0.0-1.0'),
});

// Personality configuration
export const personalitySchema = z.object({
  system_prompt: z.string().describe('Core persona instructions for LLM'),
  traits: z.array(z.string()).default([]).describe('Personality trait descriptors'),
  interests: z.array(z.string()).default([]).describe('Topics the bot is interested in'),
  speech_patterns: speechPatternsSchema.default({
    lowercase: false,
    sarcasm_level: 0.3,
    technical_bias: 0.5,
  }),
});

// Trigger condition (recursive)
export const conditionSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    matches_pattern: z.string().optional(),
    contains_word: z.string().optional(),
    contains_phrase: z.string().optional(),
    from_user: z.string().optional(),
    with_chance: z.number().min(0).max(1).optional(),
    any_of: z.array(conditionSchema).optional(),
    all_of: z.array(conditionSchema).optional(),
    none_of: z.array(conditionSchema).optional(),
    always: z.boolean().optional(),
  }).refine((val) => {
    // At least one condition type must be specified
    const keys = Object.keys(val).filter(k => val[k as keyof typeof val] !== undefined);
    return keys.length > 0;
  }, { message: 'At least one condition type must be specified' })
);

// Trigger configuration
export const triggerSchema = z.object({
  name: z.string().describe('Internal identifier for this trigger'),
  conditions: conditionSchema.describe('Conditions that activate this trigger'),
  use_llm: z.boolean().default(true).describe('Whether to use LLM for response generation'),
  response_chance: z.number().min(0).max(1).optional().describe('Probability of responding when matched'),
  responses: z.union([z.string(), z.array(z.string())]).optional()
    .describe('Canned responses (if use_llm is false)'),
});

// Social battery configuration
export const socialBatterySchema = z.object({
  max_messages: z.number().int().positive().default(5).describe('Burst limit per window'),
  window_minutes: z.number().int().positive().default(10).describe('Window duration in minutes'),
  cooldown_seconds: z.number().int().nonnegative().default(30).describe('Minimum gap between messages'),
});

// LLM configuration
export const llmConfigSchema = z.object({
  model: z.string().default('gpt-4o-mini').describe('OpenAI model to use'),
  temperature: z.number().min(0).max(2).default(0.4).describe('Response creativity'),
  max_tokens: z.number().int().positive().default(256).describe('Maximum response length'),
});

// Full profile schema
export const profileSchema = z.object({
  id: z.string().describe('Unique internal identifier'),
  display_name: z.string().describe('Display name for Discord'),
  avatar_url: z.string().url().optional().describe('Avatar URL for webhook'),
  identity: identitySchema,
  personality: personalitySchema,
  triggers: z.array(triggerSchema).min(1, 'At least one trigger is required'),
  social_battery: socialBatterySchema.default({
    max_messages: 5,
    window_minutes: 10,
    cooldown_seconds: 30,
  }),
  llm: llmConfigSchema.default({
    model: 'gpt-4o-mini',
    temperature: 0.4,
    max_tokens: 256,
  }),
  ignore_bots: z.boolean().default(true).describe('Whether to ignore messages from other bots'),
});

// Root YAML schema
export const yamlConfigSchema = z.object({
  profile: profileSchema,
});

// Type exports
export type IdentityConfig = z.infer<typeof identitySchema>;
export type SpeechPatternsConfig = z.infer<typeof speechPatternsSchema>;
export type PersonalitySchemaType = z.infer<typeof personalitySchema>;
export type ConditionConfig = z.infer<typeof conditionSchema>;
export type TriggerSchemaType = z.infer<typeof triggerSchema>;
export type SocialBatterySchemaType = z.infer<typeof socialBatterySchema>;
export type LlmSchemaType = z.infer<typeof llmConfigSchema>;
export type ProfileSchemaType = z.infer<typeof profileSchema>;
export type YamlConfigType = z.infer<typeof yamlConfigSchema>;
