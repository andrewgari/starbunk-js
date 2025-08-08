import { HealthServer } from '../HealthServer';
import { logger } from '@starbunk/shared';
import * as http from 'http';

// Mock external dependencies
jest.mock('@starbunk/shared', () => ({
	logger: {
		info: jest.fn(),
		debug: jest.fn(),
		error: jest.fn(),
	},
}));

jest.mock('http', () => ({
	createServer: jest.fn(),
}));

jest.mock('../../core/BotProcessor', () => ({
	getBotStorageStats: jest.fn(() => ({
		size: 0,
		oldestItem: 0,
		newestItem: 0
	}))
}));

describe('HealthServer', () => {
	let healthServer: HealthServer;
	let mockServer: any;
	let mockReq: any;
	let mockRes: any;

	beforeEach(() => {
		mockServer = {
			listen: jest.fn((port, callback) => callback && callback()),
			close: jest.fn(callback => callback && callback()),
		};

		mockReq = {
			url: '/health',
		};

		mockRes = {
			writeHead: jest.fn(),
			end: jest.fn(),
		};

		(http.createServer as jest.Mock).mockImplementation(handler => {
			mockServer.handler = handler;
			return mockServer;
		});

		healthServer = new HealthServer(3001);
		jest.clearAllMocks();
	});

	describe('start', () => {
		it('should start the server and listen on specified port', () => {
			const getHealthStatus = jest.fn(() => ({
				status: 'healthy' as const,
				timestamp: '2023-01-01T00:00:00.000Z',
				discord: { connected: true, initialized: true },
				uptime: 100,
			}));

			healthServer.start(getHealthStatus);

			expect(http.createServer).toHaveBeenCalled();
			expect(mockServer.listen).toHaveBeenCalledWith(3001, expect.any(Function));
			expect(logger.info).toHaveBeenCalledWith('Health server running on port 3001');
		});
	});

	describe('URL parsing', () => {
		it('should handle URLs with query parameters', () => {
			const getHealthStatus = jest.fn(() => ({
				status: 'healthy' as const,
				timestamp: '2023-01-01T00:00:00.000Z',
				discord: { connected: true, initialized: true },
				uptime: 100,
			}));

			healthServer.start(getHealthStatus);
			
			// Simulate request with query parameters
			mockReq.url = '/health?version=1&timestamp=123';
			mockServer.handler(mockReq, mockRes);

			expect(mockRes.writeHead).toHaveBeenCalledWith(200, { 
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'X-Health-Check-Version': '2.0'
			});
			expect(mockRes.end).toHaveBeenCalled();
			expect(getHealthStatus).toHaveBeenCalled();
		});

		it('should handle malformed URLs gracefully', () => {
			const getHealthStatus = jest.fn(() => ({
				status: 'healthy' as const,
				timestamp: '2023-01-01T00:00:00.000Z',
				discord: { connected: true, initialized: true },
				uptime: 100,
			}));

			healthServer.start(getHealthStatus);
			
			// Simulate malformed URL that should still resolve to /health
			mockReq.url = '/health?malformed%url';
			mockServer.handler(mockReq, mockRes);

			expect(mockRes.writeHead).toHaveBeenCalledWith(200, { 
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'X-Health-Check-Version': '2.0'
			});
		});
	});

	describe('health endpoints', () => {
		let getHealthStatus: jest.Mock;

		beforeEach(() => {
			getHealthStatus = jest.fn(() => ({
				status: 'healthy' as const,
				timestamp: '2023-01-01T00:00:00.000Z',
				discord: { connected: true, initialized: true },
				uptime: 100,
				bots: { loaded: 5, active: 4 },
			}));
			healthServer.start(getHealthStatus);
		});

		it('should handle /health endpoint', () => {
			mockReq.url = '/health';
			mockServer.handler(mockReq, mockRes);

			expect(mockRes.writeHead).toHaveBeenCalledWith(200, { 
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'X-Health-Check-Version': '2.0'
			});
			expect(mockRes.end).toHaveBeenCalled();
		});

		it('should handle /ready endpoint', () => {
			mockReq.url = '/ready';
			mockServer.handler(mockReq, mockRes);

			expect(mockRes.writeHead).toHaveBeenCalledWith(200, { 
				'Content-Type': 'application/json'
			});
			expect(mockRes.end).toHaveBeenCalled();
		});

		it('should handle /live endpoint', () => {
			mockReq.url = '/live';
			mockServer.handler(mockReq, mockRes);

			expect(mockRes.writeHead).toHaveBeenCalledWith(200, { 
				'Content-Type': 'application/json'
			});
			expect(mockRes.end).toHaveBeenCalled();
		});

		it('should return 404 for unknown endpoints', () => {
			mockReq.url = '/unknown';
			mockServer.handler(mockReq, mockRes);

			expect(mockRes.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'application/json' });
			expect(mockRes.end).toHaveBeenCalled();
			const responseBody = JSON.parse((mockRes.end as jest.Mock).mock.calls[0][0]);
			expect(responseBody).toHaveProperty('error', 'Not Found');
			expect(responseBody).toHaveProperty('message');
			expect(responseBody).toHaveProperty('timestamp');
		});
	});

	describe('stop', () => {
		it('should stop the server gracefully', async () => {
			const getHealthStatus = jest.fn(() => ({
				status: 'healthy' as const,
				timestamp: '2023-01-01T00:00:00.000Z',
				discord: { connected: true, initialized: true },
				uptime: 100,
			}));

			healthServer.start(getHealthStatus);
			await healthServer.stop();

			expect(mockServer.close).toHaveBeenCalled();
			expect(logger.info).toHaveBeenCalledWith('Health server stopped');
		});

		it('should resolve immediately if no server is running', async () => {
			await expect(healthServer.stop()).resolves.toBeUndefined();
		});
	});
});