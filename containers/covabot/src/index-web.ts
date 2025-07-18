import '../../shared/src/environment';
import { logger } from '@starbunk/shared';
import { WebServer } from './web/server';
import { QdrantMemoryService } from './services/qdrantMemoryService';

async function startCovaBot() {
  try {
    const useQdrant = process.env.USE_QDRANT !== 'false'; // Default to true
    const storageType = useQdrant ? 'Qdrant Vector Database' : 'Legacy';

    logger.info(`🤖 Starting CovaBot with Web Interface (${storageType} storage)...`);

    // Initialize Qdrant memory service
    if (useQdrant) {
      const memoryService = QdrantMemoryService.getInstance();
      await memoryService.initialize();
      logger.info('✅ Qdrant memory service initialized');
    }

    // Start web server
    const port = parseInt(process.env.COVABOT_WEB_PORT || '7080', 10);
    const webServer = new WebServer(port, useQdrant);
    await webServer.start();
    logger.info(`✅ Web interface started on http://localhost:${port}`);

    // Import and start the main CovaBot after web server is ready
    const { default: main } = await import('./index-minimal');

    logger.info('🚀 CovaBot with Web Interface started successfully!');
    logger.info(`📝 Manage personality at: http://localhost:${port}`);
    logger.info(`🧠 Memory system: ${storageType}`);
  } catch (error) {
    logger.error('❌ Failed to start CovaBot with Web Interface:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
const shutdown = async () => {
  logger.info('🛑 Shutting down CovaBot...');

  try {
    const useQdrant = process.env.USE_QDRANT !== 'false';
    if (useQdrant) {
      const memoryService = QdrantMemoryService.getInstance();
      await memoryService.cleanup();
      logger.info('✅ Memory service cleanup completed');
    }
  } catch (error) {
    logger.error('❌ Error during cleanup:', error);
  }

  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the application
startCovaBot();