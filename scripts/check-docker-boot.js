/**
 * This script validates that the Docker image can successfully boot without module errors.
 * It builds and runs the Docker image, then checks for successful bot initialization.
 */

const { spawn, execSync } = require('child_process');
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
const log = (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`);
const success = (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`);
const error = (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`);
const warn = (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`);

// Docker image and container names
const IMAGE_TAG = 'starbunk-js:test-boot';
const CONTAINER_NAME = 'starbunk-boot-test';

// Paths
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(PROJECT_ROOT, '.env');

// Check for .env file
if (!fs.existsSync(ENV_FILE)) {
  warn('No .env file found. The Docker container may not function correctly without environment variables.');
  warn('Creating temporary .env file with placeholder values for testing...');
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
  try {
    execSync(`docker rm -f ${CONTAINER_NAME} 2>/dev/null || true`);
    log('Cleaned up any existing test containers');
  } catch (err) {
    // Ignore errors if container doesn't exist
  }
}

// Build the Docker image
function buildImage() {
  log('Building Docker image for boot test...');
  try {
    execSync(`docker build -t ${IMAGE_TAG} ${PROJECT_ROOT}`, { stdio: 'inherit' });
    success('Docker image built successfully');
    return true;
  } catch (err) {
    error(`Failed to build Docker image: ${err.message}`);
    return false;
  }
}

// Run the Docker container and check for successful boot
function testContainerBoot() {
  log('Starting Docker container to test boot process...');
  return new Promise((resolve) => {
    const envFile = fs.existsSync(ENV_FILE) ? ENV_FILE : path.join(PROJECT_ROOT, '.env.docker-test');
    
    // Run the container with a timeout to prevent hanging
    const dockerRun = spawn('docker', [
      'run',
      '--name', CONTAINER_NAME,
      '--rm',
      `--env-file=${envFile}`,
      IMAGE_TAG
    ]);

    let output = '';
    let errorOutput = '';
    
    // Set a 15-second timeout for the boot test
    const timeout = setTimeout(() => {
      dockerRun.kill();
      error('Boot test timed out after 15 seconds');
      resolve(false);
    }, 15000);

    dockerRun.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
      
      // Check for successful init messages
      if (output.includes('Registered Bot:') && 
          output.includes('Registered Command:')) {
        clearTimeout(timeout);
        dockerRun.kill();
        success('Container booted successfully! Bots and commands were registered.');
        resolve(true);
      }
    });

    dockerRun.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
      
      // Check for common module errors
      if (text.includes('Cannot find module') || 
          text.includes('Error: Module not found')) {
        clearTimeout(timeout);
        dockerRun.kill();
        error('Module not found error detected during boot!');
        resolve(false);
      }
    });

    dockerRun.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code !== null && code !== 0) {
        error(`Container exited with code ${code}`);
        resolve(false);
      }
      
      // If we couldn't detect success or failure through output, check the output for signs
      if (output.includes('Registered Bot:') && output.includes('Registered Command:')) {
        success('Container boot completed with expected initialization messages');
        resolve(true);
      } else {
        error('Container boot completed but expected initialization messages were not found');
        resolve(false);
      }
    });
  });
}

// Main function
async function main() {
  try {
    log('🚀 Starting Docker boot test...');
    
    // Clean up any existing test containers
    cleanupContainer();
    
    // Build the Docker image
    const buildSuccess = buildImage();
    if (!buildSuccess) {
      process.exit(1);
    }
    
    // Test the container boot
    const bootSuccess = await testContainerBoot();
    
    // Final cleanup
    cleanupContainer();
    
    // Remove test env file if we created one
    if (fs.existsSync(path.join(PROJECT_ROOT, '.env.docker-test'))) {
      fs.unlinkSync(path.join(PROJECT_ROOT, '.env.docker-test'));
    }
    
    if (bootSuccess) {
      success('✅ Docker boot test passed! The container starts successfully without module errors.');
      process.exit(0);
    } else {
      error('❌ Docker boot test failed! The container could not start successfully.');
      process.exit(1);
    }
  } catch (err) {
    error(`Unexpected error: ${err.message}`);
    process.exit(1);
  }
}

// Run the main function
main();