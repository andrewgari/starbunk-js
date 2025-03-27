import path from 'path';
import { Campaign } from '../../domain/models';
import { logger } from '../../services/logger';
import { Note } from '../types/game';
import { GameLLMService } from './llmService';

export class NoteService {
	private static instance: NoteService;
	private llmService: GameLLMService;
	private notesDir: string;

	private constructor() {
		this.llmService = GameLLMService.getInstance();
		this.notesDir = process.env.NOTES_DIR || path.join(process.cwd(), 'data', 'notes');
	}

	public static getInstance(): NoteService {
		if (!NoteService.instance) {
			NoteService.instance = new NoteService();
		}
		return NoteService.instance;
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
			// Load notes from storage
			const notes = await this.loadNotes(campaignId);

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
		// TODO: Implement note storage
		logger.info('[NoteService] Note saved successfully');
	}

	private async loadNotes(campaignId: string): Promise<Note[]> {
		logger.debug('[NoteService] Loading notes from storage...', { campaignId });
		// TODO: Implement note loading
		logger.debug('[NoteService] No notes found in storage (not implemented)');
		return [];
	}
}
