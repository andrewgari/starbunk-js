/**
 * Core identity and cognitive settings for a bot simulacrum.
 * Incorporates traditional prompts with modern vector-saliency and social pacing.
 */
export interface SimulacrumProfile {
  id: string;                // internal ID (e.g., 'digital-cova')
  displayName: string;       // Discord nickname
  avatarUrl?: string;        // Bot avatar URL for webhook messages

  // 1. Identity & Style
  identity: {
    systemPrompt: string;    // Core persona instructions
    traits: string[];        // Array of traits for dynamic prompt injection
    interests: string[];     // Topics the bot is interested in (for saliency seeding)
    speechPatterns: {
      lowercase: boolean;    // Force lowercase (human-like quirk)
      sarcasmLevel: number;  // 0.0 - 1.0
      technicalBias: number; // 0.0 - 1.0
    };
  };

  // 2. Cognitive Filter (The Saliency Check)
  saliency: {
    qdrantCollection: string; // Which interest-vector set to use
    interestThreshold: number; // 0.0 to 1.0 (Higher = more selective)
    randomChimeRate: number;   // 0.0 to 0.1 (Probability to "lurk" and speak anyway)
  };

  // 3. Social Awareness (The Battery)
  socialBattery: {
    maxMessages: number;     // Burst limit (e.g., 5 messages)
    windowMinutes: number;   // Recharge time (e.g., 10 minutes)
    cooldownSeconds: number; // Forced gap between any two messages
  };

  // 4. LLM Generation
  llmConfig: {
    model: string;           // e.g., 'gpt-4o'
    temperature: number;     // 0.3 - 0.5 (Keep low for consistent personality)
    maxTokens: number;
  };
}

/**
 * Result from saliency check
 */
export interface SaliencyResult {
  shouldRespond: boolean;
  score: number;           // 0.0 - 1.0 similarity score
  reason: 'interest' | 'random_chime' | 'direct_mention' | 'below_threshold';
  matchedInterest?: string; // The interest topic that triggered if any
}

/**
 * Result from social battery check
 */
export interface SocialBatteryResult {
  canSpeak: boolean;
  currentCount: number;       // Messages sent in current window
  maxAllowed: number;         // Maximum messages allowed
  windowResetSeconds: number; // Seconds until window resets
  reason: 'ok' | 'rate_limited' | 'cooldown';
}

/**
 * Combined decision result from all filters
 */
export interface SimulacrumDecision {
  shouldRespond: boolean;
  saliency: SaliencyResult;
  battery: SocialBatteryResult;
  overrideReason?: 'direct_tag' | 'forced'; // Bypass filters if user tagged bot
}

/**
 * Special response marker for when the LLM decides to stay silent
 */
export const IGNORE_CONVERSATION_MARKER = '<IGNORE_CONVERSATION>';

/**
 * Build the selective observer system prompt for a simulacrum
 */
export function buildSelectiveObserverPrompt(
  profile: SimulacrumProfile,
  saliencyScore: number,
  channelContext?: string
): string {
  const styleInstructions: string[] = [];

  if (profile.identity.speechPatterns.lowercase) {
    styleInstructions.push('respond in lowercase');
  }
  if (profile.identity.speechPatterns.sarcasmLevel > 0.5) {
    styleInstructions.push('be slightly sarcastic');
  }
  if (profile.identity.speechPatterns.technicalBias > 0.5) {
    styleInstructions.push('use technically grounded language');
  }

  const traitsSection = profile.identity.traits.length > 0
    ? `\nYour personality traits: ${profile.identity.traits.join(', ')}.`
    : '';

  const interestsSection = profile.identity.interests.length > 0
    ? `\nYour areas of interest: ${profile.identity.interests.join(', ')}.`
    : '';

  const styleSection = styleInstructions.length > 0
    ? `\nStyle: ${styleInstructions.join(', ')}.`
    : '';

  return `${profile.identity.systemPrompt}

You are a selective observer. You have been monitoring this channel and the current message has a saliency score of ${saliencyScore.toFixed(2)} (your threshold is ${profile.saliency.interestThreshold}).
${traitsSection}${interestsSection}${styleSection}

${channelContext ? `Recent channel context:\n${channelContext}\n\n` : ''}IMPORTANT: If you have nothing significant to add to the conversation, return exactly ${IGNORE_CONVERSATION_MARKER} with no other text. Otherwise, respond naturally as your persona.`;
}
