// CovaBot Personality Manager Frontend
class PersonalityManager {
    constructor() {
        this.apiBase = '/api';
        this.currentEditingNote = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadNotes();
        this.loadStats();
        this.checkDatabaseStatus();
    }

    setupEventListeners() {
        // Modal controls
        document.getElementById('add-note-btn').addEventListener('click', () => this.openModal());
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('cancel-btn').addEventListener('click', () => this.closeModal());
        
        // Form submission
        document.getElementById('note-form').addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Filters and search
        document.getElementById('category-filter').addEventListener('change', () => this.loadNotes());
        document.getElementById('priority-filter').addEventListener('change', () => this.loadNotes());
        document.getElementById('status-filter').addEventListener('change', () => this.loadNotes());
        document.getElementById('search-input').addEventListener('input', () => this.debounceSearch());
        
        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadNotes();
            this.loadStats();
        });
        
        // Context preview
        document.getElementById('preview-context-btn').addEventListener('click', () => this.toggleContextPreview());

        // Import/Export functionality
        document.getElementById('import-btn').addEventListener('click', () => this.importNotes());
        document.getElementById('export-btn').addEventListener('click', () => this.exportNotes());

        // Close modal when clicking outside
        document.getElementById('note-modal').addEventListener('click', (e) => {
            if (e.target.id === 'note-modal') {
                this.closeModal();
            }
        });
    }

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.loadNotes(), 300);
    }

    async apiCall(endpoint, options = {}) {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBase}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }
            
            return data;
        } catch (error) {
            this.showToast(error.message, 'error');
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    async loadNotes() {
        try {
            const filters = this.getFilters();
            const queryString = new URLSearchParams(filters).toString();
            const response = await this.apiCall(`/notes?${queryString}`);
            this.renderNotes(response.data);
        } catch (error) {
            console.error('Failed to load notes:', error);
        }
    }

    async loadStats() {
        try {
            const response = await this.apiCall('/stats');
            this.renderStats(response.data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    getFilters() {
        const filters = {};
        
        const category = document.getElementById('category-filter').value;
        if (category) filters.category = category;
        
        const priority = document.getElementById('priority-filter').value;
        if (priority) filters.priority = priority;
        
        const status = document.getElementById('status-filter').value;
        if (status) filters.isActive = status;
        
        const search = document.getElementById('search-input').value.trim();
        if (search) filters.search = search;
        
        return filters;
    }

    renderStats(stats) {
        document.getElementById('total-notes').textContent = stats.total;
        document.getElementById('active-notes').textContent = stats.active;
        
        // Update stats content with category breakdown
        const statsContent = document.getElementById('stats-content');
        
        // Clear existing category stats
        const existingCategories = statsContent.querySelectorAll('.category-stat');
        existingCategories.forEach(el => el.remove());
        
        // Add category breakdown
        Object.entries(stats.byCategory).forEach(([category, count]) => {
            const statItem = document.createElement('div');
            statItem.className = 'stat-item category-stat';
            statItem.innerHTML = `
                <span class="stat-label">${this.capitalize(category)}:</span>
                <span class="stat-value">${count}</span>
            `;
            statsContent.appendChild(statItem);
        });
    }

    renderNotes(notes) {
        const container = document.getElementById('notes-list');
        
        if (notes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No notes found</h3>
                    <p>Add some personality instructions to get started!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = notes.map(note => this.createNoteCard(note)).join('');
        
        // Add event listeners for note actions
        container.querySelectorAll('.edit-note').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = e.target.dataset.noteId;
                this.editNote(noteId);
            });
        });
        
        container.querySelectorAll('.delete-note').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = e.target.dataset.noteId;
                this.deleteNote(noteId);
            });
        });
        
        container.querySelectorAll('.toggle-note').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = e.target.dataset.noteId;
                const isActive = e.target.dataset.isActive === 'true';
                this.toggleNote(noteId, !isActive);
            });
        });
    }

    createNoteCard(note) {
        const createdDate = new Date(note.createdAt).toLocaleDateString();
        const updatedDate = new Date(note.updatedAt).toLocaleDateString();
        
        return `
            <div class="note-card ${!note.isActive ? 'inactive' : ''}">
                <div class="note-header">
                    <div class="note-meta">
                        <span class="category-badge category-${note.category}">${note.category}</span>
                        <span class="priority-badge priority-${note.priority}">${note.priority}</span>
                        ${!note.isActive ? '<span class="priority-badge priority-low">inactive</span>' : ''}
                    </div>
                    <div class="note-actions">
                        <button class="btn btn-small btn-secondary edit-note" data-note-id="${note.id}">✏️ Edit</button>
                        <button class="btn btn-small btn-warning toggle-note" 
                                data-note-id="${note.id}" 
                                data-is-active="${note.isActive}">
                            ${note.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                        </button>
                        <button class="btn btn-small btn-danger delete-note" data-note-id="${note.id}">🗑️ Delete</button>
                    </div>
                </div>
                <div class="note-content">${this.escapeHtml(note.content)}</div>
                <div class="note-footer">
                    <span>Created: ${createdDate}</span>
                    <span>Updated: ${updatedDate}</span>
                </div>
            </div>
        `;
    }

    openModal(note = null) {
        this.currentEditingNote = note;
        const modal = document.getElementById('note-modal');
        const title = document.getElementById('modal-title');
        const activeToggle = document.getElementById('active-toggle-group');
        
        if (note) {
            title.textContent = 'Edit Note';
            document.getElementById('note-content').value = note.content;
            document.getElementById('note-category').value = note.category;
            document.getElementById('note-priority').value = note.priority;
            document.getElementById('note-active').checked = note.isActive;
            activeToggle.style.display = 'block';
        } else {
            title.textContent = 'Add New Note';
            document.getElementById('note-form').reset();
            activeToggle.style.display = 'none';
        }
        
        modal.style.display = 'flex';
        document.getElementById('note-content').focus();
    }

    closeModal() {
        document.getElementById('note-modal').style.display = 'none';
        this.currentEditingNote = null;
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = {
            content: document.getElementById('note-content').value.trim(),
            category: document.getElementById('note-category').value,
            priority: document.getElementById('note-priority').value
        };
        
        if (!formData.content) {
            this.showToast('Content is required', 'error');
            return;
        }
        
        if (!formData.category) {
            this.showToast('Category is required', 'error');
            return;
        }
        
        try {
            if (this.currentEditingNote) {
                // Update existing note
                formData.isActive = document.getElementById('note-active').checked;
                await this.apiCall(`/notes/${this.currentEditingNote.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
                this.showToast('Note updated successfully', 'success');
            } else {
                // Create new note
                await this.apiCall('/notes', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                this.showToast('Note created successfully', 'success');
            }
            
            this.closeModal();
            this.loadNotes();
            this.loadStats();
        } catch (error) {
            console.error('Failed to save note:', error);
        }
    }

    async editNote(noteId) {
        try {
            const response = await this.apiCall(`/notes/${noteId}`);
            this.openModal(response.data);
        } catch (error) {
            console.error('Failed to load note for editing:', error);
        }
    }

    async deleteNote(noteId) {
        if (!confirm('Are you sure you want to delete this note?')) {
            return;
        }
        
        try {
            await this.apiCall(`/notes/${noteId}`, { method: 'DELETE' });
            this.showToast('Note deleted successfully', 'success');
            this.loadNotes();
            this.loadStats();
        } catch (error) {
            console.error('Failed to delete note:', error);
        }
    }

    async toggleNote(noteId, isActive) {
        try {
            await this.apiCall(`/notes/${noteId}`, {
                method: 'PUT',
                body: JSON.stringify({ isActive })
            });
            this.showToast(`Note ${isActive ? 'activated' : 'deactivated'} successfully`, 'success');
            this.loadNotes();
            this.loadStats();
        } catch (error) {
            console.error('Failed to toggle note:', error);
        }
    }

    async toggleContextPreview() {
        const contextContent = document.getElementById('context-content');
        const button = document.getElementById('preview-context-btn');
        
        if (contextContent.style.display === 'none') {
            try {
                const response = await this.apiCall('/context');
                contextContent.textContent = response.data.context || 'No active notes to display';
                contextContent.style.display = 'block';
                button.textContent = 'Hide Context';
            } catch (error) {
                console.error('Failed to load context:', error);
            }
        } else {
            contextContent.style.display = 'none';
            button.textContent = 'View Current Context';
        }
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'flex' : 'none';
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        toast.innerHTML = `
            ${message}
            <span class="toast-close">&times;</span>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
        
        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    async checkDatabaseStatus() {
        try {
            const response = await this.apiCall('/health');
            document.getElementById('db-status').innerHTML = '✅ Connected';

            // Update system info
            document.getElementById('storage-type').innerHTML =
                response.data.storage === 'database' ? '🗄️ Database' : '📁 File';
            document.getElementById('api-status').innerHTML = '✅ Online';
            document.getElementById('last-updated').innerHTML =
                new Date().toLocaleTimeString();
        } catch (error) {
            document.getElementById('db-status').innerHTML = '❌ Error';
            document.getElementById('api-status').innerHTML = '❌ Offline';
        }
    }

    async exportNotes() {
        try {
            const response = await this.apiCall('/notes');
            const notes = response.data;

            const dataStr = JSON.stringify(notes, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `covabot-personality-notes-${new Date().toISOString().split('T')[0]}.json`;
            link.click();

            this.showToast('Notes exported successfully', 'success');
        } catch (error) {
            console.error('Failed to export notes:', error);
        }
    }

    async importNotes() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const notes = JSON.parse(text);

                if (!Array.isArray(notes)) {
                    throw new Error('Invalid file format');
                }

                let imported = 0;
                for (const note of notes) {
                    if (note.content && note.category) {
                        try {
                            await this.apiCall('/notes', {
                                method: 'POST',
                                body: JSON.stringify({
                                    content: note.content,
                                    category: note.category,
                                    priority: note.priority || 'medium'
                                })
                            });
                            imported++;
                        } catch (error) {
                            console.warn('Failed to import note:', note, error);
                        }
                    }
                }

                this.showToast(`Imported ${imported} notes successfully`, 'success');
                this.loadNotes();
                this.loadStats();
            } catch (error) {
                this.showToast('Failed to import notes: ' + error.message, 'error');
            }
        };

        input.click();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PersonalityManager();
});