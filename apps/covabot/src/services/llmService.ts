import { Message } from 'discord.js';
import { logger, ensureError } from '@starbunk/shared';
import { COVA_BOT_PROMPTS } from '../cova-bot/constants';
import * as promClient from 'prom-client';

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
	private pullingModels = new Set<string>(); // Track models currently being pulled
	private pulledModels = new Set<string>(); // Track models we've already attempted to pull

	// Metrics
	private modelPullCounter: promClient.Counter<string>;
	private modelPullDurationHistogram: promClient.Histogram<string>;
	private modelPullSizeGauge: promClient.Gauge<string>;
	private modelAvailabilityGauge: promClient.Gauge<string>;

	constructor(config: LLMConfig) {
		this.config = {
			temperature: 0.7,
			maxTokens: 150,
			...config,
		};

		// Initialize metrics
		this.modelPullCounter = new promClient.Counter({
			name: 'llm_model_pulls_total',
			help: 'Total number of Ollama model pull attempts',
			labelNames: ['model', 'status', 'trigger'],
		});

		this.modelPullDurationHistogram = new promClient.Histogram({
			name: 'llm_model_pull_duration_seconds',
			help: 'Duration of Ollama model pull operations in seconds',
			labelNames: ['model', 'status'],
			buckets: [10, 30, 60, 120, 300, 600, 900, 1200, 1800], // 10s to 30min
		});

		this.modelPullSizeGauge = new promClient.Gauge({
			name: 'llm_model_size_bytes',
			help: 'Size of pulled Ollama models in bytes',
			labelNames: ['model'],
		});

		this.modelAvailabilityGauge = new promClient.Gauge({
			name: 'llm_model_available',
			help: 'Whether the configured LLM model is available (1=available, 0=unavailable)',
			labelNames: ['model', 'provider'],
		});

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

			if (this.config.provider === 'emulator') {
				this.isHealthy = true;
			} else if (this.config.provider === 'ollama') {
				// Check if Ollama service is reachable
				if (!this.config.apiUrl) {
					logger.warn('[LLMService] Ollama API URL not configured');
					this.isHealthy = false;
					return;
				}

				try {
					const response = await fetch(`${this.config.apiUrl}/api/tags`, {
						signal: AbortSignal.timeout(5000), // 5 second timeout
					});

					if (response.ok) {
						const data = (await response.json()) as { models?: Array<{ name: string }> };
						const models = data.models || [];
						const modelNames = models.map((m) => m.name);

						logger.debug(`[LLMService] Ollama health check passed. Available models: ${modelNames.join(', ')}`);

						// Check if the configured model exists
						const configuredModel = this.config.model || 'mistral:latest';
						const modelExists = modelNames.includes(configuredModel);

						// Update model availability metric
						this.modelAvailabilityGauge.set({ model: configuredModel, provider: 'ollama' }, modelExists ? 1 : 0);

						if (!modelExists) {
							logger.warn(
								`[LLMService] Configured model '${configuredModel}' not found. Available: ${modelNames.join(', ')}`,
							);

							// Check if auto-pull is enabled
							const autoPull = process.env.OLLAMA_AUTO_PULL_MODELS !== 'false';
							const pullOnStartup = process.env.OLLAMA_PULL_ON_STARTUP !== 'false'; // Default to true

							if (autoPull && pullOnStartup) {
								logger.info(
									`[LLMService] 🚀 Auto-pull on startup enabled, initiating async download of model '${configuredModel}'...`,
								);

								// Pull the model ASYNCHRONOUSLY so the bot can start immediately
								// Don't await - let it run in the background
								this.pullOllamaModel(configuredModel, 'startup')
									.then((pullSuccess) => {
										if (pullSuccess) {
											logger.info(`[LLMService] ✅ Model '${configuredModel}' is now ready for use`);
											// Update availability metric
											this.modelAvailabilityGauge.set({ model: configuredModel, provider: 'ollama' }, 1);
										} else {
											logger.error(
												`[LLMService] ❌ Failed to pull model '${configuredModel}' on startup. Bot will retry on first use.`,
											);
										}
									})
									.catch((error) => {
										logger.error(
											`[LLMService] ❌ Unexpected error during model pull: ${ensureError(error).message}`,
										);
									});

								// Mark as healthy immediately - model will be available soon
								this.isHealthy = true;
								logger.info(
									`[LLMService] ⏳ Bot starting while model '${configuredModel}' downloads in background...`,
								);
							} else {
								logger.warn(
									`[LLMService] Auto-pull on startup disabled. Please run: ollama pull ${configuredModel}`,
								);
								// Mark as healthy anyway - the bot will attempt to pull on first 404
								this.isHealthy = true;
							}
						} else {
							// Model exists, we're good to go
							logger.info(`[LLMService] ✅ Model '${configuredModel}' is available and ready`);
							this.isHealthy = true;
						}
					} else {
						logger.warn(`[LLMService] Ollama health check failed with status: ${response.status}`);
						this.isHealthy = false;
					}
				} catch (error) {
					logger.warn(
						`[LLMService] Ollama health check failed - service may be unreachable at ${this.config.apiUrl}:`,
						ensureError(error),
					);
					this.isHealthy = false;
				}
			} else if (this.config.provider === 'openai') {
				// For OpenAI, just check if API key is configured
				this.isHealthy = Boolean(this.config.apiKey);
			} else {
				this.isHealthy = false;
			}

			this.lastHealthCheck = Date.now();
			logger.debug(`[LLMService] Health check completed: ${this.isHealthy}`);
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
					response = await this.generateEmulatorResponse(message, context, correlationId);
					break;
				default:
					logger.info('[LLMService] No LLM configured, falling back to emulator');
					response = await this.generateEmulatorResponse(message, context, correlationId);
					break;
			}

			// Log performance metrics
			const duration = Date.now() - startTime;
			logger.info(`[LLMService] Response generated in ${duration}ms [${correlationId}]`);

			return response;
		} catch (error) {
			const duration = Date.now() - startTime;
			logger.error(`[LLMService] Error generating response after ${duration}ms:`, error as Error);

			// Fallback to emulator on failure
			logger.info('[LLMService] LLM failed, falling back to emulator');
			return this.generateEmulatorResponse(message, context, `fallback_${Date.now()}`);
		}
	}

	async shouldRespond(message: Message): Promise<boolean> {
		try {
			// Fast-path: when using emulator (no real LLM), respond to non-empty messages
			if (this.config.provider === 'emulator') {
				const content = message.content?.trim();
				if (!content) {
					logger.debug('[LLMService] Emulator decision: empty message, not responding');
					return false;
				}
				logger.debug('[LLMService] Emulator decision: responding to non-empty message');
				return true;
			}

			// If real provider is unhealthy, do not respond
			if (!this.isHealthy) {
				logger.debug('[LLMService] LLM unhealthy for decision making, not responding');
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
		logger.info('[LLMService] Falling back to emulator for OpenAI provider');
		return this.generateEmulatorResponse(
			message,
			context,
			correlationId ? `openai_fallback_${correlationId}` : undefined,
		);
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
				if (response.status === 404) {
					logger.error(
						`[LLMService] Ollama model '${model}' not found (404). [${correlationId}]`,
					);

					// Check if auto-pull is enabled
					const autoPull = process.env.OLLAMA_AUTO_PULL_MODELS !== 'false'; // Default to true
					if (autoPull) {
						logger.info(`[LLMService] Auto-pull enabled, attempting to download model '${model}'...`);

						// Attempt to pull the model (async, don't wait)
						this.pullOllamaModel(model, 'generate-404').then((success) => {
							if (success) {
								logger.info(`[LLMService] Model '${model}' is now available for future requests`);
							} else {
								logger.error(
									`[LLMService] Failed to auto-pull model '${model}'. Please run manually: ollama pull ${model}`,
								);
							}
						});
					} else {
						logger.error(`[LLMService] Auto-pull disabled. Please run: ollama pull ${model}`);
					}
				}
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = (await response.json()) as { response?: string };
			const respLen = data.response?.length ?? 0;
			logger.info(`[LLMService] Ollama response received [${correlationId}] (chars=${respLen})`);

			if (data.response) {
				return data.response.trim();
			} else {
				throw new Error('No response field in Ollama response');
			}
		} catch (error) {
			const err = ensureError(error);
			logger.error(`[LLMService] Ollama request failed [${correlationId}]:`, err);

			// Mark service as unhealthy if we're getting 404 errors
			if (err.message.includes('404')) {
				logger.error(
					`[LLMService] Marking service as unhealthy due to missing model. Falling back to emulator.`,
				);
				this.isHealthy = false;
			}

			logger.info(`[LLMService] Ollama failed, falling back to emulator [${correlationId}]`);
			return this.generateEmulatorResponse(
				message,
				context,
				correlationId ? `ollama_fallback_${correlationId}` : undefined,
			);
		}
	}

	private async generateEmulatorResponse(
		message: Message,
		context?: string,
		correlationId?: string,
	): Promise<string> {
		// Simple deterministic emulator for tests and fallback behavior
		const content = message.content?.trim() || '';
		const prefix = context ? '[ctx] ' : '';
		const reply = `${prefix}${content ? `You said: ${content}` : 'Hello!'}`;
		logger.debug(`[LLMService] Emulator response [${correlationId}] (chars=${reply.length})`);
		return reply;
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
				if (response.status === 404) {
					logger.error(
						`[LLMService] Ollama model '${model}' not found (404). [${correlationId}]`,
					);

					// Check if auto-pull is enabled
					const autoPull = process.env.OLLAMA_AUTO_PULL_MODELS !== 'false'; // Default to true
					if (autoPull) {
						logger.info(`[LLMService] Auto-pull enabled, attempting to download model '${model}'...`);

						// Attempt to pull the model (async, don't wait)
						this.pullOllamaModel(model, 'decision-404').then((success) => {
							if (success) {
								logger.info(`[LLMService] Model '${model}' is now available for future requests`);
							} else {
								logger.error(
									`[LLMService] Failed to auto-pull model '${model}'. Please run manually: ollama pull ${model}`,
								);
							}
						});
					} else {
						logger.error(`[LLMService] Auto-pull disabled. Please run: ollama pull ${model}`);
					}

					logger.error(
						`[LLMService] Or update OLLAMA_MODEL environment variable to an available model [${correlationId}]`,
					);
				}
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = (await response.json()) as { response?: string };
			logger.debug(`[LLMService] Ollama decision received: ${data.response} [${correlationId}]`);

			return data.response?.trim() || 'NO';
		} catch (error) {
			const err = ensureError(error);
			logger.error(`[LLMService] Ollama decision request failed [${correlationId}]:`, err);

			// Mark service as unhealthy if we're getting consistent failures
			if (err.message.includes('404')) {
				logger.error(
					`[LLMService] Marking service as unhealthy due to missing model. Bot will not respond until model is available.`,
				);
				this.isHealthy = false;
			}

			return 'NO';
		}
	}

	/**
	 * Attempt to pull a model from Ollama
	 * @param model Model name to pull (e.g., 'mistral:latest')
	 * @param trigger What triggered the pull (startup, on-demand, etc.)
	 * @returns Promise that resolves to true if successful, false otherwise
	 */
	private async pullOllamaModel(model: string, trigger: string = 'on-demand'): Promise<boolean> {
		const apiUrl = this.config.apiUrl;
		const startTime = Date.now();

		if (!apiUrl) {
			logger.warn(`[LLMService] Cannot pull model '${model}': No Ollama API URL configured`);
			this.modelPullCounter.inc({ model, status: 'failed', trigger });
			return false;
		}

		// Check if we're already pulling this model
		if (this.pullingModels.has(model)) {
			logger.debug(`[LLMService] Model '${model}' is already being pulled, skipping duplicate request`);
			return false;
		}

		// Check if we've already attempted to pull this model
		if (this.pulledModels.has(model)) {
			logger.debug(`[LLMService] Already attempted to pull model '${model}', skipping to avoid loops`);
			return false;
		}

		this.pullingModels.add(model);
		this.pulledModels.add(model);

		try {
			logger.info(`[LLMService] 🔄 Attempting to pull Ollama model: ${model} (trigger: ${trigger})`);
			logger.info(`[LLMService] This may take several minutes depending on model size...`);

			const response = await fetch(`${apiUrl}/api/pull`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ name: model }),
				signal: AbortSignal.timeout(600000), // 10 minute timeout for large models
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			// Ollama returns a streaming response with progress updates
			// We'll read the stream to completion
			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('No response body from Ollama pull endpoint');
			}

			const decoder = new TextDecoder();
			let lastProgress = '';
			let totalBytes = 0;
			let lastLogTime = Date.now();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split('\n').filter((line) => line.trim());

				for (const line of lines) {
					try {
						const data = JSON.parse(line) as {
							status?: string;
							completed?: number;
							total?: number;
							error?: string;
						};

						if (data.error) {
							throw new Error(data.error);
						}

						// Track total size
						if (data.total) {
							totalBytes = data.total;
						}

						// Log progress updates (throttled to every 5 seconds)
						const now = Date.now();
						if (data.status && (data.status !== lastProgress || now - lastLogTime > 5000)) {
							if (data.total && data.completed) {
								const percent = ((data.completed / data.total) * 100).toFixed(1);
								const mbCompleted = (data.completed / 1024 / 1024).toFixed(1);
								const mbTotal = (data.total / 1024 / 1024).toFixed(1);
								logger.info(
									`[LLMService] 📥 Pulling ${model}: ${data.status} (${percent}% - ${mbCompleted}/${mbTotal} MB)`,
								);
								lastLogTime = now;
							} else {
								logger.info(`[LLMService] 📥 Pulling ${model}: ${data.status}`);
								lastLogTime = now;
							}
							lastProgress = data.status;
						}
					} catch (_parseError) {
						// Ignore JSON parse errors for partial chunks
						logger.debug(`[LLMService] Could not parse pull progress: ${line}`);
					}
				}
			}

			const duration = (Date.now() - startTime) / 1000; // Convert to seconds

			logger.info(`[LLMService] ✅ Successfully pulled model: ${model} (${duration.toFixed(1)}s)`);

			// Track metrics
			this.modelPullCounter.inc({ model, status: 'success', trigger });
			this.modelPullDurationHistogram.observe({ model, status: 'success' }, duration);
			if (totalBytes > 0) {
				this.modelPullSizeGauge.set({ model }, totalBytes);
				const sizeMB = (totalBytes / 1024 / 1024).toFixed(1);
				logger.info(`[LLMService] 📊 Model size: ${sizeMB} MB`);
			}

			this.pullingModels.delete(model);

			// Trigger a health check to update available models
			await this.performHealthCheck();

			return true;
		} catch (error) {
			const duration = (Date.now() - startTime) / 1000;
			const err = ensureError(error);

			logger.error(`[LLMService] ❌ Failed to pull model '${model}' after ${duration.toFixed(1)}s: ${err.message}`);

			// Track failure metrics
			this.modelPullCounter.inc({ model, status: 'failed', trigger });
			this.modelPullDurationHistogram.observe({ model, status: 'failed' }, duration);

			this.pullingModels.delete(model);
			return false;
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
 *
 * Priority order (Ollama is preferred, OpenAI is opt-in only):
 * 1. Ollama (if OLLAMA_API_URL is set)
 * 2. OpenAI (if OPENAI_API_KEY is set) - OPT-IN ONLY
 * 3. Emulator (fallback if neither is configured)
 */
export function createLLMService(): LLMService {
	const config: LLMConfig = {
		provider: 'emulator', // Default to emulator
	};

	// Check for Ollama configuration FIRST (preferred)
	if (process.env.OLLAMA_API_URL) {
		config.provider = 'ollama';
		config.apiUrl = process.env.OLLAMA_API_URL;
		config.model = process.env.OLLAMA_MODEL || 'mistral:latest';
		logger.info('[LLMService] Using Ollama provider (preferred)');
	}
	// Check for OpenAI configuration (opt-in only)
	else if (process.env.OPENAI_API_KEY) {
		config.provider = 'openai';
		config.apiKey = process.env.OPENAI_API_KEY;
		config.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
		logger.info('[LLMService] Using OpenAI provider (opt-in)');
	} else {
		logger.info('[LLMService] No LLM provider configured, using emulator');
	}

	logger.info(`[LLMService] Initializing ${config.provider} service`);
	return new ProductionLLMService(config);
}
