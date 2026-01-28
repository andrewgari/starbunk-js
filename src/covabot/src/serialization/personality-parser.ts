/**
 * Personality Parser - YAML file loading and validation
 * 
 * Loads personality configuration files from disk and validates them
 * against the schema defined in personality-schema.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { yamlConfigSchema } from './personality-schema';
import type { CovaProfile } from '@/models/memory-types';

const logger = logLayer.withPrefix('PersonalityParser');

/**
 * Parse a single personality YAML file
 * @param filePath Path to the YAML file
 * @returns Parsed and validated CovaProfile
 */
export function parsePersonalityFile(filePath: string): CovaProfile {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`Personality file not found: ${filePath}`);
  }

  // Read file content
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  // Parse YAML
  let yamlData: unknown;
  try {
    yamlData = yaml.load(fileContent);
  } catch (error) {
    throw new Error(`Failed to parse YAML in ${filePath}: ${error}`);
  }

  // Validate against schema
  const parseResult = yamlConfigSchema.safeParse(yamlData);
  if (!parseResult.success) {
    const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Invalid personality configuration in ${filePath}: ${errors}`);
  }

  const config = parseResult.data;
  const profile = config.profile;

  // Transform to CovaProfile (convert snake_case to camelCase)
  const covaProfile: CovaProfile = {
    id: profile.id,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    identity: profile.identity as CovaProfile['identity'],
    personality: {
      systemPrompt: profile.personality.system_prompt,
      traits: profile.personality.traits,
      interests: profile.personality.interests,
      speechPatterns: {
        lowercase: profile.personality.speech_patterns.lowercase,
        sarcasmLevel: profile.personality.speech_patterns.sarcasm_level,
        technicalBias: profile.personality.speech_patterns.technical_bias,
      },
    },
    triggers: profile.triggers as CovaProfile['triggers'],
    socialBattery: {
      maxMessages: profile.social_battery.max_messages,
      windowMinutes: profile.social_battery.window_minutes,
      cooldownSeconds: profile.social_battery.cooldown_seconds,
    },
    llmConfig: profile.llm as CovaProfile['llmConfig'],
    ignoreBots: profile.ignore_bots ?? true,
  };

  return covaProfile;
}

/**
 * Load all personality files from a directory
 * @param dirPath Directory containing personality YAML files
 * @returns Array of parsed CovaProfiles
 */
export function loadPersonalitiesFromDirectory(dirPath: string): CovaProfile[] {
  // Create directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    logger.withMetadata({ path: dirPath }).info('Creating personalities directory');
    fs.mkdirSync(dirPath, { recursive: true });
    return [];
  }

  const profiles: CovaProfile[] = [];
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    // Only process .yml and .yaml files
    if (!file.endsWith('.yml') && !file.endsWith('.yaml')) {
      continue;
    }

    const filePath = path.join(dirPath, file);
    try {
      const profile = parsePersonalityFile(filePath);
      profiles.push(profile);
      logger.withMetadata({ file, profileId: profile.id }).info('Loaded personality');
    } catch (error) {
      logger.withError(error).withMetadata({ file }).error('Failed to load personality file');
      // Continue loading other files
    }
  }

  return profiles;
}

/**
 * Get the default personalities directory path
 * @returns Default path based on environment
 */
export function getDefaultPersonalitiesPath(): string {
  // Check for environment variable first
  if (process.env.COVABOT_CONFIG_DIR) {
    return process.env.COVABOT_CONFIG_DIR;
  }

  // Default to config/covabot in project root
  return path.join(process.cwd(), 'config', 'covabot');
}

// Legacy schema exports (kept for backwards compatibility)
import { z } from 'zod';

export const PersonalityTraitSchema = z.object({
  openness: z.number().min(0).max(1).describe('Receptiveness to new ideas, creativity'),
  conscientiousness: z.number().min(0).max(1).describe('Organized, disciplined, reliable'),
  extraversion: z.number().min(0).max(1).describe('Outgoing, social, energetic'),
  agreeableness: z.number().min(0).max(1).describe('Compassionate, cooperative, empathetic'),
  neuroticism: z.number().min(0).max(1).describe('Anxiety, moodiness, emotional sensitivity'),
});

export const CommunicationStyleSchema = z.object({
  tone: z.enum(['formal', 'casual', 'witty', 'supportive', 'authoritative', 'playful']),
  verbosity: z.number().min(0).max(1).describe('0=concise, 1=verbose'),
  sarcasmLevel: z.number().min(0).max(1),
  technicalBias: z.number().min(0).max(1).describe('0=layperson, 1=highly technical'),
  useEmoji: z.boolean(),
  capitalization: z.enum(['normal', 'lowercase', 'UPPERCASE']),
  formalLanguage: z.boolean(),
});

export const ResponseTriggerSchema = z.object({
  keywords: z.array(z.string()).describe('Phrases that trigger a response'),
  patterns: z.array(z.string()).describe('Regex patterns for matching'),
  weight: z.number().min(0).max(1).describe('Priority/likelihood of responding'),
  confidence: z.number().min(0).max(1).describe('Min confidence threshold to engage'),
});

export const ResponseBehaviorSchema = z.object({
  triggers: z.array(ResponseTriggerSchema),
  responseTemplate: z.string().describe('How to structure the response'),
  maxLength: z.number().optional().describe('Character limit for responses'),
  includeContext: z.boolean().describe('Whether to reference conversation history'),
  allowFollowUp: z.boolean().describe('Whether bot should ask clarifying questions'),
});

export const PersonalitySchema = z.object({
  version: z.string(),
  identity: z.object({
    botId: z.string(),
    displayName: z.string(),
    description: z.string(),
    avatarUrl: z.string().url(),
    bannerUrl: z.string().url().optional(),
    role: z.enum(['moderator', 'assistant', 'curator', 'game_master']).optional(),
  }),
  core: z.object({
    systemPrompt: z.string().describe('Primary instruction for the AI model'),
    coreValues: z.array(z.string()).describe('What the bot stands for'),
    traits: PersonalityTraitSchema,
  }),
  communication: CommunicationStyleSchema,
  quirks: z.object({
    catchphrases: z.array(z.string()),
    favoriteEmojis: z.array(z.string()).optional(),
    mannerisms: z.array(z.string()).optional(),
    petPeeves: z.array(z.string()).optional(),
  }),
  interests: z.object({
    primary: z.array(z.string()),
    secondary: z.array(z.string()).optional(),
    triggers: z
      .record(z.string(), ResponseBehaviorSchema)
      .optional()
      .describe('Topic-specific response rules'),
  }),
  guardrails: z.object({
    doNotRespond: z.array(z.string()).describe('Topics or keywords to ignore'),
    escalateToMod: z.array(z.string()).describe('Phrases that trigger mod escalation'),
    banWords: z.array(z.string()).optional(),
    maxResponsesPerConversation: z.number().optional(),
    cooldownSeconds: z.number().optional(),
  }),
  permissions: z.object({
    canModerate: z.boolean(),
    canEditMessages: z.boolean(),
    canDeleteMessages: z.boolean(),
    canMentionEveryone: z.boolean(),
    visibleServers: z.array(z.string()).optional(),
  }),
});

export type Personality = z.infer<typeof PersonalitySchema>;
