import { LLMProviderType } from '../../services/llm/llmFactory';
import { LLMManager } from '../../services/llm/llmManager';
import { logger } from '../../services/logger';
import { Campaign } from '../types/game';

export class GameLLMService {
	private static instance: GameLLMService;
	private llmManager: LLMManager;

	private constructor() {
		this.llmManager = new LLMManager(logger, LLMProviderType.OLLAMA);
		this.initialize();
	}

	public static getInstance(): GameLLMService {
		if (!GameLLMService.instance) {
			GameLLMService.instance = new GameLLMService();
		}
		return GameLLMService.instance;
	}

	private async initialize(): Promise<void> {
		await this.llmManager.initializeAllProviders();
	}

	private async generateResponse(prompt: string, systemPrompt?: string): Promise<string> {
		logger.debug('[GameLLMService] Generating response...', {
			promptLength: prompt.length,
			hasSystemPrompt: !!systemPrompt
		});

		try {
			const provider = this.llmManager.getDefaultProvider();
			if (!provider) {
				logger.error('[GameLLMService] No LLM provider available');
				throw new Error('No LLM provider available');
			}

			const response = await provider.createCompletion({
				messages: [
					...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
					{ role: 'user' as const, content: prompt }
				]
			}).then(res => res.content);
			logger.debug('[GameLLMService] Raw LLM response:', response);
			return response.trim();
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error('[GameLLMService] Error generating response:', new Error(errorMessage));
			throw error; // Let the caller handle the error
		}
	}

	public async categorizeNote(content: string): Promise<{
		category: string;
		suggestedTags: string[];
		isGMContent: boolean;
	}> {
		const prompt = `Analyze this RPG campaign note and provide:
1. The most appropriate category (location, npc, quest, lore, item, or general)
2. 3-5 relevant tags
3. Whether this contains GM-sensitive information (true/false)

Note content: "${content}"

Format your response exactly like this example:
{
    "category": "npc",
    "suggestedTags": ["friendly", "merchant", "quest-giver"],
    "isGMContent": false
}`;

		const response = await this.generateResponse(prompt);
		try {
			return JSON.parse(response);
		} catch (error) {
			logger.error('Error parsing categorization response:', error instanceof Error ? error : new Error(String(error)));
			return {
				category: 'general',
				suggestedTags: [],
				isGMContent: false
			};
		}
	}

	public async determineRelevantContext(question: string, availableContent: Array<{
		category: string;
		content: string;
		tags: string[];
	}>): Promise<number[]> {
		logger.debug('[GameLLMService] Determining relevant context...', {
			question,
			availableContentCount: availableContent.length
		});

		const systemPrompt = `You are a helpful assistant that identifies relevant content for RPG game questions.
Your task is to return ONLY a JSON array of numbers (1-based indices) representing the most relevant content pieces.
You must follow these rules:
1. Return ONLY a valid JSON array of numbers
2. Do not include any explanation or additional text
3. Limit your response to at most 3 indices
4. All indices must be between 1 and ${availableContent.length}
5. Format must be exactly like this: [1,4,7]
6. No spaces, newlines, or other characters allowed`;

		const prompt = `Given this question about an RPG campaign:
"${question}"

And these available content pieces:
${availableContent.map((c, i) => `${i + 1}. [${c.category}] ${c.content.substring(0, 100)}...`).join('\n')}

Return ONLY a JSON array of the most relevant piece indices (max 3).`;

		logger.debug('[GameLLMService] Built context selection prompt', {
			promptLength: prompt.length
		});

		try {
			const response = await this.generateResponse(prompt, systemPrompt);
			logger.debug('[GameLLMService] Raw context selection response:', response);

			// Try to extract JSON array from the response
			const jsonMatch = response.match(/\[[\d,\s]+\]/);
			if (!jsonMatch) {
				logger.warn('[GameLLMService] No JSON array found in response, using default');
				return [1];
			}

			const parsed = JSON.parse(jsonMatch[0]);
			if (!Array.isArray(parsed) || !parsed.every(n => typeof n === 'number')) {
				logger.warn('[GameLLMService] Invalid array format in response, using default');
				return [1];
			}

			// Validate indices are within bounds
			const validIndices = parsed.filter(i => i >= 1 && i <= availableContent.length);
			if (validIndices.length === 0) {
				logger.warn('[GameLLMService] No valid indices found, using default');
				return [1];
			}

			logger.debug('[GameLLMService] Successfully parsed context selection', {
				selectedIndices: validIndices
			});
			return validIndices;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error('[GameLLMService] Error parsing context selection response:', new Error(errorMessage));
			return [1];
		}
	}

