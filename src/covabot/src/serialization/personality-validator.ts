import { yamlConfigSchema } from './personality-schema';
import type { YamlConfigType } from './personality-schema';

/**
 * Validates raw YAML data against the personality schema.
 * Throws an Error with a concise, readable message on failure.
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
