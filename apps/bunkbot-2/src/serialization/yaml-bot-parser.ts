// apps/bunkbot/src/core/yaml-bot-parser.ts
import { z } from 'zod';
import * as yaml from 'js-yaml';

export const identitySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('static').describe('Use a fixed name and avatar for the bot.'),
    botName: z.string().describe('The name the bot will use in Discord.'),
    avatarUrl: z.string().url().describe('The URL to the image the bot will use as its avatar.'),
  }),
  z.object({
    type: z.literal('mimic').describe('Copy the current profile of a specific Discord user.'),
    as_member: z.string().regex(/^\d{17,19}$/).describe('The Discord User ID of the person to mimic.'),
  }),
  z.object({
    type: z.literal('random').describe('Pick a random member of the server to "possess" for this message.'),
  }),
]).describe('How the bot identifies itself in the chat.');

export const triggerSchema = z.object({
  name: z.string().optional().describe('An internal name for this specific rule.'),
  conditions: z.any().describe('The logic gate (e.g., contains_word, with_chance) for this trigger.'),
  responses: z.union([z.string(), z.array(z.string())]).optional()
    .describe('What the bot says when this trigger fires. If empty, it uses the bot-level responses.'),
});

export const botSchema = z.object({
  name: z.string().describe('The internal unique identifier for this bot.'),
  identity: identitySchema,
  responses: z.union([z.string(), z.array(z.string())]).optional()
    .describe('A master pool of phrases. Use {start} to repeat the beginning of the user message.'),
  triggers: z.array(triggerSchema).describe('A list of independent rules for the bot to follow.'),
  ignore_bots: z.boolean().default(true).describe('If true, the bot will not respond to other bots.'),
  ignore_humans: z.boolean().default(false).describe('If true, the bot will only respond to other bots.'),
});

export const yamlSchema = z.object({
  'reply-bots': z.array(botSchema),
});

export function parseYamlBots(yamlContent: string) {
  try {
    const data = yaml.load(yamlContent);
    return yamlSchema.parse(data);
  } catch (error) {
    console.error('YAML validation error:', error);
    throw error;
  }
}
