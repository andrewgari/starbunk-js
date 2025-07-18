import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@starbunk/shared';
import { PersonalityNote, CreateNoteRequest, UpdateNoteRequest, NoteSearchFilters } from '../types/personalityNote';

// Cache the BotConfigurationService import to avoid repeated dynamic imports
let BotConfigurationService: typeof import('./botConfigurationService').BotConfigurationService | undefined;

export class PersonalityNotesService {
  private static instance: PersonalityNotesService;
  private notesFilePath: string;
  private notes: PersonalityNote[] = [];
  private isLoaded = false;

  constructor() {
    // Use configurable data directory for Docker/Unraid compatibility
    const dataDir = process.env.COVABOT_DATA_DIR || path.join(process.cwd(), 'data');
    this.notesFilePath = path.join(dataDir, 'personality-notes.json');

    logger.info(`[PersonalityNotes] Using data directory: ${dataDir}`);
    logger.info(`[PersonalityNotes] Notes file path: ${this.notesFilePath}`);
  }

  static getInstance(): PersonalityNotesService {
    if (!PersonalityNotesService.instance) {
      PersonalityNotesService.instance = new PersonalityNotesService();
    }
    return PersonalityNotesService.instance;
  }

  /**
   * Ensure data directory exists
   */
  private async ensureDataDirectory(): Promise<void> {
    const dataDir = path.dirname(this.notesFilePath);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
      logger.info(`[PersonalityNotes] Created data directory: ${dataDir}`);
    }
  }

  /**
   * Load notes from disk
   */
  async loadNotes(): Promise<void> {
    try {
      await this.ensureDataDirectory();
      
      try {
        const data = await fs.readFile(this.notesFilePath, 'utf-8');
        const parsed = JSON.parse(data);
        
        // Validate and convert dates
        this.notes = parsed.map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt)
        }));
        
        logger.info(`[PersonalityNotes] Loaded ${this.notes.length} notes from disk`);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          // File doesn't exist, start with empty notes
          this.notes = [];
          logger.info(`[PersonalityNotes] No existing notes file, starting fresh`);
        } else {
          throw error;
        }
      }
      
      this.isLoaded = true;
    } catch (error) {
      logger.error(`[PersonalityNotes] Failed to load notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Save notes to disk
   */
  private async saveNotes(): Promise<void> {
    try {
      await this.ensureDataDirectory();
      await fs.writeFile(this.notesFilePath, JSON.stringify(this.notes, null, 2), 'utf-8');
      logger.debug(`[PersonalityNotes] Saved ${this.notes.length} notes to disk`);
    } catch (error) {
      logger.error(`[PersonalityNotes] Failed to save notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Tokenize note content for LLM processing
   */
  private tokenizeContent(content: string): string[] {
    // Simple tokenization - split by sentences and key phrases
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    // Combine sentences and meaningful words
    return [...sentences.map(s => s.trim()), ...words];
  }

  /**
   * Ensure notes are loaded
   */
  private async ensureLoaded(): Promise<void> {
    if (!this.isLoaded) {
      await this.loadNotes();
    }
  }

  /**
   * Get all notes with optional filtering
   */
  async getNotes(filters: NoteSearchFilters = {}): Promise<PersonalityNote[]> {
    await this.ensureLoaded();
    
    let filtered = [...this.notes];
    
    if (filters.category) {
      filtered = filtered.filter(note => note.category === filters.category);
    }
    
    if (filters.priority) {
      filtered = filtered.filter(note => note.priority === filters.priority);
    }
    
    if (filters.isActive !== undefined) {
      filtered = filtered.filter(note => note.isActive === filters.isActive);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(note => 
        note.content.toLowerCase().includes(searchLower) ||
        note.tokens?.some(token => token.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort by priority (high -> medium -> low) and then by updated date
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return filtered.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }

  /**
   * Get note by ID
   */
  async getNoteById(id: string): Promise<PersonalityNote | null> {
    await this.ensureLoaded();
    return this.notes.find(note => note.id === id) || null;
  }

  /**
   * Create a new note
   */
  async createNote(request: CreateNoteRequest): Promise<PersonalityNote> {
    await this.ensureLoaded();
    
    const now = new Date();
    const note: PersonalityNote = {
      id: uuidv4(),
      content: request.content.trim(),
      category: request.category,
      priority: request.priority || 'medium',
      isActive: true,
      tokens: this.tokenizeContent(request.content),
      createdAt: now,
      updatedAt: now
    };
    
    this.notes.push(note);
    await this.saveNotes();
    
    logger.info(`[PersonalityNotes] Created note: ${note.id} (${note.category})`);
    return note;
  }

  /**
   * Update an existing note
   */
  async updateNote(id: string, request: UpdateNoteRequest): Promise<PersonalityNote | null> {
    await this.ensureLoaded();
    
    const noteIndex = this.notes.findIndex(note => note.id === id);
    if (noteIndex === -1) {
      return null;
    }
    
    const note = this.notes[noteIndex];
    const now = new Date();
    
    // Update fields
    if (request.content !== undefined) {
      note.content = request.content.trim();
      note.tokens = this.tokenizeContent(note.content);
    }
    if (request.category !== undefined) {
      note.category = request.category;
    }
    if (request.priority !== undefined) {
      note.priority = request.priority;
    }
    if (request.isActive !== undefined) {
      note.isActive = request.isActive;
    }
    
    note.updatedAt = now;
    
    await this.saveNotes();
    
    logger.info(`[PersonalityNotes] Updated note: ${note.id}`);
    return note;
  }

  /**
   * Delete a note
   */
  async deleteNote(id: string): Promise<boolean> {
    await this.ensureLoaded();
    
    const initialLength = this.notes.length;
    this.notes = this.notes.filter(note => note.id !== id);
    
    if (this.notes.length < initialLength) {
      await this.saveNotes();
      logger.info(`[PersonalityNotes] Deleted note: ${id}`);
      return true;
    }
    
    return false;
  }

  /**
   * Get active notes for LLM context (formatted for prompt inclusion)
   */
  async getActiveNotesForLLM(): Promise<string> {
    // Get configuration service for core personality
    try {
      if (!BotConfigurationService) {
        const module = await import('./botConfigurationService');
        BotConfigurationService = module.BotConfigurationService;
      }
      const configService = BotConfigurationService.getInstance();
      const config = await configService.getConfiguration();

      let contextString = 'CORE PERSONALITY:\n';
      contextString += `${config.corePersonality}\n\n`;

      const activeNotes = await this.getNotes({ isActive: true });

      if (activeNotes.length > 0) {
        // Group notes by category and priority
        const notesByCategory = activeNotes.reduce((acc, note) => {
          if (!acc[note.category]) {
            acc[note.category] = [];
          }
          acc[note.category].push(note);
          return acc;
        }, {} as Record<string, PersonalityNote[]>);

        contextString += 'DETAILED INSTRUCTIONS:\n\n';

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
      }

      return contextString.trim();
    } catch (error) {
      logger.error(`[PersonalityNotes] Error getting configuration for LLM context: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Fallback to notes-only context
      const activeNotes = await this.getNotes({ isActive: true });

      if (activeNotes.length === 0) {
        return 'No active personality configuration.';
      }

      let contextString = 'PERSONALITY INSTRUCTIONS:\n\n';

      for (const note of activeNotes) {
        const priorityPrefix = note.priority === 'high' ? '[IMPORTANT] ' : '';
        contextString += `- ${priorityPrefix}${note.content}\n`;
      }

      return contextString.trim();
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
    await this.ensureLoaded();
    
    const active = this.notes.filter(note => note.isActive);
    const byCategory = this.notes.reduce((acc, note) => {
      acc[note.category] = (acc[note.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byPriority = this.notes.reduce((acc, note) => {
      acc[note.priority] = (acc[note.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: this.notes.length,
      active: active.length,
      byCategory,
      byPriority
    };
  }
}