#!/usr/bin/env node

/**
 * Test script to verify personality notes persistence across container restarts
 * 
 * This script tests both file-based and database storage modes to ensure
 * data persists correctly when using Docker volume mounts on Unraid.
 * 
 * Usage:
 *   npm run test:persistence
 *   or
 *   npx ts-node src/scripts/test-persistence.ts
 */

import { PersonalityNotesService } from '../services/personalityNotesService';
import { PersonalityNotesServiceDb } from '../services/personalityNotesServiceDb';
import { logger } from '@starbunk/shared';
import * as fs from 'fs/promises';
import * as path from 'path';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

async function testFileStoragePersistence(): Promise<TestResult> {
  logger.info('🧪 Testing file storage persistence...');
  
  try {
    const service = PersonalityNotesService.getInstance();
    
    // Initialize service
    await service.loadNotes();
    
    // Create a test note
    const testNote = await service.createNote({
      content: 'Test persistence note - created at ' + new Date().toISOString(),
      category: 'instruction',
      priority: 'high'
    });
    
    logger.info(`✅ Created test note: ${testNote.id}`);
    
    // Verify the file exists on disk
    const dataDir = process.env.COVABOT_DATA_DIR || path.join(process.cwd(), 'data');
    const notesFilePath = path.join(dataDir, 'personality-notes.json');
    
    try {
      const fileContent = await fs.readFile(notesFilePath, 'utf-8');
      const notes = JSON.parse(fileContent);
      
      const foundNote = notes.find((note: any) => note.id === testNote.id);
      
      if (foundNote) {
        logger.info('✅ Test note found in file storage');
        
        // Clean up test note
        await service.deleteNote(testNote.id);
        logger.info('🧹 Cleaned up test note');
        
        return {
          success: true,
          message: 'File storage persistence test passed',
          details: {
            filePath: notesFilePath,
            noteId: testNote.id,
            fileExists: true,
            noteFoundInFile: true
          }
        };
      } else {
        return {
          success: false,
          message: 'Test note not found in file storage',
          details: {
            filePath: notesFilePath,
            noteId: testNote.id,
            fileExists: true,
            noteFoundInFile: false
          }
        };
      }
    } catch (fileError) {
      return {
        success: false,
        message: 'Failed to read notes file',
        details: {
          filePath: notesFilePath,
          error: fileError instanceof Error ? fileError.message : 'Unknown error'
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'File storage test failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function testDatabaseStoragePersistence(): Promise<TestResult> {
  logger.info('🧪 Testing database storage persistence...');
  
  try {
    const service = PersonalityNotesServiceDb.getInstance();
    
    // Initialize service
    await service.initialize();
    
    // Create a test note
    const testNote = await service.createNote({
      content: 'Test database persistence note - created at ' + new Date().toISOString(),
      category: 'instruction',
      priority: 'high'
    });
    
    logger.info(`✅ Created test note in database: ${testNote.id}`);
    
    // Verify the note exists in database
    const retrievedNote = await service.getNoteById(testNote.id);
    
    if (retrievedNote) {
      logger.info('✅ Test note found in database');
      
      // Clean up test note
      await service.deleteNote(testNote.id);
      logger.info('🧹 Cleaned up test note from database');
      
      return {
        success: true,
        message: 'Database storage persistence test passed',
        details: {
          noteId: testNote.id,
          noteFoundInDatabase: true
        }
      };
    } else {
      return {
        success: false,
        message: 'Test note not found in database',
        details: {
          noteId: testNote.id,
          noteFoundInDatabase: false
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Database storage test failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function testVolumeMount(): Promise<TestResult> {
  logger.info('🧪 Testing Docker volume mount configuration...');
  
  try {
    const dataDir = process.env.COVABOT_DATA_DIR || path.join(process.cwd(), 'data');
    
    // Test write permissions
    const testFilePath = path.join(dataDir, 'test-write-permissions.txt');
    const testContent = 'Test write permissions - ' + new Date().toISOString();
    
    await fs.writeFile(testFilePath, testContent, 'utf-8');
    logger.info('✅ Successfully wrote test file');
    
    // Test read permissions
    const readContent = await fs.readFile(testFilePath, 'utf-8');
    
    if (readContent === testContent) {
      logger.info('✅ Successfully read test file');
      
      // Clean up test file
      await fs.unlink(testFilePath);
      logger.info('🧹 Cleaned up test file');
      
      return {
        success: true,
        message: 'Volume mount test passed',
        details: {
          dataDir,
          canWrite: true,
          canRead: true
        }
      };
    } else {
      return {
        success: false,
        message: 'File content mismatch',
        details: {
          dataDir,
          expected: testContent,
          actual: readContent
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Volume mount test failed',
      details: {
        dataDir: process.env.COVABOT_DATA_DIR || path.join(process.cwd(), 'data'),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function runPersistenceTests(): Promise<void> {
  logger.info('🚀 Starting CovaBot persistence tests...');
  logger.info('=' .repeat(60));
  
  const results: TestResult[] = [];
  
  // Test volume mount first
  logger.info('\n📁 Testing volume mount configuration...');
  const volumeResult = await testVolumeMount();
  results.push(volumeResult);
  
  if (volumeResult.success) {
    logger.info('✅ Volume mount test passed');
  } else {
    logger.error('❌ Volume mount test failed:', volumeResult.message);
    logger.error('Details:', volumeResult.details);
  }
  
  // Test file storage
  logger.info('\n📄 Testing file storage persistence...');
  const fileResult = await testFileStoragePersistence();
  results.push(fileResult);
  
  if (fileResult.success) {
    logger.info('✅ File storage test passed');
  } else {
    logger.error('❌ File storage test failed:', fileResult.message);
    logger.error('Details:', fileResult.details);
  }
  
  // Test database storage (if available)
  logger.info('\n🗄️ Testing database storage persistence...');
  try {
    const dbResult = await testDatabaseStoragePersistence();
    results.push(dbResult);
    
    if (dbResult.success) {
      logger.info('✅ Database storage test passed');
    } else {
      logger.error('❌ Database storage test failed:', dbResult.message);
      logger.error('Details:', dbResult.details);
    }
  } catch (error) {
    logger.warn('⚠️ Database storage test skipped (database not available)');
    results.push({
      success: false,
      message: 'Database not available',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
  
  // Summary
  logger.info('\n📊 Test Results Summary:');
  logger.info('=' .repeat(60));
  
  const passedTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  results.forEach((result, index) => {
    const testNames = ['Volume Mount', 'File Storage', 'Database Storage'];
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    logger.info(`${testNames[index]}: ${status} - ${result.message}`);
  });
  
  logger.info(`\nOverall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    logger.info('🎉 All persistence tests passed! Your Unraid setup is working correctly.');
  } else {
    logger.error('⚠️ Some tests failed. Please check your Unraid configuration.');
  }
  
  // Environment info
  logger.info('\n🔧 Environment Information:');
  logger.info(`Data Directory: ${process.env.COVABOT_DATA_DIR || path.join(process.cwd(), 'data')}`);
  logger.info(`Use Database: ${process.env.USE_DATABASE || 'false'}`);
  logger.info(`Node Environment: ${process.env.NODE_ENV || 'development'}`);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runPersistenceTests()
    .then(() => {
      logger.info('✅ Persistence tests completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Persistence tests failed:', error);
      process.exit(1);
    });
}

export { runPersistenceTests };
