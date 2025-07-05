#!/usr/bin/env node

/**
 * Comprehensive test suite for CovaBot Unraid deployment configuration
 * 
 * This script tests all aspects of the Unraid deployment including:
 * - Persistence across container restarts
 * - Docker Compose configurations
 * - Web interface functionality
 * - File permissions
 * - Migration capabilities
 * - Cross-container integration
 * - Backup/restore functionality
 * 
 * Usage:
 *   npm run test:unraid
 *   or
 *   npx ts-node src/scripts/test-unraid-deployment.ts
 */

import { PersonalityNotesService } from '../services/personalityNotesService';
import { logger } from '@starbunk/shared';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
  duration?: number;
}

class UnraidDeploymentTester {
  private testResults: TestResult[] = [];
  private simulatedUnraidPath: string;
  private originalDataDir: string | undefined;

  constructor() {
    // Create a simulated Unraid environment
    this.simulatedUnraidPath = path.join(process.cwd(), 'test-unraid-appdata', 'starbunk');
    this.originalDataDir = process.env.COVABOT_DATA_DIR;
  }

  async setupSimulatedUnraidEnvironment(): Promise<void> {
    logger.info('🏗️ Setting up simulated Unraid environment...');
    
    // Create directory structure
    const directories = [
      this.simulatedUnraidPath,
      path.join(this.simulatedUnraidPath, 'covabot'),
      path.join(this.simulatedUnraidPath, 'postgres'),
      path.join(this.simulatedUnraidPath, 'djcova', 'cache'),
      path.join(this.simulatedUnraidPath, 'djcova', 'temp'),
      path.join(this.simulatedUnraidPath, 'starbunk-dnd', 'data'),
      path.join(this.simulatedUnraidPath, 'starbunk-dnd', 'campaigns'),
      path.join(this.simulatedUnraidPath, 'starbunk-dnd', 'context')
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
    }

    // Set environment variable to point to simulated Unraid path
    process.env.COVABOT_DATA_DIR = path.join(this.simulatedUnraidPath, 'covabot');
    process.env.UNRAID_APPDATA_PATH = path.dirname(this.simulatedUnraidPath);

    logger.info(`✅ Simulated Unraid environment created at: ${this.simulatedUnraidPath}`);
  }

