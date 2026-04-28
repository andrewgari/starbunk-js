import * as path from 'path';
import * as yaml from 'js-yaml';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import type { CovaProfile } from '@/models/memory-types';
import { VERBOSE_LOGGING } from '@/utils/verbose-mode';
import {
  readDirectory,
  directoryExists,
  isDirectory,
  fileExists,
  createDirectory,
  readFileUtf8,
  checkReadAccess,
} from './file-reader';
import { validateOrThrow } from './personality-validator';
import { mapToCovaProfile } from './personality-mapper';
import { deepFreeze } from './deep-freeze';

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

/**
 * Markdown files loaded in order to assemble the system prompt.
 * Files that don't exist are silently skipped.
 * core.md provides the base persona; the rest add structured context.
 */
const PERSONALITY_SECTIONS: Array<{ file: string; heading: string }> = [
  { file: 'core.md', heading: '' },
  { file: 'speech.md', heading: '## Speech Style' },
  { file: 'likes.md', heading: '## Things I Like' },
  { file: 'dislikes.md', heading: '## Things I Dislike' },
  { file: 'opinions.md', heading: '## My Opinions' },
  { file: 'beliefs.md', heading: '## Things I Believe' },
];

/**
 * Read markdown personality files from a directory and assemble them into
 * a single system prompt string. Returns empty string if no files are found.
 */
function loadMarkdownSystemPrompt(dirPath: string): string {
  const sections: string[] = [];
  const loaded: string[] = [];
  const skipped: string[] = [];

  for (const { file, heading } of PERSONALITY_SECTIONS) {
    const filePath = path.join(dirPath, file);
    if (!fileExists(filePath)) {
      skipped.push(file);
      continue;
    }

    const content = readFileUtf8(filePath).trim();
    if (!content) {
      skipped.push(`${file} (empty)`);
      continue;
    }

    sections.push(heading ? `${heading}\n${content}` : content);
    loaded.push(file);
  }

  if (VERBOSE_LOGGING) {
    logger
      .withMetadata({ dir: path.basename(dirPath), loaded, skipped })
      .info('Markdown personality files loaded');
  } else if (skipped.length > 0) {
    logger
      .withMetadata({ dir: path.basename(dirPath), skipped })
      .debug('Some personality markdown files not found (optional)');
  }

  return sections.join('\n\n');
}

/**
 * Load a single personality from a directory containing profile.yml and optional markdown files.
 * Markdown files take precedence over the system_prompt field in profile.yml.
 */
export function loadPersonalityFromDirectory(dirPath: string): CovaProfile {
  const profileFilePath = path.join(dirPath, 'profile.yml');
  const baseProfile = parsePersonalityFile(profileFilePath);

  const markdownPrompt = loadMarkdownSystemPrompt(dirPath);
  if (!markdownPrompt) {
    return baseProfile;
  }

  // Overlay the markdown-assembled system prompt onto the frozen base profile
  return deepFreeze({
    ...baseProfile,
    personality: {
      ...baseProfile.personality,
      systemPrompt: markdownPrompt,
    },
  }) as unknown as CovaProfile;
}

/**
 * Load all personality profiles from a directory.
 *
 * Convention: each personality is a subdirectory containing a `profile.yml`
 * and optional markdown files.
 * Example:
 *   personalities/
 *     cova/
 *       profile.yml
 *       core.md
 *       likes.md
 *       ...
 *
 * The subdirectory name is the deployer's identifier — the display name and
 * character details are defined inside profile.yml and the markdown files.
 */
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

  let entries: string[] = [];
  try {
    entries = readDirectory(dirPath);
  } catch (_err) {
    throw new PersonalityParserError(`Unable to read directory: ${dirPath}`);
  }

  const profiles: CovaProfile[] = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry);

    if (isDirectory(entryPath)) {
      // Subdirectory format: [name]/profile.yml with optional markdown files
      try {
        checkReadAccess(entryPath);
      } catch {
        logger
          .withMetadata({ dir: entry, path: entryPath })
          .warn('Personality directory is not readable — check file permissions (chmod a+rX)');
        continue;
      }

      const profileFilePath = path.join(entryPath, 'profile.yml');
      if (!fileExists(profileFilePath)) continue;

      try {
        const profile = loadPersonalityFromDirectory(entryPath);
        profiles.push(profile);
        logger.withMetadata({ dir: entry, profileId: profile.id }).info('Loaded personality');
      } catch (error) {
        logger
          .withError(error)
          .withMetadata({ dir: entry, path: profileFilePath })
          .error('Failed to load personality');
      }
    } else if (entry.endsWith('.yml') || entry.endsWith('.yaml')) {
      // Flat file format: [name].yml directly in the personalities directory
      try {
        const profile = parsePersonalityFile(entryPath);
        profiles.push(profile);
        logger.withMetadata({ file: entry, profileId: profile.id }).info('Loaded personality');
      } catch (error) {
        logger
          .withError(error)
          .withMetadata({ file: entry, path: entryPath })
          .error('Failed to load personality');
      }
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