	public async answerQuestion(question: string, context: string, isGM: boolean, campaign: Campaign): Promise<string> {
		logger.debug('[GameLLMService] Answering question...', {
			question,
			contextLength: context.length,
			isGM,
			campaignSystem: campaign.system
		});

		const systemPrompt = `You are an expert game master and rules advisor EXCLUSIVELY for ${campaign.system.name} ${campaign.system.version}.
You are assisting with the "${campaign.name}" campaign.

SYSTEM FOCUS: ${campaign.system.name} ${campaign.system.version}
- You ONLY know the rules for this specific system and version
- You MUST NOT mix in rules from other systems (like D&D 5E, Pathfinder 1E, etc.)
- If unsure about a rule, state that you need to verify the ${campaign.system.name} rules
- If a rule exists in another system but not in ${campaign.system.name}, do not mention it

SECURITY CLEARANCE: ${isGM ? 'GM - Full Access' : 'Player - Restricted Access'}
${!isGM ? 'CRITICAL: You must never reveal GM-only information or secret content under any circumstances.' : ''}

STRICT RESPONSE SCOPE:
1. You MUST ONLY answer questions about:
   * ${campaign.system.name} ${campaign.system.version} rules and mechanics (no other editions or systems)
   * Character creation and advancement as defined in ${campaign.system.name}
   * Combat and skill mechanics specific to this system
   * Spells and abilities from the ${campaign.system.name} rulebooks only
   * Items and equipment defined in ${campaign.system.name}
   * Campaign-specific lore and events (when provided in context)
2. You MUST NOT answer questions about:
   * Rules from other game systems
   * House rules unless explicitly provided in context
   * Real-world topics outside of TTRPGs
   * Cooking or recipes
   * Technology or programming
   * Personal advice
   * Any non-TTRPG subject matter
3. For off-topic questions, respond with:
   "I can only answer questions about ${campaign.system.name} rules and this campaign's content. Your question appears to be about something else."
4. For questions about other systems' rules, respond with:
   "I can only provide rules for ${campaign.system.name} ${campaign.system.version}. This may work differently in other systems."

Core Responsibilities:
1. Answer questions about ${campaign.system.name} rules and mechanics with complete accuracy
2. For general system questions, use your comprehensive knowledge of ${campaign.system.name} ${campaign.system.version} ONLY
3. For campaign-specific questions, use the provided context
4. ${!isGM ? 'Strictly protect all GM-only information' : 'Manage all campaign information appropriately'}
5. Maintain strict separation between ${campaign.system.name} rules and other systems

Knowledge Scope:
- Complete understanding of ${campaign.system.name} ${campaign.system.version} rules and mechanics
- Deep expertise in:
  * ${campaign.system.name}-specific combat mechanics including all weapon properties and special rules
  * Character abilities and their variations as defined in ${campaign.system.name}
  * Spells and their complete effects from ${campaign.system.name} sourcebooks
  * Items and their full usage rules as written in ${campaign.system.name}
- Campaign-specific details when provided in context ${!isGM ? '(public information only)' : ''}
- NO knowledge of other game systems or editions

Access Control Rules:
1. Public Information: ${campaign.system.name} rules, basic mechanics, and publicly known campaign details
2. Restricted Information: GM notes, secret plots, hidden mechanics, and unrevealed content
3. ${!isGM ? 'You have access to PUBLIC information only' : 'You have access to both PUBLIC and RESTRICTED information'}
4. If in doubt about information security, always err on the side of protection

Response Guidelines:
1. Always start your response by repeating the question in a code block
2. Be thorough and precise about ${campaign.system.name} rules specifically
3. Include relevant special cases, variations, and options FROM THIS SYSTEM ONLY
4. For equipment and abilities, list all relevant properties and effects AS DEFINED IN ${campaign.system.name}
5. Keep responses clear and well-structured
6. Use markdown formatting for better readability
7. Don't mention that you're an AI or assistant
8. Don't apologize or use phrases like "based on the context"
9. ${!isGM ? 'If asked about restricted information, respond with "That information is only available to the GM"' : 'Include complete information in responses'}
10. If asked about non-TTRPG topics, use the standard off-topic response
11. If unsure about a rule, admit uncertainty rather than guessing or using rules from other systems

Response Format Example:
\`\`\`
What is the damage of a longsword?
\`\`\`

[Your response should cite the exact ${campaign.system.name} rules for longsword damage]`;

		const prompt = context
			? `Campaign Context:\n${context}\n\nQuestion:\n\`\`\`\n${question}\n\`\`\`\n\nProvide a clear, concise answer using your system knowledge and any relevant campaign context.`
			: `Question:\n\`\`\`\n${question}\n\`\`\`\n\nProvide a clear, concise answer using your knowledge of ${campaign.system.name} ${campaign.system.version}.`;

		logger.debug('[GameLLMService] Built answer prompt', {
			promptLength: prompt.length,
			hasContext: !!context
		});

		try {
			const response = await this.generateResponse(prompt, systemPrompt);
			logger.debug('[GameLLMService] Raw answer response:', response);
			return response.trim();
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error('[GameLLMService] Error generating answer:', new Error(errorMessage));
			throw error;
		}
	}
}
