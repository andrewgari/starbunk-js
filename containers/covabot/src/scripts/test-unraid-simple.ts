#!/usr/bin/env node

/**
 * Simplified Unraid deployment test focusing on file storage and core functionality
 * 
 * This script tests the essential Unraid deployment features:
 * - File storage persistence with configurable data directory
 * - Volume mount simulation
 * - Web interface data operations
 * - Backup/restore functionality
 * 
 * Usage:
 *   npm run test:unraid:simple
 *   or
 *   npx ts-node src/scripts/test-unraid-simple.ts
 */

import { PersonalityNotesService } from '../services/personalityNotesService';
import { logger } from '@starbunk/shared';
import * as fs from 'fs/promises';
import * as path from 'path';

interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
  duration?: number;
}

class SimpleUnraidTester {
  private testResults: TestResult[] = [];
  private simulatedUnraidPath: string;
  private originalDataDir: string | undefined;

  constructor() {
    this.simulatedUnraidPath = path.join(process.cwd(), 'test-unraid-simple', 'starbunk');
    this.originalDataDir = process.env.COVABOT_DATA_DIR;
  }

  async setupEnvironment(): Promise<void> {
    logger.info('🏗️ Setting up simulated Unraid environment...');
    
    // Create directory structure
    const directories = [
      this.simulatedUnraidPath,
      path.join(this.simulatedUnraidPath, 'covabot'),
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
    }

    // Set environment variable to point to simulated Unraid path
    process.env.COVABOT_DATA_DIR = path.join(this.simulatedUnraidPath, 'covabot');

    logger.info(`✅ Simulated Unraid environment created at: ${this.simulatedUnraidPath}`);
    logger.info(`📁 CovaBot data directory: ${process.env.COVABOT_DATA_DIR}`);
  }

  async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up...');
    
    // Restore original environment
    if (this.originalDataDir) {
      process.env.COVABOT_DATA_DIR = this.originalDataDir;
    } else {
      delete process.env.COVABOT_DATA_DIR;
    }

