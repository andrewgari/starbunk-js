// Standard LLM service for starbunk-dnd
import { logger } from '@starbunk/shared';

export interface LLMRequest {
	prompt: string;
	maxTokens?: number;
	temperature?: number;
	model?: string;
}

export interface LLMResponse {
	text: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
}

export class StandardLLMService {
	private apiKey: string;
	private baseUrl: string;

	constructor(apiKey?: string, baseUrl?: string) {
		this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
		this.baseUrl = baseUrl || process.env.OLLAMA_API_URL || 'https://api.openai.com/v1';
	}

	async generateText(request: LLMRequest): Promise<LLMResponse> {
		try {
			logger.info('Generating text with LLM', { prompt: request.prompt.substring(0, 100) });

			// Mock response for testing
			const mockResponse: LLMResponse = {
				text: 'This is a mock LLM response for testing purposes.',
				usage: {
					promptTokens: 10,
					completionTokens: 15,
					totalTokens: 25
				}
			};

			logger.info('LLM text generation completed');
			return mockResponse;
		} catch (error) {
			logger.error('Failed to generate text with LLM', error as Error);
			throw error;
		}
	}

	async generateCampaignSummary(campaignData: any): Promise<string> {
		const prompt = `Generate a summary for this D&D campaign: ${JSON.stringify(campaignData)}`;
		const response = await this.generateText({ prompt, maxTokens: 200 });
		return response.text;
	}

	async generateCharacterDescription(character: any): Promise<string> {
		const prompt = `Generate a character description for: ${JSON.stringify(character)}`;
		const response = await this.generateText({ prompt, maxTokens: 150 });
		return response.text;
	}

	async generateQuestIdeas(campaignTheme: string): Promise<string[]> {
		const prompt = `Generate 3 quest ideas for a ${campaignTheme} themed D&D campaign`;
		const response = await this.generateText({ prompt, maxTokens: 300 });
		
		// Parse the response into quest ideas (mock implementation)
		return [
			'Quest 1: The Lost Temple',
			'Quest 2: The Dragon\'s Hoard',
			'Quest 3: The Mysterious Stranger'
		];
	}

	async generateNPCDialogue(npcName: string, context: string): Promise<string> {
		const prompt = `Generate dialogue for NPC ${npcName} in this context: ${context}`;
		const response = await this.generateText({ prompt, maxTokens: 100 });
		return response.text;
	}

	isConfigured(): boolean {
		return !!this.apiKey;
	}

	getModelInfo(): { model: string; provider: string } {
		if (this.baseUrl.includes('openai')) {
			return { model: 'gpt-3.5-turbo', provider: 'OpenAI' };
		} else if (this.baseUrl.includes('ollama')) {
			return { model: 'llama2', provider: 'Ollama' };
		} else {
			return { model: 'unknown', provider: 'unknown' };
		}
	}
}
