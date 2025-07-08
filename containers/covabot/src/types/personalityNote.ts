export interface PersonalityNote {
  id: string;
  content: string;
  category: 'instruction' | 'personality' | 'behavior' | 'knowledge' | 'context';
  priority: 'high' | 'medium' | 'low';
  isActive: boolean;
  tokens?: string[]; // Tokenized content for LLM processing
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNoteRequest {
  content: string;
  category: PersonalityNote['category'];
  priority?: PersonalityNote['priority'];
}

export interface UpdateNoteRequest {
  content?: string;
  category?: PersonalityNote['category'];
  priority?: PersonalityNote['priority'];
  isActive?: boolean;
}

export interface NoteSearchFilters {
  category?: PersonalityNote['category'];
  priority?: PersonalityNote['priority'];
  isActive?: boolean;
  search?: string;
}