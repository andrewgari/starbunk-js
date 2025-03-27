import { LLMProviderType } from '../../services/llm/llmFactory';
import { LLMManager } from '../../services/llm/llmManager';
import { logger } from '../../services/logger';

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

			const response = await provider.createSimpleCompletion(prompt, systemPrompt);
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

	public async answerQuestion(question: string, context: string, isGM: boolean): Promise<string> {
		logger.debug('[GameLLMService] Answering question...', {
			question,
			contextLength: context.length,
			isGM
		});

		const systemPrompt = `You are a helpful assistant for an RPG game.
Your task is to answer questions about the game based on the provided context.
${isGM ? 'You are speaking to the GM and can reveal all information.' : 'You are speaking to a player. Never reveal information marked as GM-only.'}

You must follow these rules:
1. Only use information from the provided context
2. If you don't have enough information, say so
3. Keep responses concise but informative
4. Use markdown formatting for better readability
5. Don't mention that you're an AI or assistant
6. Don't apologize or use phrases like "based on the context"
7. Don't repeat the question back to the user`;

		const prompt = `Context about the RPG campaign:
${context}

Question: "${question}"

Provide a clear, concise answer using only the information from the context.`;

		logger.debug('[GameLLMService] Built answer prompt', {
			promptLength: prompt.length
		});

		try {
			const response = await this.generateResponse(prompt, systemPrompt);
			logger.debug('[GameLLMService] Raw answer response:', response);
			return response.trim();
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.error('[GameLLMService] Error generating answer:', new Error(errorMessage));
			throw error; // Let the caller handle the error
		}
	}
}