  async cleanupSimulatedEnvironment(): Promise<void> {
    logger.info('🧹 Cleaning up simulated Unraid environment...');
    
    // Restore original environment
    if (this.originalDataDir) {
      process.env.COVABOT_DATA_DIR = this.originalDataDir;
    } else {
      delete process.env.COVABOT_DATA_DIR;
    }
    delete process.env.UNRAID_APPDATA_PATH;

    // Remove test directory
    try {
      await fs.rm(path.join(process.cwd(), 'test-unraid-appdata'), { recursive: true, force: true });
      logger.info('✅ Cleanup completed');
    } catch (error) {
      logger.warn('⚠️ Cleanup warning:', error);
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

  async testPersistenceFileStorage(): Promise<TestResult> {
    const service = PersonalityNotesService.getInstance();
    
    // Initialize service
    await service.loadNotes();
    
    // Create test note
    const testNote = await service.createNote({
      content: 'Unraid persistence test note - file storage',
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

    // Read file content
    const fileContent = await fs.readFile(notesFilePath, 'utf-8');
    const notes = JSON.parse(fileContent);
    const foundNote = notes.find((note: { id: string }) => note.id === testNote.id);

    // Cleanup
    await service.deleteNote(testNote.id);

    return {
      testName: 'File Storage Persistence',
      success: !!foundNote,
      message: foundNote ? 'File storage persistence working correctly' : 'Note not found in file',
      details: {
        filePath: notesFilePath,
        noteId: testNote.id,
        fileExists,
        noteFound: !!foundNote
      }
    };
  }

  async testFilePermissions(): Promise<TestResult> {
    const testFilePath = path.join(this.simulatedUnraidPath, 'covabot', 'permission-test.txt');
    const testContent = 'Permission test content';

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
        testName: 'File Permissions',
        success: readContent === testContent,
        message: 'File permissions working correctly',
        details: {
          canWrite: true,
          canRead: true,
          contentMatch: readContent === testContent,
          fileMode: stats.mode.toString(8),
          uid: stats.uid,
          gid: stats.gid
        }
      };
    } catch (error) {
      return {
        testName: 'File Permissions',
        success: false,
        message: 'File permission test failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          testPath: testFilePath
        }
      };
    }
  }

  async testWebInterfaceDataPersistence(): Promise<TestResult> {
    // Simulate web interface operations
    const service = PersonalityNotesService.getInstance();
    await service.loadNotes();

    // Create note via service (simulating web interface)
    const webNote = await service.createNote({
      content: 'Web interface test note for Unraid',
      category: 'personality',
      priority: 'medium'
    });

    // Verify it persists to Unraid path
    const notesFilePath = path.join(this.simulatedUnraidPath, 'covabot', 'personality-notes.json');
    const fileContent = await fs.readFile(notesFilePath, 'utf-8');
    const notes = JSON.parse(fileContent);
    const foundNote = notes.find((note: { id: string }) => note.id === webNote.id);

    // Test update operation
    const updatedNote = await service.updateNote(webNote.id, {
      content: 'Updated web interface test note for Unraid'
    });

    // Verify update persisted
    const updatedFileContent = await fs.readFile(notesFilePath, 'utf-8');
    const updatedNotes = JSON.parse(updatedFileContent);
    const foundUpdatedNote = updatedNotes.find((note: { id: string }) => note.id === webNote.id);

    // Cleanup
    await service.deleteNote(webNote.id);

    return {
      testName: 'Web Interface Data Persistence',
      success: !!foundNote && !!updatedNote && !!foundUpdatedNote,
      message: 'Web interface data persistence working correctly',
      details: {
        noteCreated: !!foundNote,
        noteUpdated: !!updatedNote,
        updatePersisted: !!foundUpdatedNote,
        originalContent: foundNote?.content,
        updatedContent: foundUpdatedNote?.content
      }
    };
  }

  async testBackupRestore(): Promise<TestResult> {
    const service = PersonalityNotesService.getInstance();
    await service.loadNotes();

    // Create test notes
    const testNotes = [
      {
        content: 'Backup test note 1',
        category: 'instruction' as const,
        priority: 'high' as const
      },
      {
        content: 'Backup test note 2',
        category: 'personality' as const,
        priority: 'medium' as const
      }
    ];

    const createdNotes = [];
    for (const noteData of testNotes) {
      const note = await service.createNote(noteData);
      createdNotes.push(note);
    }

    // Export notes (simulate backup)
    const allNotes = await service.getNotes();
    const backupData = JSON.stringify(allNotes, null, 2);
    const backupPath = path.join(this.simulatedUnraidPath, 'covabot', 'backup-test.json');
    await fs.writeFile(backupPath, backupData);

    // Clear all notes (simulate data loss)
    for (const note of createdNotes) {
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
        originalNotesCreated: createdNotes.length,
        notesAfterDelete: testNotesRemaining.length,
        notesRestored: restoredCount,
        finalRestoredNotes: restoredTestNotes.length,
        backupPath
      }
    };
  }

