import { logger } from '../services/logger';
import { DebugUtils } from './debug';

/**
 * Utilities for debugging API calls
 */
export class ApiDebug {
	private static requestCounter = 0;
	private static activeRequests = new Map<number, { url: string; startTime: number; method: string }>();

	/**
   * Log an API request
   */
	static logRequest(url: string, method: string, body?: unknown): number {
		if (!DebugUtils.isDebugMode()) return -1;

		const requestId = ++this.requestCounter;
		const startTime = performance.now();

		this.activeRequests.set(requestId, { url, startTime, method });

		logger.debug(`🌐 API Request #${requestId} [${method}] ${url}`);
		if (body) {
			DebugUtils.logObject(`Request #${requestId} Body`, body);
		}

		return requestId;
	}

	/**
   * Log an API response
   */
	static logResponse(requestId: number, status: number, data?: unknown): void {
		if (!DebugUtils.isDebugMode() || requestId === -1) return;

		const requestInfo = this.activeRequests.get(requestId);
		if (!requestInfo) {
			logger.warn(`Cannot find request info for response #${requestId}`);
			return;
		}

		const endTime = performance.now();
		const duration = endTime - requestInfo.startTime;

		// Use different emoji based on status code
		let statusEmoji = '✅';
		if (status >= 400) statusEmoji = '❌';
		else if (status >= 300) statusEmoji = '➡️';

		logger.debug(
			`${statusEmoji} API Response #${requestId} [${requestInfo.method}] ${requestInfo.url} - ${status} (${duration.toFixed(2)}ms)`
		);

		if (data) {
			DebugUtils.logObject(`Response #${requestId} Data`, data);
		}

		this.activeRequests.delete(requestId);
	}

	/**
   * Log an API error
   */
	static logError(requestId: number, error: Error): void {
		if (!DebugUtils.isDebugMode() || requestId === -1) return;

		const requestInfo = this.activeRequests.get(requestId);
		if (!requestInfo) {
			logger.warn(`Cannot find request info for error #${requestId}`);
			return;
		}

		const endTime = performance.now();
		const duration = endTime - requestInfo.startTime;

		logger.error(
			`❌ API Error #${requestId} [${requestInfo.method}] ${requestInfo.url} (${duration.toFixed(2)}ms)`,
			error
		);

		this.activeRequests.delete(requestId);
	}

	/**
   * Create a wrapper for fetch that logs requests and responses
   */
	static createDebugFetch(): typeof fetch {
		const originalFetch = global.fetch;

		return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
			if (!DebugUtils.isDebugMode()) {
				return originalFetch(input, init);
			}

			// Extract URL from input
			let url: string;
			if (typeof input === 'string') {
				url = input;
			} else if (input instanceof URL) {
				url = input.toString();
			} else {
				// input is a Request object
				url = input.url;
			}

			const method = init?.method || 'GET';

			const requestId = this.logRequest(url, method, init?.body);

			try {
				const response = await originalFetch(input, init);

				// Clone the response to read its body without consuming it
				const clonedResponse = response.clone();
				let responseData: unknown;

				try {
					// Try to parse as JSON, but don't fail if it's not
					const contentType = response.headers.get('content-type');
					if (contentType && contentType.includes('application/json')) {
						responseData = await clonedResponse.json();
					} else {
						responseData = await clonedResponse.text();
					}
				} catch (e) {
					responseData = 'Could not parse response body';
				}

				this.logResponse(requestId, response.status, responseData);
				return response;
			} catch (error) {
				this.logError(requestId, error as Error);
				throw error;
			}
		};
	}

	/**
   * Track rate limiting information
   */
	static trackRateLimits(headers: Headers): void {
		if (!DebugUtils.isDebugMode()) return;

		const rateLimitInfo: Record<string, string> = {};

		// Extract rate limit headers
		const rateLimitHeaders = [
			'X-RateLimit-Limit',
			'X-RateLimit-Remaining',
			'X-RateLimit-Reset',
			'Retry-After',
			'X-RateLimit-Bucket',
			'X-RateLimit-Global'
		];

		rateLimitHeaders.forEach(header => {
			const value = headers.get(header);
			if (value) {
				rateLimitInfo[header] = value;
			}
		});

		if (Object.keys(rateLimitInfo).length > 0) {
			logger.debug('📊 Rate limit information:');
			// eslint-disable-next-line no-console
			console.table(rateLimitInfo);
		}
	}
}
