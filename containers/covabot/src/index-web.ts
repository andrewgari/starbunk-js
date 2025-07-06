import '../../shared/src/environment';
import { logger } from '@starbunk/shared';
import { WebServer } from './web/server';
import { PersonalityNotesService } from './services/personalityNotesService';
import { PersonalityNotesServiceDb } from './services/personalityNotesServiceDb';

async function startCovaBot() {
  try {
    const useDatabase = process.env.USE_DATABASE === 'true';
    const storageType = useDatabase ? 'Database' : 'File';

    logger.info(`🤖 Starting CovaBot with Web Interface (${storageType} storage)...`);

    // Initialize personality notes service
    if (useDatabase) {
      const dbService = PersonalityNotesServiceDb.getInstance();
      await dbService.initialize();
      logger.info('✅ Database personality notes service initialized');
    } else {
      const fileService = PersonalityNotesService.getInstance();
      await fileService.loadNotes();
      logger.info('✅ File-based personality notes service initialized');
    }

    // Start web server
    const port = parseInt(process.env.COVABOT_WEB_PORT || '7080', 10);
    const webServer = new WebServer(port, useDatabase);
    await webServer.start();
    logger.info(`✅ Web interface started on http://localhost:${port}`);

    // Import and start the main CovaBot after web server is ready
    const { default: main } = await import('./index-minimal');

    logger.info('🚀 CovaBot with Web Interface started successfully!');
    logger.info(`📝 Manage personality at: http://localhost:${port}`);
  } catch (error) {
    logger.error('❌ Failed to start CovaBot with Web Interface:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('🛑 Shutting down CovaBot...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('🛑 Shutting down CovaBot...');
  process.exit(0);
});

// Start the application
startCovaBot();