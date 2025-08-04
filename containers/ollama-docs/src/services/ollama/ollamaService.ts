import axios, { AxiosInstance } from 'axios';
import { logger } from '@starbunk/shared';

export interface OllamaMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface OllamaCompletionRequest {
	model: string;
	messages: OllamaMessage[];
	stream?: boolean;
	temperature?: number;
	max_tokens?: number;
	context?: string;
}

export interface OllamaCompletionResponse {
	message: {
		role: string;
		content: string;
	};
	done: boolean;
	total_duration?: number;
	load_duration?: number;
	prompt_eval_count?: number;
	eval_count?: number;
}

export interface OllamaModel {
	name: string;
	size: number;
	digest: string;
	modified_at: string;
}

export class OllamaService {
	private client: AxiosInstance;
	private baseUrl: string;
	private defaultModel: string;

	constructor(baseUrl: string = 'http://localhost:11434', defaultModel: string = 'llama2') {
		this.baseUrl = baseUrl;
		this.defaultModel = defaultModel;
		this.client = axios.create({
			baseURL: this.baseUrl,
			timeout: 60000, // 60 second timeout for LLM responses
			headers: {
				'Content-Type': 'application/json',
			},
		});

		logger.info(`🦙 OllamaService initialized with base URL: ${this.baseUrl}`);
	}

	/**
	 * Check if Ollama service is available
	 */
	async isAvailable(): Promise<boolean> {
		try {
			const response = await this.client.get('/api/tags');
			return response.status === 200;
		} catch (error) {
			logger.warn(`🦙 Ollama service not available: ${error instanceof Error ? error.message : String(error)}`);
			return false;
		}
	}

	/**
	 * Get list of available models
	 */
	async getModels(): Promise<OllamaModel[]> {
		try {
			const response = await this.client.get('/api/tags');
			return response.data.models || [];
		} catch (error) {
			logger.error(`❌ Failed to get Ollama models: ${error instanceof Error ? error.message : String(error)}`);
			throw new Error('Failed to retrieve available models');
		}
	}

	/**
	 * Generate completion using Ollama
	 */
	async generateCompletion(request: OllamaCompletionRequest): Promise<OllamaCompletionResponse> {
		try {
			const model = request.model || this.defaultModel;
			
			logger.debug(`🦙 Generating completion with model: ${model}`);

			const payload = {
				model,
				messages: request.messages,
				stream: false, // We'll use non-streaming for simplicity
				options: {
					temperature: request.temperature || 0.7,
					num_predict: request.max_tokens || 500,
				},
			};

			const response = await this.client.post('/api/chat', payload);
			
			if (!response.data || !response.data.message) {
				throw new Error('Invalid response format from Ollama');
			}

			logger.debug(`🦙 Completion generated successfully (${response.data.eval_count || 0} tokens)`);
			return response.data;

		} catch (error) {
			logger.error(`❌ Ollama completion failed: ${error instanceof Error ? error.message : String(error)}`);
			throw new Error(`Failed to generate completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Generate embeddings for text (if supported by model)
	 */
	async generateEmbeddings(text: string, model?: string): Promise<number[]> {
		try {
			const embedModel = model || 'nomic-embed-text';
			
			logger.debug(`🦙 Generating embeddings with model: ${embedModel}`);

			const payload = {
				model: embedModel,
				prompt: text,
			};

			const response = await this.client.post('/api/embeddings', payload);
			
			if (!response.data || !response.data.embedding) {
				throw new Error('Invalid embedding response from Ollama');
			}

			logger.debug(`🦙 Embeddings generated successfully (${response.data.embedding.length} dimensions)`);
			return response.data.embedding;

		} catch (error) {
			logger.error(`❌ Ollama embedding failed: ${error instanceof Error ? error.message : String(error)}`);
			throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Pull/download a model
	 */
	async pullModel(modelName: string): Promise<void> {
		try {
			logger.info(`🦙 Pulling model: ${modelName}`);

			const payload = {
				name: modelName,
				stream: false,
			};

			await this.client.post('/api/pull', payload);
			logger.info(`✅ Model ${modelName} pulled successfully`);

		} catch (error) {
			logger.error(`❌ Failed to pull model ${modelName}: ${error instanceof Error ? error.message : String(error)}`);
			throw new Error(`Failed to pull model: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Check if a specific model is available
	 */
	async isModelAvailable(modelName: string): Promise<boolean> {
		try {
			const models = await this.getModels();
			return models.some(model => model.name === modelName || model.name.startsWith(modelName));
		} catch (error) {
			logger.warn(`🦙 Could not check model availability: ${error instanceof Error ? error.message : String(error)}`);
			return false;
		}
	}

	/**
	 * Get service health information
	 */
	async getHealthInfo(): Promise<{
		available: boolean;
		models: number;
		defaultModel: string;
		baseUrl: string;
	}> {
		const available = await this.isAvailable();
		let modelCount = 0;

		if (available) {
			try {
				const models = await this.getModels();
				modelCount = models.length;
			} catch (error) {
				// Ignore error, just report 0 models
			}
		}

		return {
			available,
			models: modelCount,
			defaultModel: this.defaultModel,
			baseUrl: this.baseUrl,
		};
	}
}
