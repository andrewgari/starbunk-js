/**
 * Thin, synchronous wrappers around Node's `fs` module used exclusively during
 * startup when personality files are loaded. Synchronous I/O is intentional here
 * — profiles are loaded once before the bot begins accepting messages, so there
 * is no event loop to block.
 */

import * as fs from 'fs';
import * as path from 'path';

const YAML_EXTENSIONS = new Set(['.yml', '.yaml']);

/**
 * Returns true if the given file name has a YAML extension (.yml or .yaml).
 * Not currently used by the parser (which looks for profile.yml by name),
 * but kept as a utility for potential directory-scanning use cases.
 */
export function isYamlFile(fileName: string): boolean {
  return YAML_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

export function readFileUtf8(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

export function readDirectory(dirPath: string): string[] {
  return fs.readdirSync(dirPath);
}

export function directoryExists(dirPath: string): boolean {
  return fs.existsSync(dirPath);
}

export function isDirectory(entryPath: string): boolean {
  try {
    return fs.statSync(entryPath).isDirectory();
  } catch {
    return false;
  }
}

export function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function createDirectory(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}