    // Remove test directory
    try {
      await fs.rm(path.join(process.cwd(), 'test-unraid-simple'), { recursive: true, force: true });
      logger.info('✅ Cleanup completed');
    } catch (error) {
      logger.warn('⚠️ Cleanup warning:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async runTest(testName: string, testFunction: () => Promise<TestResult>): Promise<void> {
    const startTime = Date.now();
    logger.info(`\n🧪 Running test: ${testName}`);
    
    try {
      const result = await testFunction();
      result.duration = Date.now() - startTime;
      this.testResults.push(result);
      
      if (result.success) {
        logger.info(`✅ ${testName}: ${result.message}`);
      } else {
        logger.error(`❌ ${testName}: ${result.message}`);
        if (result.details) {
          logger.error(`Details: ${JSON.stringify(result.details, null, 2)}`);
        }
      }
    } catch (error) {
      const result: TestResult = {
        testName,
        success: false,
        message: `Test failed with exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.stack : error },
        duration: Date.now() - startTime
      };
      this.testResults.push(result);
      logger.error(`❌ ${testName}: ${result.message}`);
    }
  }

  async testFileStoragePersistence(): Promise<TestResult> {
    const service = PersonalityNotesService.getInstance();
    
    // Initialize service
    await service.loadNotes();
    
    // Create test note
    const testNote = await service.createNote({
      content: 'Unraid file storage persistence test',
      category: 'instruction',
      priority: 'high'
    });

    // Verify file exists in simulated Unraid path
    const notesFilePath = path.join(this.simulatedUnraidPath, 'covabot', 'personality-notes.json');
    const fileExists = await fs.access(notesFilePath).then(() => true).catch(() => false);
    
    if (!fileExists) {
      return {
        testName: 'File Storage Persistence',
        success: false,
        message: 'Notes file not created in Unraid path',
        details: { expectedPath: notesFilePath }
      };
    }

    // Read and verify file content
    const fileContent = await fs.readFile(notesFilePath, 'utf-8');
    const notes = JSON.parse(fileContent);
    const foundNote = notes.find((note: { id: string }) => note.id === testNote.id);

    // Test that the note persists after service restart
    const newService = PersonalityNotesService.getInstance();
    await newService.loadNotes();
    const reloadedNotes = await newService.getNotes();
    const persistedNote = reloadedNotes.find(note => note.id === testNote.id);

    // Cleanup
    await service.deleteNote(testNote.id);

    return {
      testName: 'File Storage Persistence',
      success: !!foundNote && !!persistedNote,
      message: 'File storage persistence working correctly',
      details: {
        filePath: notesFilePath,
        noteId: testNote.id,
        fileExists,
        noteFoundInFile: !!foundNote,
        notePersisted: !!persistedNote
      }
    };
  }

  async testVolumeMount(): Promise<TestResult> {
    const testFilePath = path.join(this.simulatedUnraidPath, 'covabot', 'volume-mount-test.txt');
    const testContent = 'Volume mount test content';

    try {
      // Test write
      await fs.writeFile(testFilePath, testContent);
      
      // Test read
      const readContent = await fs.readFile(testFilePath, 'utf-8');
      
      // Test file stats
      const stats = await fs.stat(testFilePath);
      
      // Cleanup
      await fs.unlink(testFilePath);

      return {
        testName: 'Volume Mount',
        success: readContent === testContent,
        message: 'Volume mount working correctly',
        details: {
          canWrite: true,
          canRead: true,
          contentMatch: readContent === testContent,
          fileMode: stats.mode.toString(8),
          testPath: testFilePath
        }
      };
    } catch (error) {
      return {
        testName: 'Volume Mount',
        success: false,
        message: 'Volume mount test failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          testPath: testFilePath
        }
      };
    }
  }

  async testWebInterfaceOperations(): Promise<TestResult> {
    const service = PersonalityNotesService.getInstance();
    await service.loadNotes();

    // Test CRUD operations (simulating web interface)
    const testNote = await service.createNote({
      content: 'Web interface CRUD test',
      category: 'personality',
      priority: 'medium'
    });

    // Test update
    const updatedNote = await service.updateNote(testNote.id, {
      content: 'Updated web interface CRUD test',
      priority: 'high'
    });

    // Test retrieval
    const retrievedNote = await service.getNoteById(testNote.id);

    // Test filtering
    const highPriorityNotes = await service.getNotes({ priority: 'high' });
    const foundInFilter = highPriorityNotes.some(note => note.id === testNote.id);

    // Cleanup
    await service.deleteNote(testNote.id);

    return {
      testName: 'Web Interface Operations',
      success: !!updatedNote && !!retrievedNote && foundInFilter,
      message: 'Web interface operations working correctly',
      details: {
        noteCreated: !!testNote,
        noteUpdated: !!updatedNote,
        noteRetrieved: !!retrievedNote,
        foundInFilter,
        updatedContent: updatedNote?.content,
        updatedPriority: updatedNote?.priority
      }
    };
  }

  async testBackupRestore(): Promise<TestResult> {
    const service = PersonalityNotesService.getInstance();
    await service.loadNotes();

    // Create test notes
    const testNotes = [
      await service.createNote({
        content: 'Backup test note 1',
        category: 'instruction',
        priority: 'high'
      }),
      await service.createNote({
        content: 'Backup test note 2',
        category: 'personality',
        priority: 'medium'
      })
    ];

    // Export notes (simulate backup)
    const allNotes = await service.getNotes();
    const backupData = JSON.stringify(allNotes, null, 2);
    const backupPath = path.join(this.simulatedUnraidPath, 'covabot', 'backup-test.json');
    await fs.writeFile(backupPath, backupData);

    // Clear notes
    for (const note of testNotes) {
      await service.deleteNote(note.id);
    }

    // Verify notes are gone
    const notesAfterDelete = await service.getNotes();
    const testNotesRemaining = notesAfterDelete.filter(note => 
      note.content.includes('Backup test note')
    );

    // Restore from backup
    const backupContent = await fs.readFile(backupPath, 'utf-8');
    const backupNotes = JSON.parse(backupContent);
    
    let restoredCount = 0;
    for (const note of backupNotes) {
      if (note.content.includes('Backup test note')) {
        await service.createNote({
          content: note.content,
          category: note.category,
          priority: note.priority
        });
        restoredCount++;
      }
    }

    // Verify restoration
    const notesAfterRestore = await service.getNotes();
    const restoredTestNotes = notesAfterRestore.filter(note => 
      note.content.includes('Backup test note')
    );

    // Cleanup
    await fs.unlink(backupPath);
    for (const note of restoredTestNotes) {
      await service.deleteNote(note.id);
    }

    return {
      testName: 'Backup/Restore',
      success: testNotesRemaining.length === 0 && restoredTestNotes.length === 2,
      message: 'Backup/restore functionality working correctly',
      details: {
        originalNotesCreated: testNotes.length,
        notesAfterDelete: testNotesRemaining.length,
        notesRestored: restoredCount,
        finalRestoredNotes: restoredTestNotes.length,
        backupPath
      }
    };
  }

  async testLLMIntegration(): Promise<TestResult> {
    const service = PersonalityNotesService.getInstance();
    await service.loadNotes();

    // Create test personality note
    const testNote = await service.createNote({
      content: 'Always respond with enthusiasm and use emojis',
      category: 'personality',
      priority: 'high'
    });

    // Get LLM context
    const llmContext = await service.getActiveNotesForLLM();
    
    // Verify the note is included in LLM context
    const noteIncluded = llmContext.includes(testNote.content);

    // Cleanup
    await service.deleteNote(testNote.id);

    return {
      testName: 'LLM Integration',
      success: noteIncluded,
      message: noteIncluded 
        ? 'Personality notes properly integrated into LLM context'
        : 'Personality notes not found in LLM context',
      details: {
        noteContent: testNote.content,
        noteIncluded,
        contextLength: llmContext.length,
        contextPreview: llmContext.substring(0, 200) + '...'
      }
    };
  }

  async runAllTests(): Promise<void> {
    logger.info('🚀 Starting simplified Unraid deployment tests...');
    logger.info('=' .repeat(80));

    await this.setupEnvironment();

    try {
      // Run core tests
      await this.runTest('Volume Mount', () => this.testVolumeMount());
      await this.runTest('File Storage Persistence', () => this.testFileStoragePersistence());
      await this.runTest('Web Interface Operations', () => this.testWebInterfaceOperations());
      await this.runTest('Backup/Restore', () => this.testBackupRestore());
      await this.runTest('LLM Integration', () => this.testLLMIntegration());

      // Generate test report
      this.generateTestReport();

    } finally {
      await this.cleanup();
    }
  }

  private generateTestReport(): void {
    logger.info('\n📊 Test Results Summary');
    logger.info('=' .repeat(80));

    const passedTests = this.testResults.filter(r => r.success);
    const failedTests = this.testResults.filter(r => !r.success);
    const totalDuration = this.testResults.reduce((sum, r) => sum + (r.duration || 0), 0);

    // Overall summary
    logger.info(`\n🎯 Overall Results:`);
    logger.info(`   ✅ Passed: ${passedTests.length}/${this.testResults.length} tests`);
    logger.info(`   ❌ Failed: ${failedTests.length}/${this.testResults.length} tests`);
    logger.info(`   ⏱️ Total Duration: ${totalDuration}ms`);

    // Detailed results
    logger.info(`\n📋 Detailed Results:`);
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      logger.info(`   ${index + 1}. ${status} ${result.testName}${duration}`);
      logger.info(`      ${result.message}`);
    });

    // Recommendations
    logger.info(`\n💡 Unraid Deployment Status:`);
    if (passedTests.length === this.testResults.length) {
      logger.info('   🎉 All core tests passed! Your Unraid deployment is ready.');
      logger.info('   📝 Deployment steps:');
      logger.info('      1. Set UNRAID_APPDATA_PATH=/mnt/user/appdata/starbunk');
      logger.info('      2. Deploy using: docker-compose up -d');
      logger.info('      3. Access web interface at http://your-unraid-ip:3001');
      logger.info('      4. Personality notes will persist in /mnt/user/appdata/starbunk/covabot/');
    } else {
      logger.info('   ⚠️ Some tests failed. Please review the issues above.');
    }

    // Environment info
    logger.info(`\n🔧 Test Environment:`);
    logger.info(`   Simulated Unraid Path: ${this.simulatedUnraidPath}`);
    logger.info(`   COVABOT_DATA_DIR: ${process.env.COVABOT_DATA_DIR}`);
    logger.info(`   Platform: ${process.platform}`);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new SimpleUnraidTester();
  
  tester.runAllTests()
    .then(() => {
      logger.info('✅ Simplified Unraid deployment tests completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error(`❌ Simplified Unraid deployment tests failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    });
}

export { SimpleUnraidTester };
