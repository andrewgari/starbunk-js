#!/usr/bin/env node

/**
 * Migration script to move personality notes from file-based storage to PostgreSQL database
 * 
 * Usage:
 *   npm run migrate-notes
 *   or
 *   node dist/scripts/migrate-to-database.js
 */

import { PersonalityNotesService } from '../services/personalityNotesService';
import { PersonalityNotesServiceDb } from '../services/personalityNotesServiceDb';
import { logger } from '@starbunk/shared';

async function migrateNotes() {
  logger.info('🔄 Starting personality notes migration from file to database...');
  
  const fileService = PersonalityNotesService.getInstance();
  const dbService = PersonalityNotesServiceDb.getInstance();
  
  try {
    // Initialize services
    logger.info('📂 Loading notes from file storage...');
    await fileService.loadNotes();
    
    logger.info('🗄️ Initializing database connection...');
    await dbService.initialize();
    
    // Get all notes from file storage
    const fileNotes = await fileService.getNotes();
    logger.info(`📋 Found ${fileNotes.length} notes in file storage`);
    
    if (fileNotes.length === 0) {
      logger.info('✅ No notes to migrate');
      return;
    }
    
    // Check if database already has notes
    const dbNotes = await dbService.getNotes();
    if (dbNotes.length > 0) {
      logger.warn(`⚠️ Database already contains ${dbNotes.length} notes`);
      const answer = await promptUser('Do you want to continue? This will add to existing notes (y/N): ');
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        logger.info('❌ Migration cancelled');
        return;
      }
    }
    
    // Migrate each note
    let migrated = 0;
    let skipped = 0;
    
    for (const note of fileNotes) {
      try {
        await dbService.createNote({
          content: note.content,
          category: note.category,
          priority: note.priority
        });
        migrated++;
        logger.debug(`✅ Migrated note: ${note.id} (${note.category})`);
      } catch (error) {
        logger.warn(`⚠️ Failed to migrate note ${note.id}:`, error);
        skipped++;
      }
    }
    
    logger.info(`🎉 Migration completed!`);
    logger.info(`   ✅ Migrated: ${migrated} notes`);
    logger.info(`   ⚠️ Skipped: ${skipped} notes`);
    
    // Verify migration
    const finalDbNotes = await dbService.getNotes();
    logger.info(`🔍 Database now contains ${finalDbNotes.length} total notes`);
    
    // Suggest next steps
    logger.info('');
    logger.info('📝 Next steps:');
    logger.info('   1. Test the web interface with database storage');
    logger.info('   2. Update your startup configuration to use database service');
    logger.info('   3. Consider backing up the original JSON file');
    logger.info('   4. Update environment variables if needed');
    
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Clean up connections
    await dbService.disconnect();
  }
}

function promptUser(question: string): Promise<string> {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateNotes()
    .then(() => {
      logger.info('✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateNotes };
