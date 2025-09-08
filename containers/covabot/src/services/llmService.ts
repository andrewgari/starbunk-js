import { Message } from 'discord.js';
import { logger, ensureError } from '@starbunk/shared';
import { COVA_BOT_PROMPTS } from '../cova-bot/constants';

/**
 * Interface for LLM services
 */
export interface LLMService {
	generateResponse(message: Message, context?: string): Promise<string>;
	shouldRespond(message: Message): Promise<boolean>;
}

/**
 * Configuration for LLM services
 */
export interface LLMConfig {
	provider: 'openai' | 'ollama' | 'emulator';
	apiKey?: string;
	apiUrl?: string;
	model?: string;
	temperature?: number;
	maxTokens?: number;
}

/**
 * Production-ready LLM service with fallback to emulator
 * Includes monitoring, error handling, and graceful degradation
 */
export class ProductionLLMService implements LLMService {
	private config: LLMConfig;
	private healthCheckInterval: NodeJS.Timeout | null = null;
	private lastHealthCheck = 0;
	private isHealthy = false;

	constructor(config: LLMConfig) {
		this.config = {
			temperature: 0.7,
			maxTokens: 150,
			...config,
		};

		// Start health monitoring
		this.startHealthMonitoring();
	}

	private startHealthMonitoring(): void {
		// Check health every 5 minutes
		this.healthCheckInterval = setInterval(
			() => {
				this.performHealthCheck();
			},
			5 * 60 * 1000,
		);

		// Initial health check
		this.performHealthCheck();
	}

	private async performHealthCheck(): Promise<void> {
		try {
			logger.debug('[LLMService] Performing health check');

			// TODO: Implement actual health check for OpenAI/Ollama
			if (this.config.provider === 'emulator') {
				this.isHealthy = true;
			} else {
				// For now, assume external services are healthy if configured
				this.isHealthy = Boolean(this.config.apiKey || this.config.apiUrl);
			}

			this.lastHealthCheck = Date.now();
			logger.debug(`[LLMService] Health check passed: ${this.isHealthy}`);
		} catch (error) {
			this.isHealthy = false;
			logger.error('[LLMService] Health check failed:', error as Error);
		}
	}

	async generateResponse(message: Message, context?: string): Promise<string> {
		const startTime = Date.now();

		try {
			// Circuit breaker pattern - fail fast if unhealthy
			if (!this.isHealthy && this.config.provider !== 'emulator') {
				logger.warn('[LLMService] Service unhealthy, falling back to emulator');
				return this.generateEmulatorResponse(message);
			}

			// Add correlation ID for tracing
			const correlationId = `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			logger.debug(`[LLMService] Generating response [${correlationId}]`);

			let response: string;

			switch (this.config.provider) {
				case 'openai':
					response = await this.generateOpenAIResponse(message, context, correlationId);
					break;
				case 'ollama':
					response = await this.generateOllamaResponse(message, context, correlationId);
					break;
				case 'emulator':
				default:
					response = await this.generateEmulatorResponse(message);
					break;
			}

			// Log performance metrics
			const duration = Date.now() - startTime;
			logger.info(`[LLMService] Response generated in ${duration}ms [${correlationId}]`);

			return response;
		} catch (error) {
			const duration = Date.now() - startTime;
			logger.error(`[LLMService] Error generating response after ${duration}ms:`, error as Error);

			// Graceful degradation - always fall back to emulator
			logger.info('[LLMService] Falling back to emulator response');
			return this.generateEmulatorResponse(message);
		}
	}

	async shouldRespond(message: Message): Promise<boolean> {
		try {
			// TODO: Implement LLM-based decision making
			// For now, use the existing logic from simplifiedLlmTriggers
			const content = message.content.toLowerCase();

			// High interest topics
			if (this.isHighInterestContent(content)) {
				return true;
			}

			// Direct engagement
			if (this.isDirectEngagement(content, message)) {
				return true;
			}

			// Moderate interest with probability
			if (this.isModerateInterestContent(content)) {
				return Math.random() < 0.4;
			}

			// Baseline probability
			return Math.random() < 0.05;
		} catch (error) {
			logger.error('[LLMService] Error in shouldRespond decision:', error as Error);
			return false;
		}
	}

	private async generateOpenAIResponse(message: Message, context?: string, correlationId?: string): Promise<string> {
		// TODO: Implement OpenAI integration with proper error handling
		// For now, fall back to emulator
		logger.warn(`[LLMService] OpenAI integration not yet implemented [${correlationId}]`);
		return this.generateEmulatorResponse(message);
	}

	private async generateOllamaResponse(message: Message, context?: string, correlationId?: string): Promise<string> {
		const apiUrl = this.config.apiUrl;
		const model = this.config.model || 'mistral:latest';

		if (!apiUrl) {
			logger.warn(`[LLMService] No Ollama API URL configured [${correlationId}]`);
			return this.generateEmulatorResponse(message);
		}

		try {
			logger.info(`[LLMService] Making Ollama request to ${apiUrl} [${correlationId}]`);

			const prompt = COVA_BOT_PROMPTS.LLMGenerationPrompt(message.content, context);

			const requestBody = {
				model: model,
				prompt: prompt,
				stream: false,
				options: {
					temperature: this.config.temperature || 0.7,
					num_predict: this.config.maxTokens || 150,
				},
			};

			logger.debug(`[LLMService] Ollama request body: ${JSON.stringify(requestBody)} [${correlationId}]`);

			const response = await fetch(`${apiUrl}/api/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
				signal: AbortSignal.timeout(30000), // 30 second timeout
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = (await response.json()) as { response?: string };
			logger.info(`[LLMService] Ollama response received [${correlationId}]`);
			logger.debug(`[LLMService] Ollama response data: ${JSON.stringify(data)} [${correlationId}]`);

			if (data.response) {
				return data.response.trim();
			} else {
				throw new Error('No response field in Ollama response');
			}
		} catch (error) {
			logger.error(`[LLMService] Ollama request failed [${correlationId}]:`, ensureError(error));
			logger.info(`[LLMService] Falling back to emulator [${correlationId}]`);
			return this.generateEmulatorResponse(message);
		}
	}

