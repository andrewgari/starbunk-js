import { Message } from 'discord.js';

/**
 * Metadata about a trigger condition for telemetry and logging
 */
export interface TriggerConditionMetadata {
  /** Primary condition type (e.g., 'contains_word', 'matches_pattern', 'all_of') */
  conditionType: string;
  /** Additional details about the condition (e.g., the word being matched, the pattern) */
  conditionDetails?: Record<string, unknown>;
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
