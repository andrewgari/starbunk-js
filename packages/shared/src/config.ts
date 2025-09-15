import environment, { isDebugMode } from './environment';
import { logger } from './services/logger';

// The environment variables are already loaded by the environment module
logger.info('🔍 Environment loaded and validated');

// Log debug mode status
if (isDebugMode()) {
	logger.info('🐛 Debug mode enabled');
}

// Export the environment for use in other modules
export { environment };

// Export helper functions for easy access
export { isDebugMode, setDebugMode } from './environment';