	private async generateEmulatorResponse(message: Message): Promise<string> {
		// Use the existing emulator logic as a fallback
		const content = message.content.toLowerCase();

		// Simple personality-based responses
		if (content.includes('hello') || content.includes('hi')) {
			return this.getRandomResponse(['Hey there!', "Hi! What's up?", "Hey! How's it going?"]);
		}

		if (content.includes('?')) {
			return this.getRandomResponse([
				"Hmm, that's a good question...",
				'Yeah, let me think about that.',
				"Interesting question! What's the context?",
			]);
		}

		return this.getRandomResponse([
			'Yeah, I see what you mean.',
			'Hmm, interesting.',
			"That's pretty cool.",
			'Makes sense to me.',
		]);
	}

	private isHighInterestContent(content: string): boolean {
		return (
			content.match(/\\b(typescript|javascript|react|node|discord|bot|programming|code|cova|error|bug)\\b/i) !==
			null
		);
	}

	private isDirectEngagement(content: string, message: Message): boolean {
		return message.mentions.users.size > 0 || content.includes('@') || content.includes('cova');
	}

	private isModerateInterestContent(content: string): boolean {
		return content.match(/\\b(game|gaming|comic|batman|superman)\\b/i) !== null;
	}

	private getRandomResponse(responses: string[]): string {
		return responses[Math.floor(Math.random() * responses.length)];
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
			this.healthCheckInterval = null;
		}
	}
}

/**
 * Factory function to create LLM service based on environment
 */
export function createLLMService(): LLMService {
	const config: LLMConfig = {
		provider: 'emulator', // Default to emulator
	};

	// Check for OpenAI configuration
	if (process.env.OPENAI_API_KEY) {
		config.provider = 'openai';
		config.apiKey = process.env.OPENAI_API_KEY;
		config.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
	}

	// Check for Ollama configuration
	else if (process.env.OLLAMA_API_URL) {
		config.provider = 'ollama';
		config.apiUrl = process.env.OLLAMA_API_URL;
		config.model = process.env.OLLAMA_MODEL || 'llama2';
	}

	logger.info(`[LLMService] Initializing ${config.provider} service`);
	return new ProductionLLMService(config);
}
