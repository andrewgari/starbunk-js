/**
 * YAML personality file loading and parsing
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { yamlConfigSchema, YamlConfigType } from './personality-schema';
import { CovaProfile } from '@/models/memory-types';

const logger = logLayer.withPrefix('PersonalityParser');

/**
 * Load and parse a single YAML personality file
 */
export function parsePersonalityFile(filePath: string): CovaProfile {
  logger.withMetadata({ file_path: filePath }).info('Loading personality file');

  if (!fs.existsSync(filePath)) {
    logger.withMetadata({ file_path: filePath }).error('Personality file not found');
    throw new Error(`Personality file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');

  let parsed: unknown;
  try {
    parsed = yaml.load(fileContent);
  } catch (yamlError) {
    logger.withError(yamlError).withMetadata({ file_path: filePath }).error('YAML parsing failed');
    throw new Error(`Failed to parse YAML in ${filePath}: ${yamlError}`);
  }

  // Validate with Zod
  const validationResult = yamlConfigSchema.safeParse(parsed);
  if (!validationResult.success) {
    const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    logger.withMetadata({ file_path: filePath, errors }).error('Schema validation failed');
    throw new Error(`Schema validation failed for ${filePath}: ${errors}`);
  }

  const config = validationResult.data;

  // Transform to runtime profile
  const profile = transformToCovaProfile(config);

  logger.withMetadata({
    profile_id: profile.id,
    display_name: profile.displayName,
    triggers_count: profile.triggers.length,
    interests_count: profile.personality.interests.length,
  }).info('Personality loaded successfully');

  return profile;
}

/**
 * Load all personality files from a directory
 */
export function loadPersonalitiesFromDirectory(dirPath: string): CovaProfile[] {
  logger.withMetadata({ dir_path: dirPath }).info('Loading personalities from directory');

  if (!fs.existsSync(dirPath)) {
    logger.withMetadata({ dir_path: dirPath }).warn('Personalities directory not found, creating it');
    fs.mkdirSync(dirPath, { recursive: true });
    return [];
  }

  const files = fs.readdirSync(dirPath).filter(f =>
    f.endsWith('.yml') || f.endsWith('.yaml')
  );

  if (files.length === 0) {
    logger.withMetadata({ dir_path: dirPath }).warn('No personality files found');
    return [];
  }

  const profiles: CovaProfile[] = [];
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    try {
      const profile = parsePersonalityFile(filePath);
      profiles.push(profile);
    } catch (error) {
      logger.withError(error).withMetadata({ file }).error('Failed to load personality file, skipping');
    }
  }

  logger.withMetadata({
    loaded_count: profiles.length,
    total_files: files.length
  }).info('Finished loading personalities');

  return profiles;
}

/**
 * Transform validated YAML config to runtime CovaProfile
 */
function transformToCovaProfile(config: YamlConfigType): CovaProfile {
  const { profile: p } = config;

  return {
    id: p.id,
    displayName: p.display_name,
    avatarUrl: p.avatar_url,
    identity: p.identity,
    personality: {
      systemPrompt: p.personality.system_prompt,
      traits: p.personality.traits,
      interests: p.personality.interests,
      speechPatterns: {
        lowercase: p.personality.speech_patterns.lowercase,
        sarcasmLevel: p.personality.speech_patterns.sarcasm_level,
        technicalBias: p.personality.speech_patterns.technical_bias,
      },
    },
    triggers: p.triggers.map(t => ({
      name: t.name,
      conditions: t.conditions as CovaProfile['triggers'][0]['conditions'],
      use_llm: t.use_llm,
      response_chance: t.response_chance,
      responses: t.responses,
    })),
    socialBattery: {
      maxMessages: p.social_battery.max_messages,
      windowMinutes: p.social_battery.window_minutes,
      cooldownSeconds: p.social_battery.cooldown_seconds,
    },
    llmConfig: {
      model: p.llm.model,
      temperature: p.llm.temperature,
      max_tokens: p.llm.max_tokens,
    },
    ignoreBots: p.ignore_bots,
  };
}

/**
 * Get the default personalities directory path
 */
export function getDefaultPersonalitiesPath(): string {
  // Look relative to the covabot package root
  const packageRoot = path.resolve(__dirname, '../../..');
  return path.join(packageRoot, 'config', 'personalities');
}