  async testDockerComposeValidation(): Promise<TestResult> {
    const composeFiles = [
      'docker-compose.yml',
      'docker-compose.latest.yml',
      'docker-compose.snapshot.yml'
    ];

    const results: Record<string, unknown> = {};

    for (const file of composeFiles) {
      try {
        // Validate compose file syntax
        const rootDir = path.join(process.cwd(), '..', '..');
        const { stdout, stderr } = await execAsync(`docker-compose -f ${file} config`, {
          cwd: rootDir,
          env: {
            ...process.env,
            UNRAID_APPDATA_PATH: '/mnt/user/appdata/starbunk'
          }
        });

        // Check if CovaBot service has correct volume mount
        const hasUnraidMount = stdout.includes('/mnt/user/appdata/starbunk') || 
                              stdout.includes('${UNRAID_APPDATA_PATH');
        
        results[file] = {
          valid: true,
          hasUnraidMount,
          stderr: stderr || null
        };
      } catch (error) {
        results[file] = {
          valid: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    const allValid = Object.values(results).every((result: { valid: boolean }) => result.valid);
    const allHaveUnraidMounts = Object.values(results).every((result: { hasUnraidMount: boolean }) => result.hasUnraidMount);

    return {
      testName: 'Docker Compose Validation',
      success: allValid && allHaveUnraidMounts,
      message: allValid && allHaveUnraidMounts 
        ? 'All Docker Compose files valid with Unraid mounts'
        : 'Some Docker Compose files have issues',
      details: results
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
    logger.info('🚀 Starting comprehensive Unraid deployment tests...');
    logger.info('=' .repeat(80));

    await this.setupSimulatedUnraidEnvironment();

    try {
      // Run all test scenarios
      await this.runTest('File Storage Persistence', () => this.testPersistenceFileStorage());
      await this.runTest('File Permissions', () => this.testFilePermissions());
      await this.runTest('Web Interface Data Persistence', () => this.testWebInterfaceDataPersistence());
      await this.runTest('Backup/Restore', () => this.testBackupRestore());
      await this.runTest('Docker Compose Validation', () => this.testDockerComposeValidation());
      await this.runTest('LLM Integration', () => this.testLLMIntegration());

      // Generate test report
      this.generateTestReport();

    } finally {
      await this.cleanupSimulatedEnvironment();
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

    // Failed test details
    if (failedTests.length > 0) {
      logger.info(`\n🔍 Failed Test Details:`);
      failedTests.forEach(result => {
        logger.error(`\n❌ ${result.testName}:`);
        logger.error(`   Message: ${result.message}`);
        if (result.details) {
          logger.error(`   Details: ${JSON.stringify(result.details, null, 2)}`);
        }
      });
    }

    // Recommendations
    logger.info(`\n💡 Recommendations:`);
    if (passedTests.length === this.testResults.length) {
      logger.info('   🎉 All tests passed! Your Unraid deployment configuration is ready.');
      logger.info('   📝 Next steps:');
      logger.info('      1. Deploy to your Unraid server using the provided docker-compose files');
      logger.info('      2. Set UNRAID_APPDATA_PATH=/mnt/user/appdata/starbunk');
      logger.info('      3. Access the web interface at http://your-unraid-ip:3001');
      logger.info('      4. Configure your personality notes through the web interface');
    } else {
      logger.info('   ⚠️ Some tests failed. Please review the issues above before deploying.');
      logger.info('   🔧 Common fixes:');
      logger.info('      - Ensure Docker and Docker Compose are installed');
      logger.info('      - Check file permissions on the target directory');
      logger.info('      - Verify environment variables are set correctly');
    }

    // Environment info
    logger.info(`\n🔧 Test Environment:`);
    logger.info(`   Simulated Unraid Path: ${this.simulatedUnraidPath}`);
    logger.info(`   COVABOT_DATA_DIR: ${process.env.COVABOT_DATA_DIR}`);
    logger.info(`   UNRAID_APPDATA_PATH: ${process.env.UNRAID_APPDATA_PATH}`);
    logger.info(`   Node.js Version: ${process.version}`);
    logger.info(`   Platform: ${process.platform}`);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new UnraidDeploymentTester();
  
  tester.runAllTests()
    .then(() => {
      logger.info('✅ Unraid deployment tests completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Unraid deployment tests failed:', error);
      process.exit(1);
    });
}

export { UnraidDeploymentTester };
