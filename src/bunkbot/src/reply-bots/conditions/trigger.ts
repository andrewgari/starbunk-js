import { Message } from 'discord.js';

/**
 * Details for a condition that checks for the presence of a specific word.
 */
export interface WordConditionDetails {
  /** The word being matched in the message content. */
  word: string;
  /** Whether the match should be case-sensitive. */
  caseSensitive?: boolean;
}

/**
 * Details for a condition that matches the message content against a pattern.
 */
export interface PatternConditionDetails {
  /** The pattern used to evaluate the condition (e.g., a regex string). */
  pattern: string;
  /** Optional flags associated with the pattern (e.g., regex flags like 'i', 'g'). */
  flags?: string;
}

/**
 * Details for a composite condition that combines multiple other conditions.
 */
export interface CompositeConditionDetails {
  /** The operator used to combine the child conditions. */
  operator: 'all_of' | 'any_of';
  /** Number of child conditions that are combined by this operator. */
  conditionCount: number;
}

/**
 * Generic details for condition types that do not yet have a dedicated interface.
 * This preserves extensibility while still encouraging the use of specific types above.
 */
export interface GenericConditionDetails {
  [key: string]: unknown;
}

/**
 * Union of supported condition detail types.
 */
export type TriggerConditionDetails =
  | WordConditionDetails
  | PatternConditionDetails
  | CompositeConditionDetails
  | GenericConditionDetails;

/**
 * Metadata about a trigger condition for telemetry and logging
 */
export interface TriggerConditionMetadata {
  /** Primary condition type (e.g., 'contains_word', 'matches_pattern', 'all_of') */
  conditionType: string;
  /** Additional details about the condition (e.g., the word being matched, the pattern) */
  conditionDetails?: TriggerConditionDetails;
  /** Human-readable description of what this trigger does */
  description?: string;
}

export interface Trigger {
  name?: string;
  condition: (message: Message) => boolean | Promise<boolean>;
  responseGenerator: (message: Message) => string; // Returns a random string from the trigger or master pool
  /** Optional metadata for telemetry and logging */
  metadata?: TriggerConditionMetadata;
}
