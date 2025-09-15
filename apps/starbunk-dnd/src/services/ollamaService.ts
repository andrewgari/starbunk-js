import { logger } from '@starbunk/shared';

interface OllamaResponse {
	response: string;
	context?: number[];
}

export class OllamaService {
	private static instance: OllamaService;
	private baseUrl: string;
	private model: string;

	private constructor() {
		this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
		this.model = process.env.OLLAMA_MODEL || 'mistral';
	}

	public static getInstance(): OllamaService {
		if (!OllamaService.instance) {
			OllamaService.instance = new OllamaService();
		}
		return OllamaService.instance;
	}

	public async generateResponse(prompt: string, systemPrompt?: string): Promise<string> {
		try {
			const response = await fetch(`${this.baseUrl}/api/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: this.model,
					prompt,
					system: systemPrompt,
					stream: false,
				}),
			});

			if (!response.ok) {
				throw new Error(`Ollama request failed: ${response.statusText}`);
			}

			const data = (await response.json()) as OllamaResponse;
			return data.response;
		} catch (error) {
			logger.error('Error calling Ollama:', error instanceof Error ? error : new Error(String(error)));
			throw new Error('Failed to generate response from Ollama');
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
			logger.error(
				'Error parsing Ollama categorization response:',
				error instanceof Error ? error : new Error(String(error)),
			);
			return {
				category: 'general',
				suggestedTags: [],
				isGMContent: false,
			};
		}
	}

	public async determineRelevantContext(
		question: string,
		availableContent: Array<{
			category: string;
			content: string;
			tags: string[];
		}>,
	): Promise<number[]> {
		const prompt = `Given this question about an RPG campaign:
"${question}"

And these available content pieces:
${availableContent.map((c, i) => `${i + 1}. [${c.category}] ${c.content.substring(0, 100)}...`).join('\n')}

Return ONLY the numbers of the most relevant pieces (max 3) as a JSON array like this: [1, 4, 7]`;

		const response = await this.generateResponse(prompt);
		try {
			return JSON.parse(response);
		} catch (error) {
			logger.error(
				'Error parsing Ollama context selection response:',
				error instanceof Error ? error : new Error(String(error)),
			);
			return [1];
		}
	}

	public async answerQuestion(question: string, context: string, isGM: boolean): Promise<string> {
		const systemPrompt = `You are a helpful RPG campaign assistant. ${isGM ? 'You are speaking to the GM and can reveal all information.' : 'You are speaking to a player. Never reveal information marked as GM-only.'}
Answer questions based ONLY on the provided context. If you're unsure or the context doesn't contain the information, say so.`;

		const prompt = `Context:
${context}

Question: "${question}"

Provide a clear, concise answer based only on the above context.`;

		return this.generateResponse(prompt, systemPrompt);
	}
}
