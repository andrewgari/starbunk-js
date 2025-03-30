import path from 'path';
import { Campaign } from '../../domain/models';
import { logger } from '../../services/logger';
import { Note } from '../types/game';
import { TextWithMetadata } from '../types/textWithMetadata';
import { CampaignFileService } from './campaignFileService';
import { GameLLMService } from './llmService';
import { VectorService } from './vectorService';

export class NoteService {
	private static instance: NoteService | null = null;
	private llmService: GameLLMService | null = null;
	private fileService: CampaignFileService;
	private vectorService: VectorService;

	private constructor() {
		this.fileService = CampaignFileService.getInstance();
		this.vectorService = VectorService.getInstance();
	}

	public static getInstance(): NoteService {
		if (!NoteService.instance) {
			NoteService.instance = new NoteService();
		}
		return NoteService.instance;
	}

	private async ensureLLMService(): Promise<GameLLMService> {
		if (!this.llmService) {
			this.llmService = await GameLLMService.getInstance();
		}
		return this.llmService;
	}

	private generateNoteFilename(note: Note): string {
		const timestamp = note.timestamp.toISOString().replace(/[:.]/g, '-');
		const sanitizedCategory = note.category.toLowerCase().replace(/[^a-z0-9]/g, '-');
		return `${timestamp}-${sanitizedCategory}.json`;
	}

	public async addNote(data: {
		campaignId: string;
		adventureId: string;
		content: string;
		userId: string;
		isGM: boolean;
		tags: string[];
	}): Promise<Note> {
		logger.debug('[NoteService] Adding new note...', {
			campaignId: data.campaignId,
			userId: data.userId,
			contentLength: data.content.length,
			isGM: data.isGM,
			tags: data.tags
		});

		try {
			// Ensure campaign directory structure exists first (fast operation)
			await this.fileService.ensureCampaignDirectoryStructure(data.campaignId);

			// Create a basic note first with default category
			const note: Note = {
				content: data.content,
				userId: data.userId,
				category: 'general', // Default category
				tags: data.tags,
				isGMOnly: data.isGM, // Default to user's GM status
				timestamp: new Date()
			};

			// Save the note immediately with basic info
			logger.debug('[NoteService] Saving initial note...');
			await this.saveNote(data.campaignId, note);
			logger.info('[NoteService] Successfully saved initial note');

			// Start async operations after initial save
			this.processNoteAsync(data.campaignId, note).catch(error => {
				logger.error('[NoteService] Error in async note processing:', error instanceof Error ? error : new Error(String(error)));
			});

			return note;
		} catch (error) {
			logger.error('[NoteService] Error adding note:', error instanceof Error ? error : new Error(String(error)));
			throw new Error('Failed to add note');
		}
	}

