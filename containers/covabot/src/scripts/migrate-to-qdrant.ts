#!/usr/bin/env ts-node

/**
 * Migration script to convert existing personality notes to Qdrant vector storage
 * Supports migration from both file-based and PostgreSQL storage
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '@starbunk/shared';
import { QdrantMemoryService } from '../services/qdrantMemoryService';
import { PersonalityNotesService } from '../services/personalityNotesService';
import { PersonalityNotesServiceDb } from '../services/personalityNotesServiceDb';
import { MigrationData } from '../types/memoryTypes';
// import { PersonalityMemory } from '../types/memoryTypes'; // Unused import

interface MigrationOptions {
	sourceType: 'file' | 'database' | 'json';
	sourceFile?: string;
	dryRun?: boolean;
	backupPath?: string;
	skipExisting?: boolean;
}

class QdrantMigrationService {
	private memoryService: QdrantMemoryService;
	private options: MigrationOptions;

	constructor(options: MigrationOptions) {
		this.memoryService = QdrantMemoryService.getInstance();
		this.options = options;
	}

	/**
	 * Run the migration process
	 */
	async migrate(): Promise<void> {
		try {
			logger.info('[Migration] Starting Qdrant migration...');
			logger.info(`[Migration] Source: ${this.options.sourceType}`);
			logger.info(`[Migration] Dry run: ${this.options.dryRun || false}`);

			// Initialize Qdrant memory service
			await this.memoryService.initialize();
			logger.info('[Migration] Qdrant memory service initialized');

			// Create backup if requested
			if (this.options.backupPath && !this.options.dryRun) {
				await this.createBackup();
			}

			// Load source data
			const sourceData = await this.loadSourceData();
			logger.info(`[Migration] Loaded ${sourceData.personalityNotes.length} personality notes from source`);

			// Check for existing data
			if (this.options.skipExisting) {
				const existingNotes = await this.memoryService.getNotes();
				if (existingNotes.length > 0) {
					logger.warn(`[Migration] Found ${existingNotes.length} existing notes in Qdrant. Skipping migration.`);
					return;
				}
			}

			// Migrate personality notes
			await this.migratePersonalityNotes(sourceData.personalityNotes);

			// Migrate conversations if available
			if (sourceData.conversations && sourceData.conversations.length > 0) {
				await this.migrateConversations(sourceData.conversations);
			}

			logger.info('[Migration] Migration completed successfully!');

			// Verify migration
			await this.verifyMigration(sourceData);

		} catch (error) {
			logger.error(`[Migration] Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
			throw error;
		}
	}

	/**
	 * Load data from the specified source
	 */
	private async loadSourceData(): Promise<MigrationData> {
		switch (this.options.sourceType) {
			case 'file':
				return await this.loadFromFileService();
			case 'database':
				return await this.loadFromDatabaseService();
			case 'json':
				return await this.loadFromJsonFile();
			default:
				throw new Error(`Unsupported source type: ${this.options.sourceType}`);
		}
	}

	/**
	 * Load data from file-based PersonalityNotesService
	 */
	private async loadFromFileService(): Promise<MigrationData> {
		const fileService = PersonalityNotesService.getInstance();
		await fileService.loadNotes();
		
		const notes = await fileService.getNotes();
		
		return {
			personalityNotes: notes.map(note => ({
				id: note.id,
				content: note.content,
				category: note.category,
				priority: note.priority,
				isActive: note.isActive,
				createdAt: note.createdAt,
				updatedAt: note.updatedAt,
			})),
		};
	}

	/**
	 * Load data from database-based PersonalityNotesServiceDb
	 */
	private async loadFromDatabaseService(): Promise<MigrationData> {
		const dbService = PersonalityNotesServiceDb.getInstance();
		await dbService.initialize();
		
		const notes = await dbService.getNotes();
		
		return {
			personalityNotes: notes.map(note => ({
				id: note.id,
				content: note.content,
				category: note.category,
				priority: note.priority,
				isActive: note.isActive,
				createdAt: note.createdAt,
				updatedAt: note.updatedAt,
			})),
		};
	}

	/**
	 * Load data from JSON file
	 */
	private async loadFromJsonFile(): Promise<MigrationData> {
		if (!this.options.sourceFile) {
			throw new Error('Source file path is required for JSON migration');
		}

		const filePath = path.resolve(this.options.sourceFile);
		const fileContent = await fs.readFile(filePath, 'utf-8');
		const data = JSON.parse(fileContent);

		// Validate data structure
		if (!data.personalityNotes || !Array.isArray(data.personalityNotes)) {
			throw new Error('Invalid JSON structure: personalityNotes array is required');
		}

		return data as MigrationData;
	}

	/**
	 * Migrate personality notes to Qdrant
	 */
	private async migratePersonalityNotes(notes: MigrationData['personalityNotes']): Promise<void> {
		logger.info(`[Migration] Migrating ${notes.length} personality notes...`);

		let migrated = 0;
		let skipped = 0;
		let errors = 0;

		for (const note of notes) {
			try {
				if (this.options.dryRun) {
					logger.debug(`[Migration] [DRY RUN] Would migrate note: ${note.content.substring(0, 50)}...`);
					migrated++;
					continue;
				}

				// Check if note already exists
				if (note.id) {
					const existing = await this.memoryService.getNoteById(note.id);
					if (existing) {
						logger.debug(`[Migration] Note already exists, skipping: ${note.id}`);
						skipped++;
						continue;
					}
				}

				// Create note in Qdrant
				await this.memoryService.createNote({
					content: note.content,
					category: note.category,
					priority: note.priority,
				});

				migrated++;
				
				if (migrated % 10 === 0) {
					logger.info(`[Migration] Progress: ${migrated}/${notes.length} notes migrated`);
				}

			} catch (error) {
				logger.error(`[Migration] Failed to migrate note: ${error instanceof Error ? error.message : 'Unknown error'}`);
				errors++;
			}
		}

		logger.info(`[Migration] Personality notes migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
	}

	/**
	 * Migrate conversation history to Qdrant
	 */
	private async migrateConversations(conversations: NonNullable<MigrationData['conversations']>): Promise<void> {
		logger.info(`[Migration] Migrating ${conversations.length} conversation items...`);

		let migrated = 0;
		let errors = 0;

		for (const conv of conversations) {
			try {
				if (this.options.dryRun) {
					logger.debug(`[Migration] [DRY RUN] Would migrate conversation: ${conv.content.substring(0, 50)}...`);
					migrated++;
					continue;
				}

				await this.memoryService.storeConversation({
					content: conv.content,
					userId: conv.userId,
					channelId: conv.channelId,
					messageType: conv.messageType,
					conversationId: conv.conversationId,
				});

				migrated++;

				if (migrated % 50 === 0) {
					logger.info(`[Migration] Progress: ${migrated}/${conversations.length} conversations migrated`);
				}

			} catch (error) {
				logger.error(`[Migration] Failed to migrate conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
				errors++;
			}
		}

		logger.info(`[Migration] Conversation migration complete: ${migrated} migrated, ${errors} errors`);
	}

	/**
	 * Create backup of existing data
	 */
	private async createBackup(): Promise<void> {
		try {
			const backupPath = this.options.backupPath || `./backup_${Date.now()}.json`;
			const sourceData = await this.loadSourceData();
			
			await fs.writeFile(backupPath, JSON.stringify(sourceData, null, 2));
			logger.info(`[Migration] Backup created: ${backupPath}`);
		} catch (error) {
			logger.error(`[Migration] Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
			throw error;
		}
	}

	/**
	 * Verify migration results
	 */
	private async verifyMigration(sourceData: MigrationData): Promise<void> {
		try {
			const stats = await this.memoryService.getStats();
			
			logger.info('[Migration] Verification results:');
			logger.info(`  Source personality notes: ${sourceData.personalityNotes.length}`);
			logger.info(`  Migrated personality notes: ${stats.byType.personality || 0}`);
			logger.info(`  Source conversations: ${sourceData.conversations?.length || 0}`);
			logger.info(`  Migrated conversations: ${stats.byType.conversation || 0}`);
			logger.info(`  Total vectors in Qdrant: ${stats.total}`);

			// Check health
			const health = await this.memoryService.healthCheck();
			logger.info(`  Qdrant health: ${health.status}`);
			
			if (health.status !== 'healthy') {
				logger.warn('[Migration] Qdrant health check indicates issues');
			}

		} catch (error) {
			logger.error(`[Migration] Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}

/**
 * Main migration function
 */
async function runMigration(): Promise<void> {
	// Parse command line arguments
	const args = process.argv.slice(2);
	const options: MigrationOptions = {
		sourceType: 'file', // default
		dryRun: false,
		skipExisting: true,
	};

	// Parse arguments
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		switch (arg) {
			case '--source':
				options.sourceType = args[++i] as 'file' | 'database' | 'json';
				break;
			case '--file':
				options.sourceFile = args[++i];
				break;
			case '--dry-run':
				options.dryRun = true;
				break;
			case '--backup':
				options.backupPath = args[++i];
				break;
			case '--force':
				options.skipExisting = false;
				break;
			case '--help':
				printUsage();
				process.exit(0);
		}
	}

	// Validate options
	if (options.sourceType === 'json' && !options.sourceFile) {
		logger.error('JSON source requires --file parameter');
		process.exit(1);
	}

	// Run migration
	const migrationService = new QdrantMigrationService(options);
	await migrationService.migrate();
}

function printUsage(): void {
	console.log(`
Usage: npm run migrate-to-qdrant [options]

Options:
  --source <type>     Source type: file, database, or json (default: file)
  --file <path>       Source file path (required for json source)
  --dry-run          Run migration without making changes
  --backup <path>    Create backup before migration
  --force            Overwrite existing data in Qdrant
  --help             Show this help message

Examples:
  npm run migrate-to-qdrant --source file --backup ./backup.json
  npm run migrate-to-qdrant --source database --dry-run
  npm run migrate-to-qdrant --source json --file ./export.json
`);
}

// Run migration if called directly
if (require.main === module) {
	runMigration().catch((error) => {
		logger.error(`Migration failed: ${error.message}`);
		process.exit(1);
	});
}

export { QdrantMigrationService, runMigration };
