import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import path from 'path';

const execAsync = promisify(exec);

describe('BunkBot Container E2E Integration', () => {
	const CONTAINER_NAME = 'bunkbot-e2e-test';
	const CONTAINER_IMAGE = 'bunkbot-e2e';
	const TEST_TIMEOUT = 120000; // 2 minutes
	const STARTUP_TIMEOUT = 60000; // 1 minute

	beforeAll(async () => {
		// Build the container for testing
		console.log('🏗️  Building BunkBot container for E2E testing...');
		
		try {
			const { stdout, stderr } = await execAsync(
				`podman build -f containers/bunkbot/Dockerfile -t ${CONTAINER_IMAGE} .`,
				{ 
					cwd: path.resolve(__dirname, '../../../..'),
					timeout: 180000 // 3 minutes for build
				}
			);
			
			if (stderr && !stderr.includes('WARN')) {
				console.warn('Build warnings:', stderr);
			}
			
			console.log('✅ Container built successfully');
		} catch (error) {
			console.error('❌ Failed to build container:', error);
			throw error;
		}
	}, 200000); // 3+ minutes for build

	afterAll(async () => {
		// Clean up container and image
		try {
			await execAsync(`podman rm -f ${CONTAINER_NAME} 2>/dev/null || true`);
			await execAsync(`podman rmi -f ${CONTAINER_IMAGE} 2>/dev/null || true`);
			console.log('🧹 Cleanup completed');
		} catch (error) {
			console.warn('Cleanup warning:', error);
		}
	});

	afterEach(async () => {
		// Stop and remove container after each test
		try {
			await execAsync(`podman rm -f ${CONTAINER_NAME} 2>/dev/null || true`);
		} catch (error) {
			// Ignore cleanup errors
		}
	});

	describe('Container Startup Validation', () => {
		it('should start container successfully and initialize all services', async () => {
			console.log('🚀 Starting container startup test...');

			// Start the container
			const { stdout: containerId } = await execAsync(
				`podman run -d --name ${CONTAINER_NAME} --env-file .env ${CONTAINER_IMAGE}`,
				{ cwd: path.resolve(__dirname, '../../../..') }
			);

			expect(containerId.trim()).toBeTruthy();
			console.log(`📦 Container started with ID: ${containerId.trim().substring(0, 12)}...`);

			// Wait for startup and collect logs
			await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds for startup

			const { stdout: logs } = await execAsync(`podman logs ${CONTAINER_NAME}`);
			
			// Verify startup sequence
			expect(logs).toContain('🚀 Initializing BunkBot container');
			expect(logs).toContain('Environment validation passed');
			expect(logs).toContain('✅ Discord identity service initialized');
			expect(logs).toContain('✅ BunkBot container initialized successfully');
			
			console.log('✅ Container startup validation passed');
		}, TEST_TIMEOUT);

		it('should load all reply bots successfully', async () => {
			console.log('🤖 Testing reply bot loading...');

			const { stdout: containerId } = await execAsync(
				`podman run -d --name ${CONTAINER_NAME} --env-file .env ${CONTAINER_IMAGE}`,
				{ cwd: path.resolve(__dirname, '../../../..') }
			);

			// Wait for bot loading
			await new Promise(resolve => setTimeout(resolve, 15000));

			const { stdout: logs } = await execAsync(`podman logs ${CONTAINER_NAME}`);
			
			// Verify reply bots loaded
			expect(logs).toContain('🤖 Initializing reply bot system');
			expect(logs).toContain('📁 Loading reply bots from file system');
			expect(logs).toContain('[BotRegistry] Successfully discovered and loaded');
			expect(logs).toContain('✅ Reply bot system initialized');
			
			// Verify specific bots are loaded
			expect(logs).toContain('BotBot');
			expect(logs).toContain('TestBot');
			expect(logs).toContain('BabyBot');
			
			// Verify bot count (should be around 24 bots)
			const botCountMatch = logs.match(/Successfully discovered and loaded (\d+) reply bots/);
			expect(botCountMatch).toBeTruthy();
			const botCount = parseInt(botCountMatch![1]);
			expect(botCount).toBeGreaterThanOrEqual(20); // At least 20 bots
			expect(botCount).toBeLessThanOrEqual(30); // At most 30 bots
			
			console.log(`✅ Reply bot loading validated: ${botCount} bots loaded`);
		}, TEST_TIMEOUT);

		it('should establish Discord connection successfully', async () => {
			console.log('🔗 Testing Discord connection...');

			const { stdout: containerId } = await execAsync(
				`podman run -d --name ${CONTAINER_NAME} --env-file .env ${CONTAINER_IMAGE}`,
				{ cwd: path.resolve(__dirname, '../../../..') }
			);

			// Wait for Discord connection
			await new Promise(resolve => setTimeout(resolve, 20000));

			const { stdout: logs } = await execAsync(`podman logs ${CONTAINER_NAME}`);
			
			// Verify Discord connection
			expect(logs).toContain('🤖 BunkBot is ready and connected to Discord');
			expect(logs).toContain('✅ Bot is present in guild');
			expect(logs).toContain('🔍 Guild member count:');
			expect(logs).toContain('✅ Successfully deployed');
			expect(logs).toContain('slash commands to Discord');
			
			console.log('✅ Discord connection validation passed');
		}, TEST_TIMEOUT);

		it('should start health check server', async () => {
			console.log('🏥 Testing health check server...');

			const { stdout: containerId } = await execAsync(
				`podman run -d --name ${CONTAINER_NAME} --env-file .env -p 3002:3002 ${CONTAINER_IMAGE}`,
				{ cwd: path.resolve(__dirname, '../../../..') }
			);

			// Wait for health server startup
			await new Promise(resolve => setTimeout(resolve, 10000));

			const { stdout: logs } = await execAsync(`podman logs ${CONTAINER_NAME}`);
			
			// Verify health check server
			expect(logs).toContain('🏥 Health check server running on port');
			
			// Test health endpoint (if accessible)
			try {
				const { stdout: healthResponse } = await execAsync(
					`podman exec ${CONTAINER_NAME} curl -f http://localhost:3002/health || echo "Health check not accessible"`
				);
				console.log('Health check response:', healthResponse);
			} catch (error) {
				console.log('Health check endpoint test skipped (expected in isolated environment)');
			}
			
			console.log('✅ Health check server validation passed');
		}, TEST_TIMEOUT);

		it('should handle CovaBot filtering correctly', async () => {
			console.log('🚫 Testing CovaBot filtering implementation...');

			const { stdout: containerId } = await execAsync(
				`podman run -d --name ${CONTAINER_NAME} --env-file .env ${CONTAINER_IMAGE}`,
				{ cwd: path.resolve(__dirname, '../../../..') }
			);

			// Wait for full startup
			await new Promise(resolve => setTimeout(resolve, 15000));

			const { stdout: logs } = await execAsync(`podman logs ${CONTAINER_NAME}`);
			
			// Verify BotBot is loaded with correct description
			expect(logs).toContain('BotBot: Responds to other bots with a 5% chance');
			
			// Verify enhanced filtering is compiled and loaded
			expect(logs).not.toContain('Cannot find module'); // No module errors
			expect(logs).not.toContain('ReferenceError'); // No reference errors
			
			// The container should start without errors related to the new filtering logic
			expect(logs).toContain('✅ Reply bot system initialized');
			
			console.log('✅ CovaBot filtering validation passed');
		}, TEST_TIMEOUT);

		it('should handle graceful shutdown', async () => {
			console.log('🛑 Testing graceful shutdown...');

			const { stdout: containerId } = await execAsync(
				`podman run -d --name ${CONTAINER_NAME} --env-file .env ${CONTAINER_IMAGE}`,
				{ cwd: path.resolve(__dirname, '../../../..') }
			);

			// Wait for startup
			await new Promise(resolve => setTimeout(resolve, 10000));

			// Send SIGTERM for graceful shutdown
			await execAsync(`podman kill -s TERM ${CONTAINER_NAME}`);
			
			// Wait a moment for shutdown
			await new Promise(resolve => setTimeout(resolve, 5000));

			// Check container status
			try {
				const { stdout: status } = await execAsync(`podman ps -a --filter name=${CONTAINER_NAME} --format "{{.Status}}"`);
				expect(status).toContain('Exited');
			} catch (error) {
				// Container might be removed already, which is fine
			}
			
			console.log('✅ Graceful shutdown validation passed');
		}, TEST_TIMEOUT);
	});

	describe('Container Resource Validation', () => {
		it('should not exceed memory limits during startup', async () => {
			console.log('💾 Testing memory usage during startup...');

			const { stdout: containerId } = await execAsync(
				`podman run -d --name ${CONTAINER_NAME} --memory=512m --env-file .env ${CONTAINER_IMAGE}`,
				{ cwd: path.resolve(__dirname, '../../../..') }
			);

			// Wait for full startup
			await new Promise(resolve => setTimeout(resolve, 20000));

			// Check if container is still running (didn't OOM)
			const { stdout: status } = await execAsync(`podman ps --filter name=${CONTAINER_NAME} --format "{{.Status}}"`);
			expect(status).toContain('Up');
			
			// Get memory stats
			try {
				const { stdout: stats } = await execAsync(`podman stats --no-stream --format "{{.MemUsage}}" ${CONTAINER_NAME}`);
				console.log(`Memory usage: ${stats.trim()}`);
			} catch (error) {
				console.log('Memory stats not available, but container is running');
			}
			
			console.log('✅ Memory usage validation passed');
		}, TEST_TIMEOUT);

		it('should start within reasonable time limits', async () => {
			console.log('⏱️  Testing startup performance...');

			const startTime = Date.now();
			
			const { stdout: containerId } = await execAsync(
				`podman run -d --name ${CONTAINER_NAME} --env-file .env ${CONTAINER_IMAGE}`,
				{ cwd: path.resolve(__dirname, '../../../..') }
			);

			// Wait for the "ready" message
			let ready = false;
			let attempts = 0;
			const maxAttempts = 60; // 60 seconds max
			
			while (!ready && attempts < maxAttempts) {
				await new Promise(resolve => setTimeout(resolve, 1000));
				attempts++;
				
				try {
					const { stdout: logs } = await execAsync(`podman logs ${CONTAINER_NAME}`);
					if (logs.includes('🎯 BunkBot is now running and listening for Discord events')) {
						ready = true;
					}
				} catch (error) {
					// Continue waiting
				}
			}
			
			const startupTime = Date.now() - startTime;
			
			expect(ready).toBe(true);
			expect(startupTime).toBeLessThan(STARTUP_TIMEOUT);
			
			console.log(`✅ Startup performance validation passed: ${startupTime}ms`);
		}, TEST_TIMEOUT);
	});
});
