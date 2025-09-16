/**
 * Example implementation of the unified metrics collector system
 * Shows how to integrate unified metrics into Discord bot containers
 */

import { logger } from '../../logger';
import {
	initializeUnifiedObservability,
	startUnifiedMetricsSystem,
	type UnifiedEndpointConfig,
	type ServiceMetricContext,
	type ServiceMessageFlowMetrics,
} from '../index';

// Example: BunkBot integration with unified metrics
export class BunkBotWithUnifiedMetrics {
	private observability: any;
	private isInitialized = false;

	async initialize(serviceName: string = 'bunkbot'): Promise<void> {
		try {
			logger.info(`Initializing ${serviceName} with unified metrics...`);

			// Option 1: Use the enhanced initialization (recommended)
			this.observability = initializeUnifiedObservability(serviceName, {
				enableUnified: true,
				unifiedConfig: {
					// Optional: customize unified metrics configuration
					collectorConfig: {
						enableMetrics: true,
						enableHealth: true,
						enableServiceInfo: true,
					},
					enableServiceHealthChecks: true,
					healthCheckInterval: 30000,
				},
			});

			// The unified endpoint is automatically started
			if (this.observability.unifiedEndpoint) {
				await this.observability.unifiedEndpoint.initialize();

				logger.info('Unified metrics initialized', {
					metricsEndpoint: this.observability.unifiedEndpoint.getMetricsEndpoint(),
					healthEndpoint: this.observability.unifiedEndpoint.getHealthEndpoint(),
				});
			}

			this.isInitialized = true;

		} catch (error) {
			logger.error('Failed to initialize unified metrics:', error);
			throw error;
		}
	}

	// Example: Track bot trigger with service context
	trackBotTrigger(botName: string, conditionName: string, messageContext: any): void {
		if (!this.isInitialized || !this.observability.serviceMetrics) {
			return;
		}

		try {
			// Track with service-aware metrics
			const context: ServiceMetricContext = {
				service: 'bunkbot',
				component: 'reply_bot',
				operation: 'bot_trigger',
				metadata: {
					bot_name: botName,
					condition: conditionName,
					channel_id: messageContext.channelId,
					guild_id: messageContext.guildId,
				},
			};

			this.observability.serviceMetrics.trackServiceOperation(context, undefined, true);

			// Also track with enhanced message flow metrics
			const messageFlowMetrics: ServiceMessageFlowMetrics = {
				service: 'bunkbot',
				component: 'reply_bot',
				botName,
				conditionName,
				messageText: messageContext.messageText || '',
				userId: messageContext.userId,
				userName: messageContext.userName,
				channelId: messageContext.channelId,
				channelName: messageContext.channelName,
				guildId: messageContext.guildId,
				triggered: true,
				timestamp: Date.now(),
			};

			this.observability.serviceMetrics.trackServiceMessageFlow(messageFlowMetrics);

		} catch (error) {
			logger.error('Error tracking bot trigger:', error);
		}
	}

	// Example: Track message processing performance
	async processMessage(messageContext: any): Promise<void> {
		const startTime = Date.now();

		try {
			// Simulate message processing
			await this.simulateMessageProcessing();

			// Track successful processing
			const duration = Date.now() - startTime;
			this.trackMessageProcessing(messageContext, duration, true);

		} catch (error) {
			// Track failed processing
			const duration = Date.now() - startTime;
			this.trackMessageProcessing(messageContext, duration, false);
			throw error;
		}
	}

	private trackMessageProcessing(messageContext: any, duration: number, success: boolean): void {
		if (!this.observability.serviceMetrics) return;

		const context: ServiceMetricContext = {
			service: 'bunkbot',
			component: 'message_processor',
			operation: 'process_message',
			metadata: {
				channel_id: messageContext.channelId,
				guild_id: messageContext.guildId,
				message_length: messageContext.messageText?.length || 0,
				error_type: success ? undefined : 'processing_error',
			},
		};

		this.observability.serviceMetrics.trackServiceOperation(context, duration, success);
	}

	// Example: Track webhook delivery
	async deliverWebhook(webhookUrl: string, payload: any): Promise<void> {
		const startTime = Date.now();

		try {
			// Simulate webhook delivery
			await this.simulateWebhookDelivery(webhookUrl, payload);

			// Track successful delivery
			const duration = Date.now() - startTime;
			this.trackWebhookDelivery(webhookUrl, duration, true);

		} catch (error) {
			// Track failed delivery
			const duration = Date.now() - startTime;
			this.trackWebhookDelivery(webhookUrl, duration, false);
			throw error;
		}
	}