	private async processNoteAsync(campaignId: string, note: Note): Promise<void> {
		try {
			// Get LLM categorization
			const llmService = await this.ensureLLMService();
			const { category, suggestedTags, isGMContent } = await llmService.categorizeNote(note.content);

			// Update note with LLM-provided info
			note.category = category;
			note.tags = [...new Set([...note.tags, ...suggestedTags])];
			note.isGMOnly = note.isGMOnly && isGMContent;

			// Save updated note
			await this.saveNote(campaignId, note);
			logger.info('[NoteService] Successfully updated note with categorization');

			// Save vector data
			await this.saveNoteAsVector(campaignId, note);
		} catch (error) {
			logger.error('[NoteService] Error in async note processing:', error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Save note as vector embedding for semantic search
	 */
	private async saveNoteAsVector(campaignId: string, note: Note): Promise<void> {
		try {
			logger.debug('[NoteService] Creating vector embedding for note...');

			// Create metadata for the note
			const noteMetadata = {
				file: `note_${note.timestamp.toISOString()}.json`,
				is_gm_content: note.isGMOnly,
				chunk_size: note.content.length
			};

			// Create text with metadata object
			const textWithMetadata: TextWithMetadata = {
				text: note.content,
				metadata: noteMetadata
			};

			// Generate vectors and save
			await this.vectorService.generateVectorsFromTexts(
				campaignId,
				[textWithMetadata]
			);

			logger.debug('[NoteService] Vector embedding created and saved successfully');
		} catch (error) {
			logger.error('[NoteService] Error saving note as vector:', error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}

	/**
	 * Convert an existing note to vector format
	 */
	public async convertNoteToVector(campaignId: string, note: Note): Promise<void> {
		try {
			// Create metadata for the note
			const noteMetadata = {
				file: `note_${note.timestamp.toISOString()}.json`,
				is_gm_content: note.isGMOnly,
				chunk_size: note.content.length
			};

			// Create text with metadata object
			const textWithMetadata: TextWithMetadata = {
				text: note.content,
				metadata: noteMetadata
			};

			// Generate vectors and save
			await this.vectorService.generateVectorsFromTexts(
				campaignId,
				[textWithMetadata]
			);

			logger.info('[NoteService] Successfully converted note to vector format');
		} catch (error) {
			logger.error('[NoteService] Error converting note to vector:', error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}

	public async getNotes(campaignId: string, options: { isGM: boolean }): Promise<Note[]> {
		try {
			// Validate directory structure
			const isValid = await this.fileService.validateDirectoryStructure(campaignId);
			if (!isValid) {
				await this.fileService.ensureCampaignDirectoryStructure(campaignId);
			}

			// Load notes from storage
			const notes = await this.loadNotes(campaignId, options.isGM);

			// Filter out GM-only notes for non-GM users
			return options.isGM ? notes : notes.filter(note => !note.isGMOnly);
		} catch (error) {
			logger.error('Error getting notes:', error instanceof Error ? error : new Error(String(error)));
			throw new Error('Failed to get notes');
		}
	}

	public async searchNotes(
		campaign: Campaign,
		query: string,
		options: { isGM: boolean }
	): Promise<Note[]> {
		try {
			// Load all notes for the campaign
			const notes = await this.loadNotes(campaign.id, options.isGM);
			if (notes.length === 0) {
				return [];
			}

			// Filter out GM-only notes if user is not GM
			const accessibleNotes = options.isGM
				? notes
				: notes.filter(note => !note.isGMOnly);

			// Simple text search
			const searchTerms = query.toLowerCase().split(/\s+/);
			return accessibleNotes.filter(note => {
				const noteText = `${note.content} ${note.category} ${note.tags.join(' ')}`.toLowerCase();
				return searchTerms.every(term => noteText.includes(term));
			});
		} catch (error) {
			logger.error('[NoteService] Error searching notes:', error instanceof Error ? error : new Error(String(error)));
			return [];
		}
	}

	private async saveNote(campaignId: string, note: Note): Promise<void> {
		logger.debug('[NoteService] Saving note to storage...', {
			campaignId,
			category: note.category,
			timestamp: note.timestamp
		});

		try {
			const notesDir = this.fileService.getNotePath(campaignId, note.isGMOnly);
			const filename = this.generateNoteFilename(note);
			const filePath = path.join(notesDir, filename);

			await this.fileService.saveToDirectory(filePath, JSON.stringify(note, null, 2));
			logger.info('[NoteService] Note saved successfully');
		} catch (error) {
			logger.error('[NoteService] Error saving note:', error instanceof Error ? error : new Error(String(error)));
			throw new Error('Failed to save note');
		}
	}

	private async loadNotes(campaignId: string, isGM: boolean): Promise<Note[]> {
		logger.debug('[NoteService] Loading notes from storage...', { campaignId, isGM });

		try {
			const notes: Note[] = [];

			// Always load player notes
			const playerNotesDir = this.fileService.getNotePath(campaignId, false);
			const playerNoteFiles = await this.fileService.listFiles(playerNotesDir);

			for (const file of playerNoteFiles) {
				const content = await this.fileService.readFromDirectory(path.join(playerNotesDir, file));
				if (content) {
					const note = JSON.parse(content);
					note.timestamp = new Date(note.timestamp);
					notes.push(note);
				}
			}

			// Load GM notes if user is GM
			if (isGM) {
				const gmNotesDir = this.fileService.getNotePath(campaignId, true);
				const gmNoteFiles = await this.fileService.listFiles(gmNotesDir);

				for (const file of gmNoteFiles) {
					const content = await this.fileService.readFromDirectory(path.join(gmNotesDir, file));
					if (content) {
						const note = JSON.parse(content);
						note.timestamp = new Date(note.timestamp);
						notes.push(note);
					}
				}
			}

			// Sort notes by timestamp
			notes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

			logger.debug(`[NoteService] Loaded ${notes.length} notes`);
			return notes;
		} catch (error) {
			logger.error('[NoteService] Error loading notes:', error instanceof Error ? error : new Error(String(error)));
			throw new Error('Failed to load notes');
		}
	}
}
