export const CovaBotConfig = {
	Name: 'CovaBot',
	Avatars: {
		// This is a fallback avatar in case we can't get Cova's actual avatar
		Default: 'https://i.imgur.com/NtfJZP5.png'
	},
	Patterns: {
		// Patterns to detect when to send a response
		Mention: /\b(cova|covadax)\b/i,
		Question: /\b(cova|covadax).+\?/i
	},
	// Base probability (0-1) for responding to random messages when LLM decision fails
	ResponseRate: 0.02,
	// List of user IDs that CovaBot shouldn't respond to (including other bots)
	IgnoreUsers: [] as string[]
};

export default CovaBotConfig;
