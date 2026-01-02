/**
 * Unit test for HttpEndpointsService port configuration
 */

import { HttpEndpointsService } from '../HttpEndpointsService';

// Define interface for server info to avoid type assertions
interface ServerInfo {
	service: string;
	port: number;
	host: string;
	running: boolean;
	shutting_down: boolean;
	active_requests: number;
	health_checks: number;
	available_endpoints: string[];
	config: {
		port: number;
		host: string;
		basePath: string;
		enableMetrics: boolean;
		enableHealth: boolean;
		enablePprof: boolean;
		enableReady: boolean;
		corsEnabled: boolean;
		authToken?: string;
		timeout: number;
		maxRequestSize: number;
	};
}

describe('HttpEndpointsService Port Configuration', () => {
	let originalMetricsPort: string | undefined;
	let originalHealthPort: string | undefined;

	beforeEach(() => {
		// Save original env vars
		originalMetricsPort = process.env.METRICS_PORT;
		originalHealthPort = process.env.HEALTH_PORT;
	});

	afterEach(() => {
		// Restore original env vars
		if (originalMetricsPort !== undefined) {
			process.env.METRICS_PORT = originalMetricsPort;
		} else {
			delete process.env.METRICS_PORT;
		}
		if (originalHealthPort !== undefined) {
			process.env.HEALTH_PORT = originalHealthPort;
		} else {
			delete process.env.HEALTH_PORT;
		}
	});

	test('should use default port 3000 when no environment variables are set', () => {
		delete process.env.METRICS_PORT;
		delete process.env.HEALTH_PORT;

		const service = new HttpEndpointsService('test-service');
		const serverInfo = service.getServerInfo() as ServerInfo;

		expect(serverInfo.port).toBe(3000);
	});

	test('should use METRICS_PORT environment variable when set', () => {
		process.env.METRICS_PORT = '3001';
		delete process.env.HEALTH_PORT;

		const service = new HttpEndpointsService('test-service');
		const serverInfo = service.getServerInfo() as ServerInfo;

		expect(serverInfo.port).toBe(3001);
	});

	test('should use HEALTH_PORT environment variable when METRICS_PORT is not set', () => {
		delete process.env.METRICS_PORT;
		process.env.HEALTH_PORT = '3002';

		const service = new HttpEndpointsService('test-service');
		const serverInfo = service.getServerInfo() as ServerInfo;

		expect(serverInfo.port).toBe(3002);
	});

	test('should prefer METRICS_PORT over HEALTH_PORT when both are set', () => {
		process.env.METRICS_PORT = '3003';
		process.env.HEALTH_PORT = '3004';

		const service = new HttpEndpointsService('test-service');
		const serverInfo = service.getServerInfo() as ServerInfo;

		expect(serverInfo.port).toBe(3003);
	});

	test('should allow custom port via userConfig', () => {
		process.env.METRICS_PORT = '3005';

		const service = new HttpEndpointsService('test-service', {
			port: 3006,
		});
		const serverInfo = service.getServerInfo() as ServerInfo;

		// userConfig should override env vars
		expect(serverInfo.port).toBe(3006);
	});

	test('should handle invalid port numbers gracefully', () => {
		process.env.METRICS_PORT = 'invalid';

		const service = new HttpEndpointsService('test-service');
		const serverInfo = service.getServerInfo() as ServerInfo;

		// parseInt('invalid') returns NaN, but the service should still be created
		expect(serverInfo.port).toBeNaN();
	});
});
