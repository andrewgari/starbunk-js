// Starbunk-DND Container-Specific Metrics Implementation
// Tracks campaign management, LLM requests, vector embedding operations,
// cross-server bridging, and file processing for D&D functionality

import * as promClient from 'prom-client';
import { logger } from '../logger';
import { ensureError } from '../../utils/error-utils';
import { StarbunkDNDMetrics, ContainerMetricsBase, ContainerMetricsConfig } from './container-metrics';
import { ProductionMetricsService } from './production-metrics-service';

interface CampaignSession {
	campaignId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	playerCount: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	startTime: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	lastActivity: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	status: 'active' | 'paused' | 'archived'; // eslint-disable-line @typescript-eslint/no-unused-vars
}

interface LLMRequestTracker {
	provider: 'openai' | 'ollama'; // eslint-disable-line @typescript-eslint/no-unused-vars
	model: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	requestType: 'chat' | 'embedding' | 'completion'; // eslint-disable-line @typescript-eslint/no-unused-vars
	startTime: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	tokenCount?: number;
}

interface VectorOperationTracker {
	operation: 'generate' | 'search' | 'index'; // eslint-disable-line @typescript-eslint/no-unused-vars
	startTime: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	documentCount?: number;
	queryType?: string;
}

export class StarbunkDNDMetricsCollector extends ContainerMetricsBase implements StarbunkDNDMetrics {
	// Campaign Management Metrics
	private campaignOperationCounter!: promClient.Counter<string>;
	private campaignOperationDurationHistogram!: promClient.Histogram<string>;
	private activeCampaignsGauge!: promClient.Gauge<string>;
	private campaignPlayerActionCounter!: promClient.Counter<string>;

	// LLM Request Tracking Metrics
	private llmRequestCounter!: promClient.Counter<string>;
	private llmResponseTimeHistogram!: promClient.Histogram<string>;
	private llmTokenUsageHistogram!: promClient.Histogram<string>;
	private llmErrorCounter!: promClient.Counter<string>;
	private llmCostGauge!: promClient.Gauge<string>;

	// Vector Embedding Performance Metrics
	private vectorEmbeddingCounter!: promClient.Counter<string>;
	private vectorEmbeddingTimeHistogram!: promClient.Histogram<string>;
	private vectorSimilaritySearchCounter!: promClient.Counter<string>;
	private vectorSimilaritySearchTimeHistogram!: promClient.Histogram<string>;
	private vectorIndexOperationCounter!: promClient.Counter<string>;
	private vectorIndexSizeGauge!: promClient.Gauge<string>;

	// Cross-Server Bridge Activity Metrics
	private bridgeMessageCounter!: promClient.Counter<string>;
	private bridgeLatencyHistogram!: promClient.Histogram<string>;
	private bridgeErrorCounter!: promClient.Counter<string>;
	private activeBridgesGauge!: promClient.Gauge<string>;

	// File Processing Metrics
	private fileProcessingCounter!: promClient.Counter<string>;
	private fileProcessingTimeHistogram!: promClient.Histogram<string>;
	private fileUploadCounter!: promClient.Counter<string>;
	private fileUploadTimeHistogram!: promClient.Histogram<string>;
	private fileSizeHistogram!: promClient.Histogram<string>;

	// Internal state tracking for production monitoring
	private activeCampaigns = new Map<string, CampaignSession>();
	private activeLLMRequests = new Map<string, LLMRequestTracker>();
	private activeVectorOperations = new Map<string, VectorOperationTracker>();
	private bridgeConnections = new Set<string>();
	private totalLLMTokensUsed = 0;
	private totalFilesProcessed = 0;

	constructor(metrics: ProductionMetricsService, config: ContainerMetricsConfig = {}) {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		super(metrics, 'starbunk-dnd');
		this.initializeMetrics(config);

		// Set up periodic cleanup and cost tracking
		this.setupPeriodicTasks();

		logger.info('Starbunk-DND metrics collector initialized with D&D campaign and LLM tracking');
	}

