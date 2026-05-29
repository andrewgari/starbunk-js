import * as path from 'path';
import * as yaml from 'js-yaml';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import type { CovaProfile } from '@/models/memory-types';
import { VERBOSE_LOGGING } from '@/utils/verbose-mode';
import { fileExists, readFileUtf8 } from './file-reader';
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
 * Read relationships.md and parse it into a Record<string, string>.
 * Format requires Discord User IDs as Markdown headings:
 * ## 123456789012345678
 * Relationship instruction here...
 */
function loadMarkdownRelationships(dirPath: string): Record<string, string> {
  const filePath = path.join(dirPath, 'relationships.md');
  if (!fileExists(filePath)) {
    return {};
  }

  const content = readFileUtf8(filePath);
  const relationships: Record<string, string> = {};

  // Split by headings consisting of 1-6 '#' characters followed by a Discord User ID (digits only),
  // allowing optional trailing characters (like a username or description) on the same heading line.
  const parts = content.split(/^(?:#{1,6})\s*(\d{17,21})(?:\s+.*)?$/m);

  for (let i = 1; i < parts.length; i += 2) {
    const id = parts[i];
    const relContent = parts[i + 1]?.trim();
    if (id && relContent) {
      relationships[id] = relContent;
    }
  }

  if (VERBOSE_LOGGING && Object.keys(relationships).length > 0) {
    logger
      .withMetadata({ dir: path.basename(dirPath), count: Object.keys(relationships).length })
      .info('Markdown relationships loaded');
  }

  return relationships;
}

/**
 * Load a single personality from a directory containing profile.yml and optional markdown files.
 * Markdown files take precedence over the system_prompt field in profile.yml.
 */
export function loadPersonalityFromDirectory(dirPath: string): CovaProfile {
  const profileFilePath = path.join(dirPath, 'profile.yml');
  const baseProfile = parsePersonalityFile(profileFilePath);

  const markdownPrompt = loadMarkdownSystemPrompt(dirPath);
  const markdownRelationships = loadMarkdownRelationships(dirPath);

  const hasMarkdownPrompt = markdownPrompt.length > 0;
  const hasMarkdownRelationships = Object.keys(markdownRelationships).length > 0;

  if (!hasMarkdownPrompt && !hasMarkdownRelationships) {
    return baseProfile;
  }

  // Overlay the markdown-assembled pieces onto the frozen base profile
  return deepFreeze({
    ...baseProfile,
    personality: {
      ...baseProfile.personality,
      systemPrompt: hasMarkdownPrompt ? markdownPrompt : baseProfile.personality.systemPrompt,
      userRelationships: {
        ...baseProfile.personality.userRelationships,
        ...markdownRelationships,
      },
    },
  }) as unknown as CovaProfile;
}

export function getDefaultPersonalityPath(): string {
  if (process.env.COVABOT_CONFIG_DIR) {
    return process.env.COVABOT_CONFIG_DIR;
  }
  return path.join(process.cwd(), 'config', 'covabot');
}
