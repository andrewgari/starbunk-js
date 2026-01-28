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
