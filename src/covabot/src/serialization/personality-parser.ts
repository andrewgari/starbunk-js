/**
 * Personality Parser - robust YAML loading, validation, and transformation
 *
 * Loads personality configuration files from disk and validates them against
 * the schema defined in personality-schema.ts, then transforms the config to
 * the runtime CovaProfile shape used by the application.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { yamlConfigSchema } from './personality-schema';
import type { YamlConfigType } from './personality-schema';
import type { CovaProfile } from '@/models/memory-types';

const logger = logLayer.withPrefix('PersonalityParser');

// -----------------------------------------------------------------------------
// Error Types
// -----------------------------------------------------------------------------

class PersonalityParserError extends Error {
  constructor(
    message: string,
    public readonly filePath?: string,
  ) {
    super(message);
    this.name = 'PersonalityParserError';
  }
}

class FileNotFoundError extends PersonalityParserError {
  constructor(filePath: string) {
    super(`Personality file not found: ${filePath}`, filePath);
    this.name = 'FileNotFoundError';
  }
}

class YamlParseError extends PersonalityParserError {
  constructor(filePath: string, reason: string) {
    super(`Failed to parse YAML in ${filePath}: ${reason}`, filePath);
    this.name = 'YamlParseError';
  }
}

class ValidationError extends PersonalityParserError {
  constructor(filePath: string, details: string) {
    super(`Invalid personality configuration in ${filePath}: ${details}`, filePath);
    this.name = 'ValidationError';
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const YAML_EXTENSIONS = new Set(['.yml', '.yaml']);

function isYamlFile(fileName: string): boolean {
  return YAML_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function parseYamlFile(filePath: string): unknown {
  // Prefer single read+parse with explicit error surfaces
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new FileNotFoundError(filePath);
    }
    throw new PersonalityParserError(`Unable to read file: ${filePath}`);
  }

  try {
    const data = yaml.load(content);
    if (data === undefined || data === null) {
      throw new YamlParseError(filePath, 'Empty YAML content');
    }
    return data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (err instanceof YamlParseError) throw err;
    throw new YamlParseError(filePath, msg);
  }
}

function validateConfig(yamlData: unknown, filePath: string): YamlConfigType {
  const result = yamlConfigSchema.safeParse(yamlData);
  if (!result.success) {
    const details = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new ValidationError(filePath, details);
  }
  return result.data;
}

function transformToCovaProfile(config: YamlConfigType): CovaProfile {
  const profile = config.profile;
  return {
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
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Parse a single personality YAML file and return a validated CovaProfile
 */
export function parsePersonalityFile(filePath: string): CovaProfile {
  const raw = parseYamlFile(filePath);
  const validated = validateConfig(raw, filePath);
  return transformToCovaProfile(validated);
}

/**
 * Load all personality files from a directory
 * - Creates the directory if it does not exist
 * - Skips non-YAML files
 * - Logs and continues on individual file errors
 */
export function loadPersonalitiesFromDirectory(dirPath: string): CovaProfile[] {
  // Ensure directory exists; if it cannot be created, rethrow for visibility
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.withMetadata({ path: dirPath }).info('Created personalities directory');
    } catch (_err) {
      throw new PersonalityParserError(`Unable to create directory: ${dirPath}`);
    }
    return [];
  }

  let files: string[] = [];
  try {
    files = fs.readdirSync(dirPath);
  } catch (_err) {
    throw new PersonalityParserError(`Unable to read directory: ${dirPath}`);
  }

  const profiles: CovaProfile[] = [];
  for (const file of files) {
    if (!isYamlFile(file)) continue;
    const filePath = path.join(dirPath, file);
    try {
      const profile = parsePersonalityFile(filePath);
      profiles.push(profile);
      logger.withMetadata({ file, profileId: profile.id }).info('Loaded personality');
    } catch (error) {
      logger
        .withError(error)
        .withMetadata({ file, path: filePath })
        .error('Failed to load personality file');
      // Continue loading other files
    }
  }
  return profiles;
}

/**
 * Get the default personalities directory path
 */
export function getDefaultPersonalitiesPath(): string {
  if (process.env.COVABOT_CONFIG_DIR) {
    return process.env.COVABOT_CONFIG_DIR;
  }
  return path.join(process.cwd(), 'config', 'covabot');
}

// =============================================================================
// Legacy Schemas (Backwards Compatibility) - kept for external imports
// =============================================================================
// NOTE: These schemas are for backwards compatibility only and represent an
// older personality configuration format. The current implementation uses
// yamlConfigSchema from personality-schema.ts which maps to CovaProfile.
// These legacy schemas are kept to maintain TypeScript type compatibility.
// =============================================================================

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
