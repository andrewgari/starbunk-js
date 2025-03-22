/**
 * This script validates that the Docker image can successfully boot without module errors.
 * It builds and runs the Docker image, then checks for successful bot initialization.
 */

const { execSync } = require('child_process');
const { randomBytes } = require('crypto');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
	reset: '\x1b[0m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
};

// Log functions
const logInfo = (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`);
const logSuccess = (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`);
const logError = (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`);
const logWarn = (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`);

// Docker image and container names
const TEST_IMAGE_NAME = 'starbunk-js:test-boot';
const TEST_CONTAINER_NAME = 'starbunk-js-test-boot';
const MOCK_DISCORD_TOKEN = 'mock_token_' + randomBytes(16).toString('hex');
const MOCK_CLIENT_ID = 'mock_client_' + randomBytes(16).toString('hex');
const MOCK_GUILD_ID = 'mock_guild_' + randomBytes(16).toString('hex');

// Paths
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(PROJECT_ROOT, '.env');

// Check for .env file
if (!fs.existsSync(ENV_FILE)) {
	logWarn('No .env file found. The Docker container may not function correctly without environment variables.');
	logWarn('Creating temporary .env file with placeholder values for testing...');
	const placeholderEnv =
		`# This is a placeholder .env file for testing Docker boot
STARBUNK_TOKEN=placeholder_token
SNOWBUNK_TOKEN=placeholder_token
CLIENT_ID=placeholder_client_id
GUILD_ID=placeholder_guild_id
`;
	fs.writeFileSync(path.join(PROJECT_ROOT, '.env.docker-test'), placeholderEnv);
}

// Clean up any existing test containers
function cleanupContainer() {
	logInfo('Cleaned up any existing test containers');
	try {
		execSync(`docker rm -f ${TEST_CONTAINER_NAME} 2>/dev/null || true`);
	} catch (error) {
		// Ignore errors from cleanup
	}
}

// Build the Docker image
function buildImage() {
	logInfo('Building Docker image for boot test...');
	try {
		execSync(`docker build -t ${TEST_IMAGE_NAME} .`, { stdio: 'inherit' });
		logSuccess('Docker image built successfully');
	} catch (error) {
		logError('Failed to build Docker image: ' + error.message);
		process.exit(1);
	}
}

// Run the Docker container and check for successful boot
function testBoot() {
	logInfo('Starting Docker container to test boot process...');
	try {
		const output = execSync(
			`docker run --name ${TEST_CONTAINER_NAME} \
			-e DISCORD_TOKEN=${MOCK_DISCORD_TOKEN} \
			-e CLIENT_ID=${MOCK_CLIENT_ID} \
			-e GUILD_ID=${MOCK_GUILD_ID} \
			${TEST_IMAGE_NAME}`,
			{ encoding: 'utf8' }
		);

		// Consider both successful initialization and expected Discord API errors as success
		if (output.includes('Starting Starbunk bot') &&
			(output.includes('initialized successfully') || output.includes('401: Unauthorized'))) {
			logSuccess('Container booted successfully and initialization messages were found');
			return true;
		} else {
			logError('Container boot completed but expected initialization messages were not found');
			return false;
		}
	} catch (error) {
		// Check if the error output contains our success conditions
		if (error.stdout && error.stdout.includes('Starting Starbunk bot') &&
			(error.stdout.includes('initialized successfully') || error.stdout.includes('401: Unauthorized'))) {
			logSuccess('Container booted successfully despite expected Discord API errors');
			return true;
		}
		logError('Container exited with code ' + error.status);
		console.error(error.stdout || error.stderr);
		return false;
	}
}

// Main function
function main() {
	logInfo('🚀 Starting Docker boot test...');
	cleanupContainer();
	buildImage();
	const bootSuccess = testBoot();
	cleanupContainer();

	if (!bootSuccess) {
		logError('❌ Docker boot test failed! The container could not start successfully.');
		process.exit(1);
	}

	logSuccess('✅ Docker boot test passed! The container started successfully.');
	process.exit(0);
}

// Run the main function
main();
