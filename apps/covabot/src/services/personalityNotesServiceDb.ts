import { PrismaClient } from '@prisma/client';
import { logger } from '@starbunk/shared';
import { PersonalityNote, CreateNoteRequest, UpdateNoteRequest, NoteSearchFilters } from '../types/personalityNote';

/**
 * Database-backed personality notes service for CovaBot
 * Provides CRUD operations for managing personality instructions and context
 */
export class PersonalityNotesServiceDb {
	private static instance: PersonalityNotesServiceDb;
	private prisma: PrismaClient;

	constructor() {
		this.prisma = new PrismaClient();
	}

	static getInstance(): PersonalityNotesServiceDb {
		if (!PersonalityNotesServiceDb.instance) {
			PersonalityNotesServiceDb.instance = new PersonalityNotesServiceDb();
		}
		return PersonalityNotesServiceDb.instance;
	}

	/**
	 * Initialize the service and ensure database connection
	 */
	async initialize(): Promise<void> {
		try {
			await this.prisma.$connect();
			logger.info('[PersonalityNotesDb] Database connection established');
		} catch (error) {
			logger.error(
				`[PersonalityNotesDb] Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
			throw error;
		}
	}

	/**
	 * Tokenize note content for LLM processing
	 */
	private tokenizeContent(content: string): string[] {
		// Simple tokenization - split by sentences and key phrases
		const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
		const words = content
			.toLowerCase()
			.split(/\s+/)
			.filter((w) => w.length > 2);

		// Combine sentences and meaningful words
		return [...sentences.map((s) => s.trim()), ...words];
	}

	/**
	 * Get all notes with optional filtering
	 */
	async getNotes(filters: NoteSearchFilters = {}): Promise<PersonalityNote[]> {
		try {
			const where: any = {};

			if (filters.category) {
				where.category = filters.category;
			}

			if (filters.priority) {
				where.priority = filters.priority;
			}

			if (filters.isActive !== undefined) {
				where.isActive = filters.isActive;
			}

			if (filters.search) {
				where.content = {
					contains: filters.search,
					mode: 'insensitive',
				};
			}

			const dbNotes = await this.prisma.personalityNote.findMany({
				where,
				orderBy: [
					{ priority: 'desc' }, // High priority first
					{ updatedAt: 'desc' },
				],
			});

			// Convert database records to our PersonalityNote type
			return dbNotes.map((note) => ({
				id: note.id,
				content: note.content,
				category: note.category as PersonalityNote['category'],
				priority: note.priority as PersonalityNote['priority'],
				isActive: note.isActive,
				tokens: Array.isArray(note.tokens) ? (note.tokens as string[]) : undefined,
				createdAt: note.createdAt,
				updatedAt: note.updatedAt,
			}));
		} catch (error) {
			logger.error('[PersonalityNotesDb] Failed to get notes:', error);
			throw error;
		}
	}

	/**
	 * Get note by ID
	 */
	async getNoteById(id: string): Promise<PersonalityNote | null> {
		try {
			const note = await this.prisma.personalityNote.findUnique({
				where: { id },
			});

			if (!note) {
				return null;
			}

			return {
				id: note.id,
				content: note.content,
				category: note.category as PersonalityNote['category'],
				priority: note.priority as PersonalityNote['priority'],
				isActive: note.isActive,
				tokens: Array.isArray(note.tokens) ? (note.tokens as string[]) : undefined,
				createdAt: note.createdAt,
				updatedAt: note.updatedAt,
			};
		} catch (error) {
			logger.error('[PersonalityNotesDb] Failed to get note by ID:', error);
			throw error;
		}
	}

	/**
	 * Create a new note
	 */
	async createNote(request: CreateNoteRequest): Promise<PersonalityNote> {
		try {
			const tokens = this.tokenizeContent(request.content);

			const note = await this.prisma.personalityNote.create({
				data: {
					content: request.content.trim(),
					category: request.category,
					priority: request.priority || 'medium',
					isActive: true,
					tokens: tokens,
				},
			});

			logger.info(`[PersonalityNotesDb] Created note: ${note.id} (${note.category})`);

			return {
				id: note.id,
				content: note.content,
				category: note.category as PersonalityNote['category'],
				priority: note.priority as PersonalityNote['priority'],
				isActive: note.isActive,
				tokens: Array.isArray(note.tokens) ? (note.tokens as string[]) : undefined,
				createdAt: note.createdAt,
				updatedAt: note.updatedAt,
			};
		} catch (error) {
			logger.error('[PersonalityNotesDb] Failed to create note:', error);
			throw error;
		}
	}

	/**
	 * Update an existing note
	 */
	async updateNote(id: string, request: UpdateNoteRequest): Promise<PersonalityNote | null> {
		try {
			const updateData: any = {};

			if (request.content !== undefined) {
				updateData.content = request.content.trim();
				updateData.tokens = this.tokenizeContent(request.content);
			}
			if (request.category !== undefined) {
				updateData.category = request.category;
			}
			if (request.priority !== undefined) {
				updateData.priority = request.priority;
			}
			if (request.isActive !== undefined) {
				updateData.isActive = request.isActive;
			}

			const note = await this.prisma.personalityNote.update({
				where: { id },
				data: updateData,
			});

			logger.info(`[PersonalityNotesDb] Updated note: ${note.id}`);

			return {
				id: note.id,
				content: note.content,
				category: note.category as PersonalityNote['category'],
				priority: note.priority as PersonalityNote['priority'],
				isActive: note.isActive,
				tokens: Array.isArray(note.tokens) ? (note.tokens as string[]) : undefined,
				createdAt: note.createdAt,
				updatedAt: note.updatedAt,
			};
		} catch (error) {
			if (error instanceof Error && 'code' in error && error.code === 'P2025') {
				// Record not found
				return null;
			}
			logger.error('[PersonalityNotesDb] Failed to update note:', error);
			throw error;
		}
	}

	/**
	 * Delete a note
	 */
	async deleteNote(id: string): Promise<boolean> {
		try {
			await this.prisma.personalityNote.delete({
				where: { id },
			});

			logger.info(`[PersonalityNotesDb] Deleted note: ${id}`);
			return true;
		} catch (error) {
			if (error instanceof Error && 'code' in error && error.code === 'P2025') {
				// Record not found
				return false;
			}
			logger.error('[PersonalityNotesDb] Failed to delete note:', error);
			throw error;
		}
	}

	/**
	 * Get active notes for LLM context (formatted for prompt inclusion)
	 */
	async getActiveNotesForLLM(): Promise<string> {
		try {
			const activeNotes = await this.getNotes({ isActive: true });

			if (activeNotes.length === 0) {
				return '';
			}

			// Group notes by category and priority
			const notesByCategory = activeNotes.reduce(
				(acc, note) => {
					if (!acc[note.category]) {
						acc[note.category] = [];
					}
					acc[note.category].push(note);
					return acc;
				},
				{} as Record<string, PersonalityNote[]>,
			);

			let contextString = 'Current personality instructions and context:\n\n';

			// Add notes by category in priority order
			const categoryOrder = ['instruction', 'personality', 'behavior', 'context', 'knowledge'];

			for (const category of categoryOrder) {
				if (notesByCategory[category]) {
					contextString += `${category.charAt(0).toUpperCase() + category.slice(1)}:\n`;
					for (const note of notesByCategory[category]) {
						const priorityPrefix = note.priority === 'high' ? '[IMPORTANT] ' : '';
						contextString += `- ${priorityPrefix}${note.content}\n`;
					}
					contextString += '\n';
				}
			}

			return contextString.trim();
		} catch (error) {
			logger.error('[PersonalityNotesDb] Failed to get active notes for LLM:', error);
			return '';
		}
	}

	/**
	 * Get statistics about notes
	 */
	async getStats(): Promise<{
		total: number;
		active: number;
		byCategory: Record<string, number>;
		byPriority: Record<string, number>;
	}> {
		try {
			const [total, active, categoryStats, priorityStats] = await Promise.all([
				this.prisma.personalityNote.count(),
				this.prisma.personalityNote.count({ where: { isActive: true } }),
				this.prisma.personalityNote.groupBy({
					by: ['category'],
					_count: { category: true },
				}),
				this.prisma.personalityNote.groupBy({
					by: ['priority'],
					_count: { priority: true },
				}),
			]);

			const byCategory = categoryStats.reduce(
				(acc, stat) => {
					acc[stat.category] = stat._count.category;
					return acc;
				},
				{} as Record<string, number>,
			);

			const byPriority = priorityStats.reduce(
				(acc, stat) => {
					acc[stat.priority] = stat._count.priority;
					return acc;
				},
				{} as Record<string, number>,
			);

			return {
				total,
				active,
				byCategory,
				byPriority,
			};
		} catch (error) {
			logger.error('[PersonalityNotesDb] Failed to get stats:', error);
			throw error;
		}
	}

	/**
	 * Clean up database connection
	 */
	async disconnect(): Promise<void> {
		await this.prisma.$disconnect();
	}
}
