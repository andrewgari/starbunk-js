import { Message } from 'discord.js';
import { logger } from '@starbunk/shared';
import { ensureError } from '../utils';
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
	private channelActivity = new Map<string, number[]>(); // Recent message activity by channel

	// Metrics
	// Note: These metrics use the default global registry since ProductionLLMService
	// is created via factory function and doesn't integrate with the container metrics infrastructure.
	// This is acceptable for this use case as there's only one instance per process.
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

						logger.debug(
							`[LLMService] Ollama health check passed. Available models: ${modelNames.join(', ')}`,
						);

						// Check if the configured model exists
						const configuredModel = this.config.model || 'mistral:latest';
						const modelExists = modelNames.includes(configuredModel);

						// Update model availability metric
						this.modelAvailabilityGauge.set(
							{ model: configuredModel, provider: 'ollama' },
							modelExists ? 1 : 0,
						);

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
											logger.info(
												`[LLMService] ✅ Model '${configuredModel}' is now ready for use`,
											);
											// Update availability metric
											this.modelAvailabilityGauge.set(
												{ model: configuredModel, provider: 'ollama' },
												1,
											);
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
								// Note: Service is marked healthy to allow bot startup, but first few requests
								// may fail until the model download completes. This is intentional to enable
								// fast startup. Failed requests will fall back to emulator or be handled by callers.
								this.isHealthy = true;
								logger.info(
									`[LLMService] ⏳ Bot starting while model '${configuredModel}' downloads in background...`,
								);
								logger.warn(
									`[LLMService] ⚠️  First few requests may fail until model download completes`,
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
					logger.error('[LLMService] Ollama health check failed:', error as Error);
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
			// --- Heuristic-based decision: no external LLM calls ---
			const rawContent = message.content ?? '';
			const content = rawContent.trim();
			if (!content) {
				logger.debug('[LLMService] Heuristic decision: empty message, not responding');
				return false;
			}

			// Never respond to other bots
			if (message.author?.bot) {
				logger.debug('[LLMService] Heuristic decision: author is a bot, not responding');
				return false;
			}

			const lowerContent = content.toLowerCase();

			// Best-effort detection of direct mentions of this bot
			const isDirectMention = this.isDirectMention(message);

			// Explicit text mention of the bot
			const mentionsCovabot = lowerContent.includes('covabot');

			// Deterministic responses: direct mentions or explicit "covabot" text
			if (isDirectMention || mentionsCovabot) {
				logger.debug('[LLMService] Heuristic decision: direct mention / "covabot" detected, responding');
				return true;
			}

			// Probabilistic temperature-based behavior for everything else
			const keywordList = [
				'bot',
				'cova',
				'pugs',
				'kyra',
				'taco bell',
				'honkai',
				'final fantasy',
				'kingdom hearts',
			];
			let keywordHits = 0;
			for (const kw of keywordList) {
				if (lowerContent.includes(kw)) {
					keywordHits += 1;
				}
			}

			// Activity-based temperature: more active channels raise the base probability
			const activityScore = this.getChannelActivityScore(message); // 0..1

			let p = 0.01; // base probability (1%)
			const keywordP = Math.min(0.15, keywordHits * 0.05);
			p += keywordP;

			p += 0.4 * activityScore;

			// Clamp between 0 and 0.5 so we never get overly chatty
			p = Math.max(0, Math.min(0.5, p));

			const roll = Math.random();
			const decision = roll < p;

			logger.debug(
				`[LLMService] Heuristic decision: probabilistic gating p=${p.toFixed(3)} roll=${roll.toFixed(3)} ` +
					`activity=${activityScore.toFixed(3)} keywords=${keywordHits}`,
			);

			return decision;
		} catch (error) {
			logger.error('[LLMService] Error in heuristic shouldRespond decision:', ensureError(error));
			return false;
		}
	}

	/**
	 * Compute an activity score for the channel the message came from.
	 * The score is in [0, 1] based on the number of messages seen in the
	 * last few minutes, used to slightly raise the response probability
	 * in more active channels.
	 */
	private getChannelActivityScore(message: Message): number {
		try {
			const channel: any = (message as any).channel;
			const channelId: string = channel?.id ?? 'unknown';
			const now = Date.now();
			const windowMs = 2 * 60 * 1000; // 2 minutes
			const maxWindowCount = 20; // Saturate activity after ~20 messages in window

			const existing = this.channelActivity.get(channelId) ?? [];
			existing.push(now);

			const cutoff = now - windowMs;
			const pruned = existing.filter((ts) => ts >= cutoff);
			this.channelActivity.set(channelId, pruned);

			const count = pruned.length;
			return Math.min(1, count / maxWindowCount);
		} catch {
			// If anything goes wrong, fall back to neutral activity
			return 0;
		}
	}

	/**
	 * Determine whether this message directly mentions the bot user.
	 *
	 * This is intentionally factored into a helper so we can evolve how
	 * we treat direct mentions (IDs vs. users, role mentions, etc.)
	 * without touching the core heuristic logic.
	 */
	private isDirectMention(message: Message): boolean {
		try {
			const clientUser = (message as any).client?.user;
			if (clientUser && (message as any).mentions?.has) {
				// Discord.js MessageMentions.has accepts a UserResolvable (user or ID)
				return (message as any).mentions.has(clientUser);
			}
		} catch {
			// Fall through to false on any inspection error
		}
		return false;
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
					this.handleModelNotFound(model, 'generate-404', correlationId);
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
					this.handleModelNotFound(model, 'decision-404', correlationId);
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
	 * Handle a model not found (404) error by attempting to auto-pull if enabled
	 * @param model Model name that was not found
	 * @param trigger What triggered the pull (e.g., 'generate-404', 'decision-404')
	 * @param correlationId Correlation ID for logging (optional)
	 */
	private handleModelNotFound(model: string, trigger: string, correlationId?: string): void {
		logger.error(`[LLMService] Ollama model '${model}' not found (404). [${correlationId}]`);

		// Check if model is already being pulled
		if (this.pullingModels.has(model)) {
			logger.info(`[LLMService] Model '${model}' is already being pulled, waiting for completion...`);
			return;
		}

		// Check if auto-pull is enabled
		const autoPull = process.env.OLLAMA_AUTO_PULL_MODELS !== 'false'; // Default to true
		if (autoPull) {
			logger.info(`[LLMService] Auto-pull enabled, attempting to download model '${model}'...`);

			// Attempt to pull the model (async, don't wait)
			this.pullOllamaModel(model, trigger).then((success) => {
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

			// Configurable timeout for large models (default: 20 minutes)
			// Large models (70B+) can be 40+ GB and may take longer to download
			const timeoutMs = parseInt(process.env.OLLAMA_PULL_TIMEOUT_MS || '1200000'); // 20 min default

			const response = await fetch(`${apiUrl}/api/pull`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ name: model }),
				signal: AbortSignal.timeout(timeoutMs),
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
			try {
				await this.performHealthCheck();
			} catch (healthCheckError) {
				const err = ensureError(healthCheckError);
				logger.error(`[LLMService] ⚠️ Health check failed after pulling model '${model}': ${err.message}`);
			}

			return true;
		} catch (error) {
			const duration = (Date.now() - startTime) / 1000;
			const err = ensureError(error);

			logger.error(
				`[LLMService] ❌ Failed to pull model '${model}' after ${duration.toFixed(1)}s: ${err.message}`,
			);

			// Track failure metrics
			this.modelPullCounter.inc({ model, status: 'failed', trigger });
			this.modelPullDurationHistogram.observe({ model, status: 'failed' }, duration);

			// Remove from both sets to allow retry on next attempt
			this.pullingModels.delete(model);
			this.pulledModels.delete(model);
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