	private trackWebhookDelivery(webhookUrl: string, duration: number, success: boolean): void {
		if (!this.observability.serviceMetrics) return;

		const context: ServiceMetricContext = {
			service: 'bunkbot',
			component: 'webhook_delivery',
			operation: 'deliver_webhook',
			metadata: {
				webhook_host: new URL(webhookUrl).hostname,
				payload_size: JSON.stringify({}).length,
				error_type: success ? undefined : 'delivery_error',
			},
		};

		this.observability.serviceMetrics.trackServiceOperation(context, duration, success);
	}

	// Example: Update component health based on operational status
	updateComponentHealth(): void {
		if (!this.observability.serviceMetrics) return;

		try {
			// Example health logic
			const errorRate = this.calculateErrorRate();
			const averageLatency = this.calculateAverageLatency();

			// Update reply_bot health
			let replyBotHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
			if (errorRate > 0.1) {
				replyBotHealth = 'unhealthy';
			} else if (errorRate > 0.05 || averageLatency > 2000) {
				replyBotHealth = 'degraded';
			}

			this.observability.serviceMetrics.updateComponentHealth('reply_bot', replyBotHealth);

			// Update other components similarly
			this.observability.serviceMetrics.updateComponentHealth('message_processor', 'healthy');
			this.observability.serviceMetrics.updateComponentHealth('webhook_delivery', 'healthy');

		} catch (error) {
			logger.error('Error updating component health:', error);
		}
	}

	// Get system information for debugging
	getSystemInfo(): any {
		if (!this.observability.unifiedEndpoint) {
			return { error: 'Unified metrics not initialized' };
		}

		return this.observability.unifiedEndpoint.getSystemInfo();
	}

	async shutdown(): Promise<void> {
		try {
			logger.info('Shutting down BunkBot with unified metrics...');

			if (this.observability.serviceMetrics) {
				await this.observability.serviceMetrics.shutdown();
			}

			if (this.observability.unifiedEndpoint) {
				await this.observability.unifiedEndpoint.shutdown();
			}

			logger.info('BunkBot unified metrics shutdown complete');

		} catch (error) {
			logger.error('Error during shutdown:', error);
		}
	}

	// Simulation methods for example
	private async simulateMessageProcessing(): Promise<void> {
		await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
	}

	private async simulateWebhookDelivery(url: string, payload: any): Promise<void> {
		await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
		// Simulate occasional failures
		if (Math.random() < 0.1) {
			throw new Error('Webhook delivery failed');
		}
	}

	private calculateErrorRate(): number {
		// Simulate error rate calculation
		return Math.random() * 0.15; // 0-15% error rate
	}

	private calculateAverageLatency(): number {
		// Simulate latency calculation
		return Math.random() * 3000; // 0-3000ms latency
	}
}

// Example: DJCova integration with unified metrics
export class DJCovaWithUnifiedMetrics {
	private observability: any;

	async initialize(): Promise<void> {
		this.observability = initializeUnifiedObservability('djcova', {
			enableUnified: true,
		});

		if (this.observability.unifiedEndpoint) {
			await this.observability.unifiedEndpoint.initialize();
		}
	}

	// Example: Track voice connection events
	trackVoiceConnection(guildId: string, state: 'connecting' | 'connected' | 'disconnected'): void {
		if (!this.observability.serviceMetrics) return;

		const context: ServiceMetricContext = {
			service: 'djcova',
			component: 'voice_connection',
			operation: 'connection_state_change',
			metadata: {
				guild_id: guildId,
				connection_state: state,
			},
		};

		this.observability.serviceMetrics.trackServiceOperation(context, undefined, state !== 'disconnected');

		// Update component health based on connection state
		if (state === 'disconnected') {
			this.observability.serviceMetrics.updateComponentHealth('voice_connection', 'degraded');
		} else if (state === 'connected') {
			this.observability.serviceMetrics.updateComponentHealth('voice_connection', 'healthy');
		}
	}

	// Example: Track audio processing performance
	async processAudio(guildId: string, audioSource: string): Promise<void> {
		const startTime = Date.now();

		try {
			await this.simulateAudioProcessing();

			const duration = Date.now() - startTime;
			const context: ServiceMetricContext = {
				service: 'djcova',
				component: 'audio_processing',
				operation: 'process_audio',
				metadata: {
					guild_id: guildId,
					audio_source: audioSource,
				},
			};

			this.observability.serviceMetrics.trackServiceOperation(context, duration, true);

		} catch (error) {
			const duration = Date.now() - startTime;
			const context: ServiceMetricContext = {
				service: 'djcova',
				component: 'audio_processing',
				operation: 'process_audio',
				metadata: {
					guild_id: guildId,
					audio_source: audioSource,
					error_type: 'processing_error',
				},
			};

			this.observability.serviceMetrics.trackServiceOperation(context, duration, false);
			throw error;
		}
	}

	private async simulateAudioProcessing(): Promise<void> {
		await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
	}
}

