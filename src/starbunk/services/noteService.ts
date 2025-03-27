import path from 'path';
import { Campaign } from '../../domain/models';
import { logger } from '../../services/logger';
import { Note } from '../types/game';
import { CampaignFileService } from './campaignFileService';
import { GameLLMService } from './llmService';

export class NoteService {
	private static instance: NoteService;
	private llmService: GameLLMService;
	private fileService: CampaignFileService;

	private constructor() {
		this.llmService = GameLLMService.getInstance();
		this.fileService = CampaignFileService.getInstance();
	}

	public static getInstance(): NoteService {
		if (!NoteService.instance) {
			NoteService.instance = new NoteService();
		}
		return NoteService.instance;
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
			// Ensure campaign directory structure exists
			await this.fileService.ensureCampaignDirectoryStructure(data.campaignId);

			// Use LLM to categorize the note
			logger.debug('[NoteService] Requesting note categorization from LLM...');
			const categorization = await this.llmService.categorizeNote(data.content);
			logger.debug('[NoteService] Received note categorization:', categorization);

			// Create the note
			const note: Note = {
				content: data.content,
				userId: data.userId,
				category: categorization.category,
				tags: [...new Set([...data.tags, ...categorization.suggestedTags])],
				isGMOnly: data.isGM && categorization.isGMContent,
				timestamp: new Date()
			};
			logger.debug('[NoteService] Created note object:', {
				category: note.category,
				tags: note.tags,
				isGMOnly: note.isGMOnly
			});

			// Save the note
			logger.debug('[NoteService] Saving note...');
			await this.saveNote(data.campaignId, note);
			logger.info('[NoteService] Successfully saved note');

			return note;
		} catch (error) {
			logger.error('[NoteService] Error adding note:', error instanceof Error ? error : new Error(String(error)));
			logger.debug('[NoteService] Context:', {
				campaignId: data.campaignId,
				userId: data.userId
			});
			if (error instanceof Error) {
				logger.error('[NoteService] Error details:', {
					message: error.message,
					stack: error.stack,
					name: error.name
				});
			}
			throw new Error('Failed to add note');
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

	public async searchNotes(campaign: Campaign, query: string, options: { isGM: boolean }): Promise<Note[]> {
		logger.debug('[NoteService] Searching notes...', {
			campaignId: campaign.id,
			query,
			isGM: options.isGM
		});

		try {
			// Validate directory structure
			const isValid = await this.fileService.validateDirectoryStructure(campaign.id);
			if (!isValid) {
				await this.fileService.ensureCampaignDirectoryStructure(campaign.id);
			}

			logger.debug('[NoteService] Getting all notes...');
			const notes = await this.getNotes(campaign.id, options);
			logger.debug(`[NoteService] Found ${notes.length} total notes`);

			// If no notes found, return empty array
			if (notes.length === 0) {
				logger.debug('[NoteService] No notes found, returning empty array');
				return [];
			}

			// Use LLM to find relevant notes
			const noteContexts = notes.map(note => ({
				category: note.category,
				content: note.content,
				tags: note.tags
			}));
			logger.debug('[NoteService] Prepared note contexts for relevance check');

			logger.debug('[NoteService] Requesting relevant context from LLM...');
			const relevantIndices = await this.llmService.determineRelevantContext(query, noteContexts);
			logger.debug('[NoteService] Received relevant indices:', relevantIndices);

			const relevantNotes = relevantIndices
				.filter(i => i >= 1 && i <= notes.length) // Extra safety check
				.map(i => notes[i - 1]); // -1 because indices are 1-based in the response

			logger.debug(`[NoteService] Found ${relevantNotes.length} relevant notes`);
			return relevantNotes;
		} catch (error) {
			logger.error('[NoteService] Error searching notes:', error instanceof Error ? error : new Error(String(error)));
			logger.debug('[NoteService] Context:', {
				campaignId: campaign.id,
				query
			});
			if (error instanceof Error) {
				logger.error('[NoteService] Error details:', {
					message: error.message,
					stack: error.stack,
					name: error.name
				});
			}
			throw new Error('Failed to search notes');
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
					notes.push(JSON.parse(content));
				}
			}

			// Load GM notes if user is GM
			if (isGM) {
				const gmNotesDir = this.fileService.getNotePath(campaignId, true);
				const gmNoteFiles = await this.fileService.listFiles(gmNotesDir);

				for (const file of gmNoteFiles) {
					const content = await this.fileService.readFromDirectory(path.join(gmNotesDir, file));
					if (content) {
						notes.push(JSON.parse(content));
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
