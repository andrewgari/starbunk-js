/**
 * Validates raw YAML data against the personality config Zod schema.
 *
 * Sits between personality-parser.ts (which reads and parses YAML) and
 * personality-mapper.ts (which converts the validated data to CovaProfile).
 * Isolated so the validation step can be unit-tested independently.
 */

import { yamlConfigSchema } from './personality-schema';
import type { YamlConfigType } from './personality-schema';

/**
 * Validate `data` against the YAML personality schema. On success returns the
 * typed, Zod-coerced config. On failure throws with a human-readable error that
 * includes the dotted field path and the constraint that failed.
 */
export function validateOrThrow(data: unknown): YamlConfigType {
  const result = yamlConfigSchema.safeParse(data);
  if (!result.success) {
    const details = result.error.errors
      .map(e => `${e.path.join('.') || '<root>'}: ${e.message}`)
      .join(', ');
    throw new Error(details);
  }
  return result.data;
}