// Example: Standalone unified metrics system initialization
export async function initializeStandaloneUnifiedMetrics(): Promise<void> {
	try {
		logger.info('Starting standalone unified metrics system...');

		// Option 2: Start the complete unified system directly
		const unifiedEndpoint = await startUnifiedMetricsSystem({
			collectorConfig: {
				host: '192.168.50.3',
				port: 3001,
				enableMetrics: true,
				enableHealth: true,
				enableServiceInfo: true,
				corsEnabled: false,
				timeout: 30000,
			},
			autoDiscoverServices: true,
			enableAutoRegistration: true,
			enableServiceHealthChecks: true,
			healthCheckInterval: 30000,
		});

		logger.info('Standalone unified metrics system started', {
			metricsEndpoint: unifiedEndpoint.getMetricsEndpoint(),
			healthEndpoint: unifiedEndpoint.getHealthEndpoint(),
			registeredServices: unifiedEndpoint.getRegisteredServices(),
		});

		// Set up graceful shutdown
		process.on('SIGINT', async () => {
			logger.info('Shutting down unified metrics system...');
			await unifiedEndpoint.shutdown();
			process.exit(0);
		});

	} catch (error) {
		logger.error('Failed to initialize standalone unified metrics:', error);
		throw error;
	}
}

// Example environment configuration
export function setupEnvironmentForUnifiedMetrics(): void {
	// Set required environment variables for unified metrics
	if (!process.env.UNIFIED_METRICS_HOST) {
		process.env.UNIFIED_METRICS_HOST = '192.168.50.3';
	}

	if (!process.env.UNIFIED_METRICS_PORT) {
		process.env.UNIFIED_METRICS_PORT = '3001';
	}

	if (!process.env.ENABLE_UNIFIED_METRICS) {
		process.env.ENABLE_UNIFIED_METRICS = 'true';
	}

	if (!process.env.ENABLE_UNIFIED_HEALTH) {
		process.env.ENABLE_UNIFIED_HEALTH = 'true';
	}

	if (!process.env.UNIFIED_AUTO_DISCOVERY) {
		process.env.UNIFIED_AUTO_DISCOVERY = 'true';
	}

	if (!process.env.UNIFIED_AUTO_REGISTRATION) {
		process.env.UNIFIED_AUTO_REGISTRATION = 'true';
	}

	if (!process.env.UNIFIED_HEALTH_CHECK_INTERVAL) {
		process.env.UNIFIED_HEALTH_CHECK_INTERVAL = '30000';
	}

	logger.info('Environment configured for unified metrics', {
		host: process.env.UNIFIED_METRICS_HOST,
		port: process.env.UNIFIED_METRICS_PORT,
		endpoint: `http://${process.env.UNIFIED_METRICS_HOST}:${process.env.UNIFIED_METRICS_PORT}/metrics`,
	});
}

// Example usage patterns
export const USAGE_EXAMPLES = {
	// Pattern 1: Full integration in container initialization
	containerInit: `
// In your container's index.ts or main initialization file:
import { initializeUnifiedObservability } from '@starbunk/shared';

async function main() {
  // Initialize with unified metrics
  const observability = initializeUnifiedObservability('bunkbot');

  // The unified endpoint is automatically available at:
  // http://192.168.50.3:3001/metrics
  // http://192.168.50.3:3001/health

  // Use service-aware metrics for operations
  observability.serviceMetrics.trackServiceOperation({
    service: 'bunkbot',
    component: 'reply_bot',
    operation: 'bot_trigger'
  }, 100, true);
}
`,

	// Pattern 2: Standalone metrics server
	standaloneServer: `
// For a dedicated metrics collection container:
import { startUnifiedMetricsSystem } from '@starbunk/shared';

async function startMetricsServer() {
  const endpoint = await startUnifiedMetricsSystem({
    autoDiscoverServices: true,
    enableAutoRegistration: true,
  });

  console.log('Metrics available at:', endpoint.getMetricsEndpoint());
}
`,

	// Pattern 3: Manual service registration
	manualRegistration: `
// For fine-grained control over service registration:
import {
  initializeUnifiedMetricsEndpoint,
  initializeServiceMetrics
} from '@starbunk/shared';

async function setupMetrics() {
  const endpoint = initializeUnifiedMetricsEndpoint();
  await endpoint.initialize();

  // Register specific services
  const bunkbotMetrics = await endpoint.registerService('bunkbot');
  const djcovaMetrics = await endpoint.registerService('djcova');

  // Use metrics for tracking
  bunkbotMetrics.trackServiceOperation({
    service: 'bunkbot',
    component: 'reply_bot',
    operation: 'message_process'
  }, 50, true);
}
`,
};

export default {
	BunkBotWithUnifiedMetrics,
	DJCovaWithUnifiedMetrics,
	initializeStandaloneUnifiedMetrics,
	setupEnvironmentForUnifiedMetrics,
	USAGE_EXAMPLES,
};