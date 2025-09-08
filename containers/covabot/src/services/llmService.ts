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
				logger.warn('[LLMService] Service unhealthy, remaining silent');
				return '';
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
					// No emulator fallback - remain silent if no LLM configured
					logger.info('[LLMService] No LLM configured, remaining silent');
					return '';
			}

			// Log performance metrics
			const duration = Date.now() - startTime;
			logger.info(`[LLMService] Response generated in ${duration}ms [${correlationId}]`);

			return response;
		} catch (error) {
			const duration = Date.now() - startTime;
			logger.error(`[LLMService] Error generating response after ${duration}ms:`, error as Error);

			// No fallback - remain silent on LLM failure
			logger.info('[LLMService] LLM failed, remaining silent');
			return '';
		}
	}

	async shouldRespond(message: Message): Promise<boolean> {
		try {
			// Use LLM to make decision about whether to respond
			if (this.config.provider === 'emulator' || !this.isHealthy) {
				// If no LLM is available, don't respond
				logger.debug('[LLMService] No LLM available for decision making, not responding');
				return false;
			}

			const correlationId = `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			logger.debug(`[LLMService] Making LLM decision [${correlationId}]`);

			let decision: string;
			switch (this.config.provider) {
				case 'openai':
					decision = await this.getOpenAIDecision(message, correlationId);
					break;
				case 'ollama':
					decision = await this.getOllamaDecision(message, correlationId);
					break;
				default:
					logger.debug('[LLMService] No LLM provider configured for decision making');
					return false;
			}

			const shouldRespond = decision.toUpperCase().includes('YES') || decision.toUpperCase().includes('LIKELY');
			logger.debug(`[LLMService] LLM decision: ${decision} -> ${shouldRespond} [${correlationId}]`);
			return shouldRespond;

		} catch (error) {
			logger.error('[LLMService] Error in shouldRespond decision:', ensureError(error));
			return false;
		}
	}

	private async generateOpenAIResponse(message: Message, context?: string, correlationId?: string): Promise<string> {
		// TODO: Implement OpenAI integration with proper error handling
		logger.warn(`[LLMService] OpenAI integration not yet implemented [${correlationId}]`);
		return '';
	}

	private async generateOllamaResponse(message: Message, context?: string, correlationId?: string): Promise<string> {
		const apiUrl = this.config.apiUrl;
		const model = this.config.model || 'mistral:latest';

		if (!apiUrl) {
			logger.warn(`[LLMService] No Ollama API URL configured [${correlationId}]`);
			return '';
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
			logger.info(`[LLMService] LLM failed, remaining silent [${correlationId}]`);
			return '';
		}
	}

	private async getOpenAIDecision(message: Message, correlationId: string): Promise<string> {
		// TODO: Implement OpenAI decision making
		logger.warn(`[LLMService] OpenAI decision making not yet implemented [${correlationId}]`);
		return 'NO';
	}

	private async getOllamaDecision(message: Message, correlationId: string): Promise<string> {
		const apiUrl = this.config.apiUrl;
		const model = this.config.model || 'mistral:latest';

		if (!apiUrl) {
			logger.warn(`[LLMService] No Ollama API URL configured for decision [${correlationId}]`);
			return 'NO';
		}

		try {
			logger.debug(`[LLMService] Making Ollama decision request to ${apiUrl} [${correlationId}]`);

			const prompt = `${COVA_BOT_PROMPTS.DecisionPrompt}

Message to analyze: "${message.content}"`;

			const requestBody = {
				model: model,
				prompt: prompt,
				stream: false,
				options: {
					temperature: 0.3, // Lower temperature for more consistent decision making
					num_predict: 10, // Short response needed
				},
			};

			const response = await fetch(`${apiUrl}/api/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
				signal: AbortSignal.timeout(10000), // Shorter timeout for decisions
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = (await response.json()) as { response?: string };
			logger.debug(`[LLMService] Ollama decision received: ${data.response} [${correlationId}]`);

			return data.response?.trim() || 'NO';

		} catch (error) {
			logger.error(`[LLMService] Ollama decision request failed [${correlationId}]:`, ensureError(error));
			return 'NO';
		}
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
