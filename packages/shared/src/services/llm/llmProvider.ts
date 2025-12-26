import { LLMService } from './llmService';

export enum LLMProviderType {
	OLLAMA = 'ollama',
	OPENAI = 'openai',
	GEMINI = 'gemini',
}

// Extend LLMProvider from LLMService to ensure compatibility
export type LLMProvider = LLMService;
