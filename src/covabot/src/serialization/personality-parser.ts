import { z } from 'zod';

/**
 * Personality Schema for Bunkbot and community bots
 *
 * This schema defines a complete chatbot personality including:
 * - Identity (who the bot is)
 * - Core personality traits and communication style
 * - Response behavior rules (WHEN, HOW, WHAT to respond)
 * - Interests and triggers
 * - Guardrails and permissions
 */

// Zod schemas for runtime validation
export const PersonalityTraitSchema = z.object({
  openness: z.number().min(0).max(1).describe('Receptiveness to new ideas, creativity'),
  conscientiousness: z.number().min(0).max(1).describe('Organized, disciplined, reliable'),
  extraversion: z.number().min(0).max(1).describe('Outgoing, social, energetic'),
  agreeableness: z.number().min(0).max(1).describe('Compassionate, cooperative, empathetic'),
  neuroticism: z.number().min(0).max(1).describe('Anxiety, moodiness, emotional sensitivity'),
});

export const CommunicationStyleSchema = z.object({
  tone: z.enum(['formal', 'casual', 'witty', 'supportive', 'authoritative', 'playful']),
  verbosity: z.number().min(0).max(1).describe('0=concise, 1=verbose'),
  sarcasmLevel: z.number().min(0).max(1),
  technicalBias: z.number().min(0).max(1).describe('0=layperson, 1=highly technical'),
  useEmoji: z.boolean(),
  capitalization: z.enum(['normal', 'lowercase', 'UPPERCASE']),
  formalLanguage: z.boolean(),
});

export const ResponseTriggerSchema = z.object({
  keywords: z.array(z.string()).describe('Phrases that trigger a response'),
  patterns: z.array(z.string()).describe('Regex patterns for matching'),
  weight: z.number().min(0).max(1).describe('Priority/likelihood of responding'),
  confidence: z.number().min(0).max(1).describe('Min confidence threshold to engage'),
});

export const ResponseBehaviorSchema = z.object({
  triggers: z.array(ResponseTriggerSchema),
  responseTemplate: z.string().describe('How to structure the response'),
  maxLength: z.number().optional().describe('Character limit for responses'),
  includeContext: z.boolean().describe('Whether to reference conversation history'),
  allowFollowUp: z.boolean().describe('Whether bot should ask clarifying questions'),
});

export const PersonalitySchema = z.object({
  version: z.string(),
  identity: z.object({
    botId: z.string(),
    displayName: z.string(),
    description: z.string(),
    avatarUrl: z.string().url(),
    bannerUrl: z.string().url().optional(),
    role: z.enum(['moderator', 'assistant', 'curator', 'game_master']).optional(),
  }),
  core: z.object({
    systemPrompt: z.string().describe('Primary instruction for the AI model'),
    coreValues: z.array(z.string()).describe('What the bot stands for'),
    traits: PersonalityTraitSchema,
  }),
  communication: CommunicationStyleSchema,
  quirks: z.object({
    catchphrases: z.array(z.string()),
    favoriteEmojis: z.array(z.string()).optional(),
    mannerisms: z.array(z.string()).optional(),
    petPeeves: z.array(z.string()).optional(),
  }),
  interests: z.object({
    primary: z.array(z.string()),
    secondary: z.array(z.string()).optional(),
    triggers: z
      .record(z.string(), ResponseBehaviorSchema)
      .optional()
      .describe('Topic-specific response rules'),
  }),
  guardrails: z.object({
    doNotRespond: z.array(z.string()).describe('Topics or keywords to ignore'),
    escalateToMod: z.array(z.string()).describe('Phrases that trigger mod escalation'),
    banWords: z.array(z.string()).optional(),
    maxResponsesPerConversation: z.number().optional(),
    cooldownSeconds: z.number().optional(),
  }),
  permissions: z.object({
    canModerate: z.boolean(),
    canEditMessages: z.boolean(),
    canDeleteMessages: z.boolean(),
    canMentionEveryone: z.boolean(),
    visibleServers: z.array(z.string()).optional(),
  }),
});