	private initializeMetrics(_config: ContainerMetricsConfig): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		// Campaign Management Metrics
		this.campaignOperationCounter = new promClient.Counter({
			name: 'starbunk_dnd_campaign_operations_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total number of campaign operations performed', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['operation', 'campaign_id', 'success'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.campaignOperationDurationHistogram = new promClient.Histogram({
			name: 'starbunk_dnd_campaign_operation_duration_ms', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Duration of campaign operations in milliseconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['operation', 'success'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.activeCampaignsGauge = new promClient.Gauge({
			name: 'starbunk_dnd_active_campaigns', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Number of currently active campaigns', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['status'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.campaignPlayerActionCounter = new promClient.Counter({
			name: 'starbunk_dnd_player_actions_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total player actions in campaigns', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['campaign_id', 'player_id', 'action_type'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		// LLM Request Tracking Metrics
		this.llmRequestCounter = new promClient.Counter({
			name: 'starbunk_dnd_llm_requests_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total LLM requests made', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['provider', 'model', 'request_type', 'success'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.llmResponseTimeHistogram = new promClient.Histogram({
			name: 'starbunk_dnd_llm_response_time_ms', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'LLM response time in milliseconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['provider', 'model', 'request_type'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [100, 250, 500, 1000, 2000, 5000, 10000, 20000, 60000], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.llmTokenUsageHistogram = new promClient.Histogram({
			name: 'starbunk_dnd_llm_tokens_used', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Number of tokens used in LLM requests', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['provider', 'model', 'token_type'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [10, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 20000], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.llmErrorCounter = new promClient.Counter({
			name: 'starbunk_dnd_llm_errors_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total LLM request errors', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['provider', 'model', 'error_type'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.llmCostGauge = new promClient.Gauge({
			name: 'starbunk_dnd_llm_estimated_cost_usd', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Estimated LLM usage cost in USD', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['provider', 'model', 'time_period'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		// Vector Embedding Performance Metrics
		this.vectorEmbeddingCounter = new promClient.Counter({
			name: 'starbunk_dnd_vector_embeddings_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total vector embeddings generated', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['document_type', 'success'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.vectorEmbeddingTimeHistogram = new promClient.Histogram({
			name: 'starbunk_dnd_vector_embedding_duration_ms', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Vector embedding generation time in milliseconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['document_count_category'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.vectorSimilaritySearchCounter = new promClient.Counter({
			name: 'starbunk_dnd_vector_similarity_searches_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total vector similarity searches performed', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['query_type', 'result_count_category'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.vectorSimilaritySearchTimeHistogram = new promClient.Histogram({
			name: 'starbunk_dnd_vector_similarity_search_duration_ms', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Vector similarity search time in milliseconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['query_type'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.vectorIndexOperationCounter = new promClient.Counter({
			name: 'starbunk_dnd_vector_index_operations_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total vector index operations', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['operation', 'success'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.vectorIndexSizeGauge = new promClient.Gauge({
			name: 'starbunk_dnd_vector_index_document_count', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Number of documents in vector index', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['index_type'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		// Cross-Server Bridge Activity Metrics
		this.bridgeMessageCounter = new promClient.Counter({
			name: 'starbunk_dnd_bridge_messages_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total messages bridged between servers', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['source_guild', 'target_guild', 'message_type', 'success'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.bridgeLatencyHistogram = new promClient.Histogram({
			name: 'starbunk_dnd_bridge_latency_ms', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Message bridge delivery latency in milliseconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['source_guild', 'target_guild'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.bridgeErrorCounter = new promClient.Counter({
			name: 'starbunk_dnd_bridge_errors_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total bridge operation errors', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['source_guild', 'target_guild', 'error_type'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.activeBridgesGauge = new promClient.Gauge({
			name: 'starbunk_dnd_active_bridges', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Number of active server bridges', // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		// File Processing Metrics
		this.fileProcessingCounter = new promClient.Counter({
			name: 'starbunk_dnd_file_processing_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total files processed', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['file_type', 'success', 'size_category'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.fileProcessingTimeHistogram = new promClient.Histogram({
			name: 'starbunk_dnd_file_processing_duration_ms', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'File processing time in milliseconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['file_type', 'size_category'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.fileUploadCounter = new promClient.Counter({
			name: 'starbunk_dnd_file_uploads_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total file uploads', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['file_extension', 'size_category'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.fileUploadTimeHistogram = new promClient.Histogram({
			name: 'starbunk_dnd_file_upload_duration_ms', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'File upload time in milliseconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['size_category'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [100, 500, 1000, 2500, 5000, 10000, 30000, 60000], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.fileSizeHistogram = new promClient.Histogram({
			name: 'starbunk_dnd_file_size_bytes', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'File sizes in bytes', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['file_type'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600], // 1KB to 100MB // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});
	}

	// ============================================================================
	// Campaign Management Metrics Implementation
	// ============================================================================

	trackCampaignOperation(
		operation: 'create' | 'update' | 'delete' | 'load',
		campaignId?: string,
		duration?: number,
	): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const success = duration !== undefined ? 'true' : 'unknown';

			this.campaignOperationCounter.inc({
				operation,
				campaign_id: campaignId || 'system', // eslint-disable-line @typescript-eslint/no-unused-vars
				success,
			});

			if (duration !== undefined) {
				this.campaignOperationDurationHistogram.observe(
					{
						operation,
						success,
					},
					duration,
				);
			}

			// Update campaign tracking for create/delete operations
			if (operation === 'create' && campaignId) {
				this.activeCampaigns.set(campaignId, {
					campaignId,
					playerCount: 0, // eslint-disable-line @typescript-eslint/no-unused-vars
					startTime: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
					lastActivity: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
					status: 'active', // eslint-disable-line @typescript-eslint/no-unused-vars
				});
				this.updateActiveCampaignsGauge();
			} else if (operation === 'delete' && campaignId) {
				this.activeCampaigns.delete(campaignId);
				this.updateActiveCampaignsGauge();
			}

			logger.debug(`Campaign operation tracked: ${operation}`, {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				campaignId,
				duration,
				activeCampaigns: this.activeCampaigns.size, // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		} catch (error) {
			logger.error('Failed to track campaign operation:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackCampaignPlayerAction(campaignId: string, playerId: string, actionType: string): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			this.campaignPlayerActionCounter.inc({
				campaign_id: campaignId, // eslint-disable-line @typescript-eslint/no-unused-vars
				player_id: playerId, // eslint-disable-line @typescript-eslint/no-unused-vars
				action_type: this.sanitizeLabel(actionType), // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			// Update campaign last activity
			const campaign = this.activeCampaigns.get(campaignId);
			if (campaign) {
				campaign.lastActivity = Date.now();
				this.activeCampaigns.set(campaignId, campaign);
			}

			logger.debug(`Player action tracked: campaign=${campaignId}, action=${actionType}`, {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				playerId,
			});
		} catch (error) {
			logger.error('Failed to track campaign player action:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	// ============================================================================
	// LLM Request Tracking Implementation
	// ============================================================================

	trackLLMRequest(
		provider: 'openai' | 'ollama',
		model: string,
		requestType: 'chat' | 'embedding' | 'completion',
	): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const requestId = `${provider}-${model}-${Date.now()}-${Math.random()}`;

			// Track the start of the request
			this.activeLLMRequests.set(requestId, {
				provider,
				model: this.sanitizeLabel(model), // eslint-disable-line @typescript-eslint/no-unused-vars
				requestType,
				startTime: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			logger.debug(`LLM request started: ${provider}/${model}/${requestType}`, {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				requestId,
				activeRequests: this.activeLLMRequests.size, // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		} catch (error) {
			logger.error('Failed to track LLM request:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackLLMResponse(
		provider: 'openai' | 'ollama',
		model: string,
		responseTime: number,
		tokenCount?: number,
		success?: boolean,
	): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const successStr = success !== undefined ? String(success) : 'true';

			this.llmRequestCounter.inc({
				provider,
				model: this.sanitizeLabel(model), // eslint-disable-line @typescript-eslint/no-unused-vars
				request_type: 'chat', // Default, should be passed from context // eslint-disable-line @typescript-eslint/no-unused-vars
				success: successStr, // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			this.llmResponseTimeHistogram.observe(
				{
					provider,
					model: this.sanitizeLabel(model), // eslint-disable-line @typescript-eslint/no-unused-vars
					request_type: 'chat', // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				responseTime,
			);

			if (tokenCount) {
				this.llmTokenUsageHistogram.observe(
					{
						provider,
						model: this.sanitizeLabel(model), // eslint-disable-line @typescript-eslint/no-unused-vars
						token_type: 'total', // eslint-disable-line @typescript-eslint/no-unused-vars
					},
					tokenCount,
				);

				this.totalLLMTokensUsed += tokenCount;

				// Estimate cost (approximate values)
				const estimatedCost = this.estimateLLMCost(provider, model, tokenCount);
				if (estimatedCost > 0) {
					this.llmCostGauge.inc(
						{
							provider,
							model: this.sanitizeLabel(model), // eslint-disable-line @typescript-eslint/no-unused-vars
							time_period: 'session', // eslint-disable-line @typescript-eslint/no-unused-vars
						},
						estimatedCost,
					);
				}
			}

			logger.debug(`LLM response tracked: ${provider}/${model}`, {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				responseTime,
				tokenCount,
				success,
				totalTokensUsed: this.totalLLMTokensUsed, // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		} catch (error) {
			logger.error('Failed to track LLM response:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackLLMError(provider: 'openai' | 'ollama', model: string, errorType: string): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			this.llmErrorCounter.inc({
				provider,
				model: this.sanitizeLabel(model), // eslint-disable-line @typescript-eslint/no-unused-vars
				error_type: this.sanitizeLabel(errorType), // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			logger.warn(`LLM error tracked: ${provider}/${model}/${errorType}`); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track LLM error:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	// ============================================================================
	// Vector Embedding Performance Implementation
	// ============================================================================

	trackVectorEmbeddingGeneration(documentCount: number, processingTime: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const documentCategory = this.categorizeDocumentCount(documentCount);

			this.vectorEmbeddingCounter.inc(
				{
					document_type: 'campaign_content', // eslint-disable-line @typescript-eslint/no-unused-vars
					success: 'true', // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				documentCount,
			);

			this.vectorEmbeddingTimeHistogram.observe(
				{
					document_count_category: documentCategory, // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				processingTime,
			);

			logger.debug(`Vector embedding generation tracked: ${documentCount} docs in ${processingTime}ms`); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track vector embedding generation:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackVectorSimilaritySearch(queryType: string, resultCount: number, searchTime: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const resultCategory = this.categorizeResultCount(resultCount);

			this.vectorSimilaritySearchCounter.inc({
				query_type: this.sanitizeLabel(queryType), // eslint-disable-line @typescript-eslint/no-unused-vars
				result_count_category: resultCategory, // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			this.vectorSimilaritySearchTimeHistogram.observe(
				{
					query_type: this.sanitizeLabel(queryType), // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				searchTime,
			);

			logger.debug(`Vector similarity search tracked: ${queryType}, ${resultCount} results in ${searchTime}ms`); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track vector similarity search:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackVectorIndexUpdate(operation: 'add' | 'update' | 'delete', documentCount: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			this.vectorIndexOperationCounter.inc(
				{
					operation,
					success: 'true', // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				documentCount,
			);

			logger.debug(`Vector index update tracked: ${operation} ${documentCount} documents`); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track vector index update:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	// ============================================================================
	// Cross-Server Bridge Activity Implementation
	// ============================================================================

	trackBridgeMessage(sourceGuild: string, targetGuild: string, messageType: 'chat' | 'embed' | 'attachment'): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			this.bridgeMessageCounter.inc({
				source_guild: sourceGuild, // eslint-disable-line @typescript-eslint/no-unused-vars
				target_guild: targetGuild, // eslint-disable-line @typescript-eslint/no-unused-vars
				message_type: messageType, // eslint-disable-line @typescript-eslint/no-unused-vars
				success: 'true', // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			// Track active bridge connection
			const bridgeConnection = `${sourceGuild}-${targetGuild}`;
			this.bridgeConnections.add(bridgeConnection);
			this.activeBridgesGauge.set(this.bridgeConnections.size);

			logger.debug(`Bridge message tracked: ${sourceGuild} -> ${targetGuild} (${messageType})`); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track bridge message:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackBridgeLatency(sourceGuild: string, targetGuild: string, deliveryTime: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			this.bridgeLatencyHistogram.observe(
				{
					source_guild: sourceGuild, // eslint-disable-line @typescript-eslint/no-unused-vars
					target_guild: targetGuild, // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				deliveryTime,
			);

			logger.debug(`Bridge latency tracked: ${sourceGuild} -> ${targetGuild} (${deliveryTime}ms)`); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track bridge latency:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	// ============================================================================
	// File Processing Metrics Implementation
	// ============================================================================

	trackFileProcessing(fileType: string, fileSizeBytes: number, processingTime: number, success: boolean): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const sizeCategory = this.categorizeFileSize(fileSizeBytes);

			this.fileProcessingCounter.inc({
				file_type: this.sanitizeLabel(fileType), // eslint-disable-line @typescript-eslint/no-unused-vars
				success: String(success), // eslint-disable-line @typescript-eslint/no-unused-vars
				size_category: sizeCategory, // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			this.fileProcessingTimeHistogram.observe(
				{
					file_type: this.sanitizeLabel(fileType), // eslint-disable-line @typescript-eslint/no-unused-vars
					size_category: sizeCategory, // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				processingTime,
			);

			this.fileSizeHistogram.observe(
				{
					file_type: this.sanitizeLabel(fileType), // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				fileSizeBytes,
			);

			this.totalFilesProcessed++;

			logger.debug(
				`File processing tracked: ${fileType} (${fileSizeBytes} bytes, ${processingTime}ms, success=${success})`,
			); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track file processing:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackFileUpload(fileName: string, sizeBytes: number, uploadTime: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const extension = fileName.split('.').pop() || 'unknown';
			const sizeCategory = this.categorizeFileSize(sizeBytes);

			this.fileUploadCounter.inc({
				file_extension: this.sanitizeLabel(extension), // eslint-disable-line @typescript-eslint/no-unused-vars
				size_category: sizeCategory, // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			this.fileUploadTimeHistogram.observe(
				{
					size_category: sizeCategory, // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				uploadTime,
			);

			logger.debug(`File upload tracked: ${fileName} (${sizeBytes} bytes, ${uploadTime}ms)`); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track file upload:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	// ============================================================================
	// Helper Methods
	// ============================================================================

	private updateActiveCampaignsGauge(): void {
		const statusCounts = { active: 0, paused: 0, archived: 0 }; // eslint-disable-line @typescript-eslint/no-unused-vars

		for (const campaign of this.activeCampaigns.values()) {
			statusCounts[campaign.status]++;
		}

		for (const [status, count] of Object.entries(statusCounts)) {
			this.activeCampaignsGauge.set({ status }, count);
		}
	}

	private estimateLLMCost(provider: string, model: string, tokenCount: number): number {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		// Approximate cost calculation - should be updated with actual pricing
		if (provider === 'openai') {
			if (model.includes('gpt-4')) {
				return (tokenCount / 1000) * 0.03; // $0.03 per 1K tokens (approximate)
			} else if (model.includes('gpt-3.5')) {
				return (tokenCount / 1000) * 0.002; // $0.002 per 1K tokens (approximate)
			}
		}
		return 0; // Ollama is typically free/self-hosted
	}

	private categorizeDocumentCount(count: number): string {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		if (count <= 1) return 'single';
		if (count <= 10) return 'small_batch';
		if (count <= 100) return 'medium_batch';
		return 'large_batch';
	}

	private categorizeResultCount(count: number): string {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		if (count === 0) return 'no_results';
		if (count <= 5) return 'few_results';
		if (count <= 20) return 'many_results';
		return 'large_results';
	}

	private categorizeFileSize(sizeBytes: number): string {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		const sizeMB = sizeBytes / (1024 * 1024);
		if (sizeMB < 0.1) return 'tiny';
		if (sizeMB < 1) return 'small';
		if (sizeMB < 10) return 'medium';
		if (sizeMB < 100) return 'large';
		return 'huge';
	}

	private setupPeriodicTasks(): void {
		// Clean up stale LLM requests every 5 minutes
		setInterval(
			() => {
				this.cleanupStaleLLMRequests();
			},
			5 * 60 * 1000,
		);

		// Update cost metrics every hour
		setInterval(
			() => {
				this.updateCostMetrics();
			},
			60 * 60 * 1000,
		);
	}

	private cleanupStaleLLMRequests(): void {
		const _now = Date.now();
		const staleThreshold = 10 * 60 * 1000; // 10 minutes

		for (const [requestId, request] of this.activeLLMRequests.entries()) {
			if (_now - request.startTime > staleThreshold) {
				this.activeLLMRequests.delete(requestId);
				logger.debug(`Cleaned up stale LLM request: ${requestId}`); // eslint-disable-line @typescript-eslint/no-unused-vars
			}
		}
	}

	private updateCostMetrics(): void {
		// Reset hourly cost tracking (this would be more sophisticated in production)
		logger.debug('Cost metrics updated');
	}

	// ============================================================================
	// Health and Status Methods
	// ============================================================================

	getHealthStatus(): Record<string, any> {
		return {
			containerType: 'starbunk-dnd', // eslint-disable-line @typescript-eslint/no-unused-vars
			campaigns: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				active: this.activeCampaigns.size, // eslint-disable-line @typescript-eslint/no-unused-vars
				statusBreakdown: this.getCampaignStatusSummary(), // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			llmRequests: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				active: this.activeLLMRequests.size, // eslint-disable-line @typescript-eslint/no-unused-vars
				totalTokensUsed: this.totalLLMTokensUsed, // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			vectorOperations: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				active: this.activeVectorOperations.size, // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			bridges: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				active: this.bridgeConnections.size, // eslint-disable-line @typescript-eslint/no-unused-vars
				connections: Array.from(this.bridgeConnections), // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			fileProcessing: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				totalProcessed: this.totalFilesProcessed, // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			lastUpdate: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
		};
	}

	private getCampaignStatusSummary(): Record<string, number> {
		const summary: Record<string, number> = {}; // eslint-disable-line @typescript-eslint/no-unused-vars

		for (const campaign of this.activeCampaigns.values()) {
			summary[campaign.status] = (summary[campaign.status] || 0) + 1;
		}

		return summary;
	}

	getMetricsSummary(): Record<string, any> {
		return {
			campaignManagement: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				operations: 'counter_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				activeCampaigns: this.activeCampaigns.size, // eslint-disable-line @typescript-eslint/no-unused-vars
				playerActions: 'counter_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			llmUsage: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				requestCount: 'counter_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				responsePerformance: 'histogram_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				tokenUsage: this.totalLLMTokensUsed, // eslint-disable-line @typescript-eslint/no-unused-vars
				estimatedCost: 'gauge_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			vectorEmbeddings: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				generationPerformance: 'histogram_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				searchPerformance: 'histogram_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				indexOperations: 'counter_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			serverBridges: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				messageCount: 'counter_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				latencyTracking: 'histogram_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				activeBridges: this.bridgeConnections.size, // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			fileProcessing: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				processingPerformance: 'histogram_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				uploadPerformance: 'histogram_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				totalProcessed: this.totalFilesProcessed, // eslint-disable-line @typescript-eslint/no-unused-vars
			},
		};
	}

	async cleanup(): Promise<void> {
		try {
			// Clear all internal state
			this.activeCampaigns.clear();
			this.activeLLMRequests.clear();
			this.activeVectorOperations.clear();
			this.bridgeConnections.clear();

			// Reset gauges
			this.updateActiveCampaignsGauge();
			this.activeBridgesGauge.set(0);

			logger.info('Starbunk-DND metrics collector cleaned up successfully');
		} catch (error) {
			logger.error('Error during Starbunk-DND metrics cleanup:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
			throw error;
		}
	}
}

// Factory function for creating Starbunk-DND metrics collector
export function createStarbunkDNDMetrics(
	metrics: ProductionMetricsService,
	config: ContainerMetricsConfig = {},
): StarbunkDNDMetricsCollector {
	// eslint-disable-line @typescript-eslint/no-unused-vars
	return new StarbunkDNDMetricsCollector(metrics, config);
}
