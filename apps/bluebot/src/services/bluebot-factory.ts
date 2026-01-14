import { BlueBotService } from './bluebot-service';
import { BlueBotLLMService } from '../llm/blubot-llm-service';
import { createConfiguredLLMProvider } from '../llm/provider-factory';

/**
 * Factory function to create a fully configured BlueBotService.
 * Handles the entire dependency chain:
 * - Creates the LLM provider based on environment configuration
 * - Creates the BlueBotLLMService wrapper
 * - Creates the BlueBotService
 * 
 * @returns A configured BlueBotService instance ready to be initialized
 */
export async function createBlueBotService(): Promise<BlueBotService> {
	// Create the LLM provider based on environment configuration
	const provider = await createConfiguredLLMProvider();
	
	// Wrap the provider in BlueBotLLMService
	const llmService = new BlueBotLLMService(provider);
	
	// Create and return the BlueBotService
	return new BlueBotService(llmService);
}

