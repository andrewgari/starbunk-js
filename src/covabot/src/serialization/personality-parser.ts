import * as path from 'path';
import * as yaml from 'js-yaml';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import type { CovaProfile } from '@/models/memory-types';
import {
  isYamlFile,
  readDirectory,
  directoryExists,
  createDirectory,
  readFileUtf8,
} from './file-reader';
import { validateOrThrow } from './personality-validator';
import { mapToCovaProfile } from './personality-mapper';

const logger = logLayer.withPrefix('PersonalityParser');

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

export function parsePersonalityFile(filePath: string): CovaProfile {
  // 1) Read file
  let content: string;
  try {
    content = readFileUtf8(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
      throw new FileNotFoundError(filePath);
    }
    throw new PersonalityParserError(`Unable to read file: ${filePath}`);
  }

  // 2) Parse YAML
  let raw: unknown;
  try {
    raw = yaml.load(content);
    if (raw === undefined || raw === null) {
      throw new YamlParseError(filePath, 'Empty YAML content');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (err instanceof YamlParseError) throw err;
    throw new YamlParseError(filePath, msg);
  }

  // 3) Validate schema
  let validated;
  try {
    validated = validateOrThrow(raw);
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err);
    throw new ValidationError(filePath, details);
  }

  // 4) Map to runtime model
  return mapToCovaProfile(validated);
}

export function loadPersonalitiesFromDirectory(dirPath: string): CovaProfile[] {
  if (!directoryExists(dirPath)) {
    try {
      createDirectory(dirPath);
      logger.withMetadata({ path: dirPath }).info('Created personalities directory');
    } catch (_err) {
      throw new PersonalityParserError(`Unable to create directory: ${dirPath}`);
    }
    return [];
  }

  let files: string[] = [];
  try {
    files = readDirectory(dirPath);
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
    }
  }
  return profiles;
}

export function getDefaultPersonalitiesPath(): string {
  if (process.env.COVABOT_CONFIG_DIR) {
    return process.env.COVABOT_CONFIG_DIR;
  }
  return path.join(process.cwd(), 'config', 'covabot');
}
