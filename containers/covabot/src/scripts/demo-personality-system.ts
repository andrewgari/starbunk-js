#!/usr/bin/env node

/**
 * Demo script to showcase the CovaBot personality management system
 * 
 * Usage:
 *   npm run demo
 *   or
 *   npx ts-node src/scripts/demo-personality-system.ts
 */

import { PersonalityNotesService } from '../services/personalityNotesService';
import { PersonalityNotesServiceDb } from '../services/personalityNotesServiceDb';
import { logger } from '@starbunk/shared';

async function runDemo() {
  logger.info('🎭 CovaBot Personality Management System Demo');
  logger.info('='.repeat(50));
  
  const useDatabase = process.env.USE_DATABASE === 'true';
  const service = useDatabase 
    ? PersonalityNotesServiceDb.getInstance()
    : PersonalityNotesService.getInstance();
  
  try {
    // Initialize service
    logger.info(`📚 Initializing ${useDatabase ? 'database' : 'file'} service...`);
    if (useDatabase && 'initialize' in service) {
      await (service as PersonalityNotesServiceDb).initialize();
    } else {
      await (service as PersonalityNotesService).loadNotes();
    }
    
    // Create sample personality notes
    logger.info('✨ Creating sample personality notes...');
    
    const sampleNotes = [
      {
        content: 'Always be helpful, friendly, and encouraging in your responses',
        category: 'personality' as const,
        priority: 'high' as const
      },
      {
        content: 'Use emojis occasionally to add warmth to conversations',
        category: 'behavior' as const,
        priority: 'medium' as const
      },
      {
        content: 'You are an AI assistant specialized in software development and Discord bot management',
        category: 'context' as const,
        priority: 'high' as const
      },
      {
        content: 'When users ask about code, provide clear examples and explanations',
        category: 'instruction' as const,
        priority: 'high' as const
      },
      {
        content: 'You have knowledge about TypeScript, Node.js, Discord.js, and modern web development',
        category: 'knowledge' as const,
        priority: 'medium' as const
      }
    ];
    
    const createdNotes = [];
    for (const noteData of sampleNotes) {
      const note = await service.createNote(noteData);
      createdNotes.push(note);
      logger.info(`  ✅ Created ${noteData.category} note: "${noteData.content.substring(0, 50)}..."`);
    }
    
    // Demonstrate filtering
    logger.info('\n🔍 Demonstrating filtering capabilities...');
    
    const highPriorityNotes = await service.getNotes({ priority: 'high' });
    logger.info(`  📌 High priority notes: ${highPriorityNotes.length}`);
    
    const personalityNotes = await service.getNotes({ category: 'personality' });
    logger.info(`  🎭 Personality notes: ${personalityNotes.length}`);
    
    const searchResults = await service.getNotes({ search: 'helpful' });
    logger.info(`  🔎 Notes containing 'helpful': ${searchResults.length}`);
    
    // Show LLM context generation
    logger.info('\n🧠 Generating LLM context...');
    const llmContext = await service.getActiveNotesForLLM();
    logger.info('📝 Generated context for LLM:');
    logger.info('-'.repeat(40));
    logger.info(llmContext);
    logger.info('-'.repeat(40));
    
    // Display statistics
    logger.info('\n📊 System statistics...');
    const stats = await service.getStats();
    logger.info(`  📋 Total notes: ${stats.total}`);
    logger.info(`  ✅ Active notes: ${stats.active}`);
    logger.info('  📂 By category:');
    Object.entries(stats.byCategory).forEach(([category, count]) => {
      logger.info(`    ${category}: ${count}`);
    });
    logger.info('  🎯 By priority:');
    Object.entries(stats.byPriority).forEach(([priority, count]) => {
      logger.info(`    ${priority}: ${count}`);
    });
    
    // Demonstrate update functionality
    logger.info('\n✏️ Demonstrating update functionality...');
    const firstNote = createdNotes[0];
    const updatedNote = await service.updateNote(firstNote.id, {
      content: firstNote.content + ' Remember to be patient with beginners.',
      priority: 'high'
    });
    
    if (updatedNote) {
      logger.info(`  ✅ Updated note: "${updatedNote.content.substring(0, 60)}..."`);
    }
    
    // Show final state
    logger.info('\n🎯 Final system state...');
    const allNotes = await service.getNotes();
    logger.info(`  📚 Total notes in system: ${allNotes.length}`);
    
    allNotes.forEach((note, index) => {
      const priority = note.priority === 'high' ? '🔴' : note.priority === 'medium' ? '🟡' : '🟢';
      const category = {
        instruction: '📋',
        personality: '🎭',
        behavior: '🎯',
        knowledge: '🧠',
        context: '🌍'
      }[note.category] || '📝';
      
      logger.info(`  ${index + 1}. ${priority} ${category} [${note.category}] ${note.content.substring(0, 50)}...`);
    });
    
    // Web interface information
    logger.info('\n🌐 Web Interface Access...');
    logger.info('  🚀 Start the web server:');
    logger.info(`     npm run ${useDatabase ? 'dev:db' : 'dev:web'}`);
    logger.info('  🔗 Access the interface:');
    logger.info('     http://localhost:3001');
    logger.info('  📱 Features available:');
    logger.info('     • Create, edit, delete notes');
    logger.info('     • Filter by category, priority, status');
    logger.info('     • Search notes by content');
    logger.info('     • View live statistics');
    logger.info('     • Preview LLM context');
    logger.info('     • Import/export configurations');
    
    // API examples
    logger.info('\n🔌 API Usage Examples...');
    logger.info('  📡 Create a note:');
    logger.info('     curl -X POST http://localhost:3001/api/notes \\');
    logger.info('       -H "Content-Type: application/json" \\');
    logger.info('       -d \'{"content":"Be concise","category":"instruction","priority":"medium"}\'');
    logger.info('  📊 Get statistics:');
    logger.info('     curl http://localhost:3001/api/stats');
    logger.info('  🧠 Get LLM context:');
    logger.info('     curl http://localhost:3001/api/context');
    
    logger.info('\n🎉 Demo completed successfully!');
    logger.info('💡 The personality management system is ready for production use.');
    
  } catch (error) {
    logger.error('❌ Demo failed:', error);
    throw error;
  } finally {
    // Clean up connections
    if (useDatabase && 'disconnect' in service) {
      await (service as PersonalityNotesServiceDb).disconnect();
    }
  }
}

// Run demo if this script is executed directly
if (require.main === module) {
  runDemo()
    .then(() => {
      logger.info('✅ Demo script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Demo script failed:', error);
      process.exit(1);
    });
}

export { runDemo };
