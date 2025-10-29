// Contains all the static data from CovaBotConfig

export const COVA_BOT_NAME = 'CovaBot';

export const COVA_BOT_AVATARS = {
	Default: 'https://i.imgur.com/NtfJZP5.png',
};

export const COVA_BOT_PATTERNS = {
	Mention: /\b(cova|covadax|cove|covs|covie)\b/i,
	Question:
		/\b(cova|covadax|cove|covs|covie).*(\?|what|how|why|when|where|who|which|is|are|can|could|should|would|will)/i,
	AtMention: /<@!?139592376443338752>/,
};

export const COVA_BOT_CONFIG = {
	// Response rates by context type
	ResponseRates: {
		HighInterest: 100, // Technical topics, direct questions, expertise areas
		DirectEngagement: 100, // Mentions, direct questions to Cova
		ModerateInterest: 40, // Gaming, comics, general programming
		DebugMode: 20, // Reduced from 100% to prevent spam
		Baseline: 5, // General conversation baseline
	},
	// Cooldown periods for rate limiting
	Cooldowns: {
		ConversationTimeout: 60, // seconds
		CacheDecisionTimeout: 30, // seconds
		CacheCleanupThreshold: 20, // entries
	},
};

/**
 * @deprecated - No longer used in unified LLM trigger
 * Fallback responses are removed in clean slate design
 * Bot now remains silent if LLM fails or returns empty
 */
export const COVA_BOT_FALLBACK_RESPONSES = [
	"Yeah, that's pretty cool.",
	'Hmm, interesting.',
	'I see what you mean.',
	"That's wild.",
	'Neat.',
	'lol yeah',
	'Tell me more about that.',
	'Makes sense to me.',
	'I hear you.',
	'Yeah, totally.',
];

/**
 * @deprecated - Personality prompts moved to personality.txt file
 * These are only used by deprecated trigger implementations (llm-triggers.ts, enhancedLlmTriggers.ts)
 * New llmTrigger.ts uses personalityLoader instead
 *
 * DO NOT ADD PERSONAL INFORMATION HERE
 * All personality data should be in personality.txt (gitignored)
 */
export const COVA_BOT_PROMPTS = {
	// Minimal prompts for deprecated implementations only
	// These should not be used in new code
	EmulatorPrompt: 'You are a helpful bot. Respond naturally and authentically.',
	DecisionPrompt: 'Decide if the bot should respond to this message. Reply only: YES, LIKELY, UNLIKELY, or NO.',
	LLMGenerationPrompt: (messageContent: string, context?: string) => {
		const contextPart = context ? ` Context: ${context}` : '';
		return `Respond naturally to: "${messageContent}"${contextPart}`;
	},
	UnifiedPrompt: 'You are a helpful bot. Decide if you should respond and generate an authentic response.',
};

/**
 * @deprecated - No longer used in unified LLM trigger
 * Replaced by master personality prompt and unified LLM decision
 */
export const COVA_TRIGGER_CHANCE = 1; // 1% chance to respond

/**
 * @deprecated - No longer used in unified LLM trigger
 * Bot now generates authentic responses via LLM
 */
export const COVA_RESPONSE = 'Interesting...';
