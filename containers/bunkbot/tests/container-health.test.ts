import { promisify } from 'util';
import { exec } from 'child_process';
import path from 'path';

const execAsync = promisify(exec);

describe('BunkBot Container Health Check', () => {
	const CONTAINER_NAME = 'bunkbot-health-test';
	const CONTAINER_IMAGE = 'bunkbot-health';
	const TEST_TIMEOUT = 90000; // 1.5 minutes

	beforeAll(async () => {
		console.log('🏗️  Building BunkBot container for health check...');
		
		try {
			await execAsync(
				`podman build -f containers/bunkbot/Dockerfile -t ${CONTAINER_IMAGE} .`,
				{ 
					cwd: path.resolve(__dirname, '../../..'),
					timeout: 120000 // 2 minutes for build
				}
			);
			console.log('✅ Container built successfully');
		} catch (error) {
			console.error('❌ Failed to build container:', error);
			throw error;
		}
	}, 150000);

	afterAll(async () => {
		try {
			await execAsync(`podman rm -f ${CONTAINER_NAME} 2>/dev/null || true`);
			await execAsync(`podman rmi -f ${CONTAINER_IMAGE} 2>/dev/null || true`);
		} catch (error) {
			// Ignore cleanup errors
		}
	});

	afterEach(async () => {
		try {
			await execAsync(`podman rm -f ${CONTAINER_NAME} 2>/dev/null || true`);
		} catch (error) {
			// Ignore cleanup errors
		}
	});

	it('should start container and complete initialization successfully', async () => {
		console.log('🚀 Testing container startup and initialization...');

		// Start the container with environment variables
		const rootDir = path.resolve(__dirname, '../../..');
		const envFileExists = require('fs').existsSync(path.join(rootDir, '.env'));
		const envFileArg = envFileExists ? '--env-file .env' : '';

		const { stdout: containerId } = await execAsync(
			`podman run -d --name ${CONTAINER_NAME} ${envFileArg} -e NODE_ENV=test -e DEBUG_MODE=true ${CONTAINER_IMAGE}`,
			{ cwd: rootDir }
		);

		expect(containerId.trim()).toBeTruthy();
		console.log(`📦 Container started: ${containerId.trim().substring(0, 12)}...`);

		// Wait for initialization
		await new Promise(resolve => setTimeout(resolve, 20000));

		// Get container logs
		const { stdout: logs } = await execAsync(`podman logs ${CONTAINER_NAME}`);
		
		console.log('📋 Checking initialization logs...');

		// Critical startup checks
		expect(logs).toContain('🚀 Initializing BunkBot container');
		expect(logs).toContain('Environment validation passed');
		expect(logs).toContain('✅ BunkBot container initialized successfully');
		
		// Service initialization checks
		expect(logs).toContain('✅ Discord identity service initialized');
		expect(logs).toContain('BunkBot services initialized');
		
		// Reply bot system checks
		expect(logs).toContain('🤖 Initializing reply bot system');
		expect(logs).toContain('✅ Reply bot system initialized');
		
		// Discord connection checks
		expect(logs).toContain('🤖 BunkBot is ready and connected to Discord');
		expect(logs).toContain('🎯 BunkBot is now running and listening for Discord events');
		
		// Health check server
		expect(logs).toContain('🏥 Health check server running on port');
		
		// Verify no critical errors
		expect(logs).not.toContain('Failed to initialize BunkBot container');
		expect(logs).not.toContain('Error during startup');
		
		// Check container is still running
		const { stdout: status } = await execAsync(`podman ps --filter name=${CONTAINER_NAME} --format "{{.Status}}"`);
		expect(status).toContain('Up');
		
		console.log('✅ Container startup and initialization validation passed');
	}, TEST_TIMEOUT);

	it('should load reply bots without critical errors', async () => {
		console.log('🤖 Testing reply bot loading...');

		const { stdout: containerId } = await execAsync(
			`podman run -d --name ${CONTAINER_NAME} --env-file .env ${CONTAINER_IMAGE}`,
			{ cwd: path.resolve(__dirname, '../../..') }
		);

		// Wait for bot loading
		await new Promise(resolve => setTimeout(resolve, 15000));

		const { stdout: logs } = await execAsync(`podman logs ${CONTAINER_NAME}`);
		
		// Verify reply bots loaded
		expect(logs).toContain('[BotRegistry] Successfully discovered and loaded');
		expect(logs).toContain('reply bots');
		
		// Verify key bots are present
		expect(logs).toContain('BotBot');
		expect(logs).toContain('TestBot');
		
		// Verify BotBot has correct description (indicating CovaBot filtering is active)
		expect(logs).toContain('BotBot: Responds to other bots with a 5% chance');
		
		// Verify no module loading errors for the new filtering logic
		expect(logs).not.toContain('Cannot find module');
		expect(logs).not.toContain('ReferenceError');
		expect(logs).not.toContain('TypeError');
		
		console.log('✅ Reply bot loading validation passed');
	}, TEST_TIMEOUT);

	it('should handle environment configuration correctly', async () => {
		console.log('🔧 Testing environment configuration...');

		const { stdout: containerId } = await execAsync(
			`podman run -d --name ${CONTAINER_NAME} --env-file .env ${CONTAINER_IMAGE}`,
			{ cwd: path.resolve(__dirname, '../../..') }
		);

		// Wait for environment validation
		await new Promise(resolve => setTimeout(resolve, 10000));

		const { stdout: logs } = await execAsync(`podman logs ${CONTAINER_NAME}`);
		
		// Verify environment validation
		expect(logs).toContain('Environment validation passed');
		expect(logs).toContain('STARBUNK_TOKEN: Set');
		
		// Verify debug mode configuration
		expect(logs).toContain('🔧 Message Filter Configuration');
		expect(logs).toContain('Debug Mode:');
		
		// Verify no critical environment errors
		expect(logs).not.toContain('Environment validation failed');
		expect(logs).not.toContain('Missing required environment variable');
		
		console.log('✅ Environment configuration validation passed');
	}, TEST_TIMEOUT);

	it('should establish Discord connection without authentication errors', async () => {
		console.log('🔗 Testing Discord authentication...');

		const { stdout: containerId } = await execAsync(
			`podman run -d --name ${CONTAINER_NAME} --env-file .env ${CONTAINER_IMAGE}`,
			{ cwd: path.resolve(__dirname, '../../..') }
		);

		// Wait for Discord connection
		await new Promise(resolve => setTimeout(resolve, 25000));

		const { stdout: logs } = await execAsync(`podman logs ${CONTAINER_NAME}`);
		
		// Verify Discord connection success
		expect(logs).toContain('🤖 BunkBot is ready and connected to Discord');
		expect(logs).toContain('✅ Bot is present in guild');
		
		// Verify no authentication errors
		expect(logs).not.toContain('Invalid token');
		expect(logs).not.toContain('Unauthorized');
		expect(logs).not.toContain('Authentication failed');
		expect(logs).not.toContain('Login failed');
		
		// Verify slash commands deployed
		expect(logs).toContain('✅ Successfully deployed');
		expect(logs).toContain('slash commands to Discord');
		
		console.log('✅ Discord authentication validation passed');
	}, TEST_TIMEOUT);

	it('should not crash or exit unexpectedly during startup', async () => {
		console.log('🛡️  Testing container stability...');

		const { stdout: containerId } = await execAsync(
			`podman run -d --name ${CONTAINER_NAME} --env-file .env ${CONTAINER_IMAGE}`,
			{ cwd: path.resolve(__dirname, '../../..') }
		);

		// Wait for full startup
		await new Promise(resolve => setTimeout(resolve, 30000));

		// Check container is still running
		const { stdout: status } = await execAsync(`podman ps --filter name=${CONTAINER_NAME} --format "{{.Status}}"`);
		expect(status).toContain('Up');
		
		// Get exit code (should be empty if still running)
		try {
			const { stdout: exitCode } = await execAsync(`podman ps -a --filter name=${CONTAINER_NAME} --format "{{.Status}}" | grep -o "Exited ([0-9]*)" | grep -o "[0-9]*" || echo ""`);
			expect(exitCode.trim()).toBe(''); // Should be empty (still running)
		} catch (error) {
			// If grep fails, container is likely still running, which is good
		}
		
		// Verify final success message
		const { stdout: logs } = await execAsync(`podman logs ${CONTAINER_NAME}`);
		expect(logs).toContain('🎯 BunkBot is now running and listening for Discord events');
		
		console.log('✅ Container stability validation passed');
	}, TEST_TIMEOUT);
});
