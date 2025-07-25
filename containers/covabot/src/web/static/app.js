// Enhanced CovaBot Personality Manager Frontend
class CovaBot {
    constructor() {
        this.apiBase = '/api';
        this.currentEditingNote = null;
        this.currentTab = 'dashboard';
        this.configuration = null;
        this.notes = [];
        this.stats = {};
        this.chatMessages = [];
        this.messageCount = 0;
        this.responseCount = 0;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadConfiguration();
        this.loadNotes();
        this.loadStats();
        this.updateStatus();
        this.showTab('dashboard');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('[data-tab]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.currentTarget.getAttribute('data-tab');
                this.showTab(tab);
            });
        });

        // Configuration form
        const configForm = document.getElementById('configuration-form');
        if (configForm) {
            configForm.addEventListener('submit', (e) => this.handleConfigurationSubmit(e));
        }

        // Personality form
        const personalityForm = document.getElementById('personality-form');
        if (personalityForm) {
            personalityForm.addEventListener('submit', (e) => this.handlePersonalitySubmit(e));
        }

        // Master enable/disable toggle
        const masterToggle = document.getElementById('master-enable');
        if (masterToggle) {
            masterToggle.addEventListener('change', (e) => this.handleMasterToggle(e));
        }

        // Response frequency slider
        const frequencySlider = document.getElementById('response-frequency');
        if (frequencySlider) {
            frequencySlider.addEventListener('input', (e) => this.updateFrequencyDisplay(e.target.value));
        }

        // Quick action buttons
        this.setupQuickActions();

        // Note management
        this.setupNoteManagement();

        // Context refresh
        const refreshContextBtn = document.getElementById('refresh-context-btn');
        if (refreshContextBtn) {
            refreshContextBtn.addEventListener('click', () => this.loadLLMContext());
        }

        // Load from notes button
        const loadFromNotesBtn = document.getElementById('load-from-notes-btn');
        if (loadFromNotesBtn) {
            loadFromNotesBtn.addEventListener('click', () => this.loadPersonalityFromNotes());
        }

        // Reset configuration button
        const resetConfigBtn = document.getElementById('reset-config-btn');
        if (resetConfigBtn) {
            resetConfigBtn.addEventListener('click', () => this.resetConfiguration());
        }
    }

    setupQuickActions() {
        // Toggle bot button
        const toggleBotBtn = document.getElementById('toggle-bot-btn');
        if (toggleBotBtn) {
            toggleBotBtn.addEventListener('click', () => this.toggleBot());
        }

        // Refresh stats button
        const refreshStatsBtn = document.getElementById('refresh-stats-btn');
        if (refreshStatsBtn) {
            refreshStatsBtn.addEventListener('click', () => this.loadStats());
        }

        // Export config button
        const exportConfigBtn = document.getElementById('export-config-btn');
        if (exportConfigBtn) {
            exportConfigBtn.addEventListener('click', () => this.exportConfiguration());
        }

        // Import config button
        const importConfigBtn = document.getElementById('import-config-btn');
        if (importConfigBtn) {
            importConfigBtn.addEventListener('click', () => this.importConfiguration());
        }

        // Chat functionality
        this.setupChatEventListeners();
    }

    setupChatEventListeners() {
        // Chat form submission
        const chatForm = document.getElementById('chat-form');
        if (chatForm) {
            chatForm.addEventListener('submit', (e) => this.handleChatSubmit(e));
        }

        // Clear chat button
        const clearChatBtn = document.getElementById('clear-chat-btn');
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => this.clearChat());
        }

        // Enter key in chat input
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleChatSubmit(e);
                }
            });
        }
    }

    setupNoteManagement() {
        // Add note button
        const addNoteBtn = document.getElementById('add-note-btn');
        if (addNoteBtn) {
            addNoteBtn.addEventListener('click', () => this.openNoteModal());
        }

        // Save note button
        const saveNoteBtn = document.getElementById('save-note-btn');
        if (saveNoteBtn) {
            saveNoteBtn.addEventListener('click', () => this.saveNote());
        }

        // Note filters
        const filterCategory = document.getElementById('filter-category');
        const filterPriority = document.getElementById('filter-priority');
        const filterStatus = document.getElementById('filter-status');
        const searchNotes = document.getElementById('search-notes');

        if (filterCategory) filterCategory.addEventListener('change', () => this.loadNotes());
        if (filterPriority) filterPriority.addEventListener('change', () => this.loadNotes());
        if (filterStatus) filterStatus.addEventListener('change', () => this.loadNotes());
        if (searchNotes) {
            searchNotes.addEventListener('input', () => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => this.loadNotes(), 300);
            });
        }

        // Import file input
        const importFileInput = document.getElementById('import-file-input');
        if (importFileInput) {
            importFileInput.addEventListener('change', (e) => this.handleFileImport(e));
        }
    }

    // Tab management
    showTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;

        // Load tab-specific data
        switch (tabName) {
            case 'dashboard':
                this.loadStats();
                break;
            case 'configuration':
                this.loadConfiguration();
                break;
            case 'personality':
                this.loadConfiguration();
                break;
            case 'notes':
                this.loadNotes();
                this.loadNotesStats();
                break;
            case 'context':
                this.loadLLMContext();
                break;
        }
    }

    // Configuration management
    async loadConfiguration() {
        try {
            const response = await fetch(`${this.apiBase}/configuration`);
            if (response.ok) {
                this.configuration = await response.json();
                this.updateConfigurationUI();
                this.updateStatus();
            } else {
                // Create default configuration if none exists
                await this.createDefaultConfiguration();
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
            this.showToast('Error loading configuration', 'error');
        }
    }

    async createDefaultConfiguration() {
        try {
            const response = await fetch(`${this.apiBase}/configuration`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isEnabled: true,
                    responseFrequency: 25,
                    corePersonality: 'I am CovaBot, a helpful and friendly AI assistant.'
                })
            });
            
            if (response.ok) {
                this.configuration = await response.json();
                this.updateConfigurationUI();
                this.updateStatus();
            }
        } catch (error) {
            console.error('Error creating default configuration:', error);
        }
    }

    updateConfigurationUI() {
        if (!this.configuration) return;

        // Update master toggle
        const masterToggle = document.getElementById('master-enable');
        if (masterToggle) {
            masterToggle.checked = this.configuration.isEnabled;
            this.updateMasterStatusText(this.configuration.isEnabled);
        }

        // Update frequency slider
        const frequencySlider = document.getElementById('response-frequency');
        if (frequencySlider) {
            frequencySlider.value = this.configuration.responseFrequency;
            this.updateFrequencyDisplay(this.configuration.responseFrequency);
        }

        // Update core personality
        const corePersonality = document.getElementById('core-personality');
        if (corePersonality) {
            corePersonality.value = this.configuration.corePersonality;
        }

        // Update dashboard stats
        this.updateDashboardStats();
    }

    updateDashboardStats() {
        if (!this.configuration) return;

        const botStatus = document.getElementById('bot-status');
        const responseRate = document.getElementById('response-rate');
        const powerIcon = document.getElementById('power-icon');

        if (botStatus) {
            botStatus.textContent = this.configuration.isEnabled ? 'Enabled' : 'Disabled';
        }

        if (responseRate) {
            responseRate.textContent = `${this.configuration.responseFrequency}%`;
        }

        if (powerIcon) {
            powerIcon.className = this.configuration.isEnabled 
                ? 'bi bi-power fs-2 text-success'
                : 'bi bi-power fs-2 text-danger';
        }
    }

    updateMasterStatusText(isEnabled) {
        const statusText = document.getElementById('master-status-text');
        if (statusText) {
            statusText.textContent = isEnabled ? 'Bot Enabled' : 'Bot Disabled';
        }
    }

    updateFrequencyDisplay(value) {
        const display = document.getElementById('frequency-display');
        if (display) {
            display.textContent = `${value}%`;
        }
    }

    updateStatus() {
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');

        if (this.configuration && statusIndicator && statusText) {
            if (this.configuration.isEnabled) {
                statusIndicator.className = 'bi bi-circle-fill text-success';
                statusText.textContent = 'Online';
            } else {
                statusIndicator.className = 'bi bi-circle-fill text-danger';
                statusText.textContent = 'Offline';
            }
        }
    }

    // Event handlers
    async handleConfigurationSubmit(e) {
        e.preventDefault();

        const formData = {
            isEnabled: document.getElementById('master-enable').checked,
            responseFrequency: parseInt(document.getElementById('response-frequency').value)
        };

        try {
            const response = await fetch(`${this.apiBase}/configuration`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.configuration = await response.json();
                this.updateConfigurationUI();
                this.updateStatus();
                this.showToast('Configuration saved successfully', 'success');
            } else {
                throw new Error('Failed to save configuration');
            }
        } catch (error) {
            console.error('Error saving configuration:', error);
            this.showToast('Error saving configuration', 'error');
        }
    }

    async handlePersonalitySubmit(e) {
        e.preventDefault();

        const corePersonality = document.getElementById('core-personality').value;

        try {
            const response = await fetch(`${this.apiBase}/configuration`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ corePersonality })
            });

            if (response.ok) {
                this.configuration = await response.json();
                this.showToast('Core personality saved successfully', 'success');
            } else {
                throw new Error('Failed to save personality');
            }
        } catch (error) {
            console.error('Error saving personality:', error);
            this.showToast('Error saving personality', 'error');
        }
    }

    async handleMasterToggle(e) {
        const isEnabled = e.target.checked;

        try {
            const response = await fetch(`${this.apiBase}/configuration`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isEnabled })
            });

            if (response.ok) {
                this.configuration = await response.json();
                this.updateMasterStatusText(isEnabled);
                this.updateDashboardStats();
                this.updateStatus();
                this.showToast(`Bot ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
            } else {
                // Revert toggle if request failed
                e.target.checked = !isEnabled;
                throw new Error('Failed to update bot status');
            }
        } catch (error) {
            console.error('Error toggling bot:', error);
            this.showToast('Error updating bot status', 'error');
        }
    }

    // Quick actions
    async toggleBot() {
        const masterToggle = document.getElementById('master-enable');
        if (masterToggle) {
            masterToggle.checked = !masterToggle.checked;
            masterToggle.dispatchEvent(new Event('change'));
        }
    }

    async resetConfiguration() {
        if (confirm('Are you sure you want to reset all configuration to defaults? This cannot be undone.')) {
            try {
                const response = await fetch(`${this.apiBase}/configuration/reset`, {
                    method: 'POST'
                });

                if (response.ok) {
                    this.configuration = await response.json();
                    this.updateConfigurationUI();
                    this.updateStatus();
                    this.showToast('Configuration reset to defaults', 'success');
                } else {
                    throw new Error('Failed to reset configuration');
                }
            } catch (error) {
                console.error('Error resetting configuration:', error);
                this.showToast('Error resetting configuration', 'error');
            }
        }
    }

    async exportConfiguration() {
        try {
            const response = await fetch(`${this.apiBase}/export`);
            if (response.ok) {
                const data = await response.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `covabot-config-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.showToast('Configuration exported successfully', 'success');
            }
        } catch (error) {
            console.error('Error exporting configuration:', error);
            this.showToast('Error exporting configuration', 'error');
        }
    }

    importConfiguration() {
        document.getElementById('import-file-input').click();
    }

    async handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            const response = await fetch(`${this.apiBase}/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                await this.loadConfiguration();
                await this.loadNotes();
                this.showToast('Configuration imported successfully', 'success');
            } else {
                throw new Error('Failed to import configuration');
            }
        } catch (error) {
            console.error('Error importing configuration:', error);
            this.showToast('Error importing configuration', 'error');
        }

        // Reset file input
        e.target.value = '';
    }

    // Notes management
    async loadNotes() {
        try {
            const filters = this.getFilters();
            const queryString = new URLSearchParams(filters).toString();
            const response = await fetch(`${this.apiBase}/notes?${queryString}`);

            if (response.ok) {
                this.notes = await response.json();
                this.renderNotes(this.notes);
            }
        } catch (error) {
            console.error('Error loading notes:', error);
            this.showToast('Error loading notes', 'error');
        }
    }

    getFilters() {
        const filters = {};

        const category = document.getElementById('filter-category')?.value;
        if (category) filters.category = category;

        const priority = document.getElementById('filter-priority')?.value;
        if (priority) filters.priority = priority;

        const status = document.getElementById('filter-status')?.value;
        if (status) filters.isActive = status;

        const search = document.getElementById('search-notes')?.value;
        if (search) filters.search = search;

        return filters;
    }

    renderNotes(notes) {
        const container = document.getElementById('notes-list');
        if (!container) return;

        if (notes.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-journal-x fs-1 text-muted"></i>
                    <h5 class="mt-3 text-muted">No notes found</h5>
                    <p class="text-muted">Create your first personality note to get started!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notes.map(note => `
            <div class="note-item ${note.isActive ? '' : 'inactive'}">
                <div class="note-header">
                    <div class="note-meta">
                        <span class="badge category-${note.category}">${note.category}</span>
                        <span class="badge priority-${note.priority}">${note.priority}</span>
                        ${note.isActive ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}
                    </div>
                    <div class="note-actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="covaBot.editNote('${note.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-${note.isActive ? 'warning' : 'success'}" onclick="covaBot.toggleNote('${note.id}')">
                            <i class="bi bi-${note.isActive ? 'pause' : 'play'}"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="covaBot.deleteNote('${note.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="note-content">${this.escapeHtml(note.content)}</div>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <small class="text-muted">Created: ${new Date(note.createdAt).toLocaleDateString()}</small>
                    <small class="text-muted">Updated: ${new Date(note.updatedAt).toLocaleDateString()}</small>
                </div>
            </div>
        `).join('');
    }

    openNoteModal(noteId = null) {
        this.currentEditingNote = noteId;
        const modal = new bootstrap.Modal(document.getElementById('noteModal'));
        const title = document.getElementById('noteModalTitle');

        if (noteId) {
            const note = this.notes.find(n => n.id === noteId);
            if (note) {
                title.textContent = 'Edit Note';
                document.getElementById('note-id').value = note.id;
                document.getElementById('note-content').value = note.content;
                document.getElementById('note-category').value = note.category;
                document.getElementById('note-priority').value = note.priority;
            }
        } else {
            title.textContent = 'Add Note';
            document.getElementById('note-form').reset();
            document.getElementById('note-id').value = '';
        }

        modal.show();
    }

    async saveNote() {
        const noteId = document.getElementById('note-id').value;
        const content = document.getElementById('note-content').value;
        const category = document.getElementById('note-category').value;
        const priority = document.getElementById('note-priority').value;

        if (!content.trim()) {
            this.showToast('Note content is required', 'error');
            return;
        }

        const noteData = { content, category, priority };

        try {
            const url = noteId ? `${this.apiBase}/notes/${noteId}` : `${this.apiBase}/notes`;
            const method = noteId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(noteData)
            });

            if (response.ok) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('noteModal'));
                modal.hide();
                await this.loadNotes();
                this.showToast(`Note ${noteId ? 'updated' : 'created'} successfully`, 'success');
            } else {
                throw new Error('Failed to save note');
            }
        } catch (error) {
            console.error('Error saving note:', error);
            this.showToast('Error saving note', 'error');
        }
    }

    editNote(noteId) {
        this.openNoteModal(noteId);
    }

    async toggleNote(noteId) {
        try {
            const response = await fetch(`${this.apiBase}/notes/${noteId}/toggle`, {
                method: 'PUT'
            });

            if (response.ok) {
                await this.loadNotes();
                this.showToast('Note status updated', 'success');
            } else {
                throw new Error('Failed to toggle note');
            }
        } catch (error) {
            console.error('Error toggling note:', error);
            this.showToast('Error updating note status', 'error');
        }
    }

    async deleteNote(noteId) {
        if (confirm('Are you sure you want to delete this note? This cannot be undone.')) {
            try {
                const response = await fetch(`${this.apiBase}/notes/${noteId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    await this.loadNotes();
                    this.showToast('Note deleted successfully', 'success');
                } else {
                    throw new Error('Failed to delete note');
                }
            } catch (error) {
                console.error('Error deleting note:', error);
                this.showToast('Error deleting note', 'error');
            }
        }
    }

    // Stats and context
    async loadStats() {
        try {
            const response = await fetch(`${this.apiBase}/stats`);
            if (response.ok) {
                this.stats = await response.json();
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateStatsDisplay() {
        const totalNotes = document.getElementById('total-notes');
        const activeNotes = document.getElementById('active-notes');

        if (totalNotes) totalNotes.textContent = this.stats.totalNotes || 0;
        if (activeNotes) activeNotes.textContent = this.stats.activeNotes || 0;
    }

    async loadNotesStats() {
        const statsContainer = document.getElementById('notes-stats');
        if (!statsContainer) return;

        const categoryStats = {};
        const priorityStats = {};

        this.notes.forEach(note => {
            categoryStats[note.category] = (categoryStats[note.category] || 0) + 1;
            priorityStats[note.priority] = (priorityStats[note.priority] || 0) + 1;
        });

        const activeCount = this.notes.filter(note => note.isActive).length;
        const inactiveCount = this.notes.length - activeCount;

        statsContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Total Notes:</span>
                <span class="stat-value">${this.notes.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Active:</span>
                <span class="stat-value text-success">${activeCount}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Inactive:</span>
                <span class="stat-value text-muted">${inactiveCount}</span>
            </div>
            <hr>
            <h6>By Category</h6>
            ${Object.entries(categoryStats).map(([category, count]) => `
                <div class="stat-item">
                    <span class="stat-label">${category}:</span>
                    <span class="stat-value">${count}</span>
                </div>
            `).join('')}
            <hr>
            <h6>By Priority</h6>
            ${Object.entries(priorityStats).map(([priority, count]) => `
                <div class="stat-item">
                    <span class="stat-label">${priority}:</span>
                    <span class="stat-value">${count}</span>
                </div>
            `).join('')}
        `;
    }

    async loadLLMContext() {
        try {
            const response = await fetch(`${this.apiBase}/context`);
            if (response.ok) {
                const context = await response.text();
                const contextElement = document.getElementById('llm-context');
                if (contextElement) {
                    contextElement.textContent = context;
                }
            }
        } catch (error) {
            console.error('Error loading LLM context:', error);
            this.showToast('Error loading LLM context', 'error');
        }
    }

    async loadPersonalityFromNotes() {
        const highPriorityPersonalityNotes = this.notes.filter(note =>
            note.category === 'personality' &&
            note.priority === 'high' &&
            note.isActive
        );

        if (highPriorityPersonalityNotes.length === 0) {
            this.showToast('No high-priority personality notes found', 'warning');
            return;
        }

        const combinedPersonality = highPriorityPersonalityNotes
            .map(note => note.content)
            .join(' ');

        const corePersonality = document.getElementById('core-personality');
        if (corePersonality) {
            corePersonality.value = combinedPersonality;
            this.showToast('Personality loaded from high-priority notes', 'success');
        }
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');

        if (toast && toastMessage) {
            toastMessage.textContent = message;

            // Update toast header icon based on type
            const toastHeader = toast.querySelector('.toast-header i');
            if (toastHeader) {
                toastHeader.className = `bi bi-${this.getToastIcon(type)} text-${this.getToastColor(type)} me-2`;
            }

            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();
        }
    }

    getToastIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-triangle';
            case 'warning': return 'exclamation-circle';
            default: return 'info-circle';
        }
    }

    getToastColor(type) {
        switch (type) {
            case 'success': return 'success';
            case 'error': return 'danger';
            case 'warning': return 'warning';
            default: return 'primary';
        }
    }

    // Chat functionality
    async handleChatSubmit(e) {
        e.preventDefault();

        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const message = chatInput.value.trim();

        if (!message) return;

        // Disable input while processing
        chatInput.disabled = true;
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Sending...';

        try {
            // Add user message to chat
            this.addChatMessage(message, 'user');
            this.messageCount++;
            this.updateChatStats();

            // Clear input
            chatInput.value = '';

            // Send to API
            const response = await fetch(`${this.apiBase}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message })
            });

            const data = await response.json();

            if (data.success && data.data.botResponse) {
                // Add bot response to chat
                this.addChatMessage(data.data.botResponse, 'bot');
                this.responseCount++;
            } else if (data.success && !data.data.botResponse) {
                // Bot chose not to respond
                this.addChatMessage('*CovaBot chose not to respond*', 'system');
            } else {
                throw new Error(data.error || 'Failed to get response');
            }

        } catch (error) {
            console.error('Chat error:', error);
            this.addChatMessage('*Error: Failed to get response from CovaBot*', 'error');
            this.showToast('Failed to send message', 'error');
        } finally {
            // Re-enable input
            chatInput.disabled = false;
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="bi bi-send"></i> Send';
            chatInput.focus();
            this.updateChatStats();
        }
    }

    addChatMessage(content, type) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `mb-3 ${type === 'user' ? 'text-end' : ''}`;

        const timestamp = new Date().toLocaleTimeString();

        let messageClass, icon, sender;
        switch (type) {
            case 'user':
                messageClass = 'bg-primary text-white';
                icon = 'person-fill';
                sender = 'You';
                break;
            case 'bot':
                messageClass = 'bg-light border';
                icon = 'robot';
                sender = 'CovaBot';
                break;
            case 'system':
                messageClass = 'bg-warning bg-opacity-25 border-warning';
                icon = 'info-circle';
                sender = 'System';
                break;
            case 'error':
                messageClass = 'bg-danger bg-opacity-25 border-danger';
                icon = 'exclamation-triangle';
                sender = 'Error';
                break;
        }

        messageDiv.innerHTML = `
            <div class="d-inline-block p-3 rounded ${messageClass}" style="max-width: 80%;">
                <div class="d-flex align-items-center mb-1">
                    <i class="bi bi-${icon} me-2"></i>
                    <small class="fw-bold">${sender}</small>
                    <small class="ms-auto opacity-75">${timestamp}</small>
                </div>
                <div>${this.escapeHtml(content)}</div>
            </div>
        `;

        // Remove empty state if it exists
        const emptyState = chatMessages.querySelector('.text-center.text-muted');
        if (emptyState) {
            emptyState.remove();
        }

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Store message
        this.chatMessages.push({
            content,
            type,
            timestamp: new Date().toISOString()
        });
    }

    clearChat() {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-chat-square-text fs-1"></i>
                <p class="mt-2">Start a conversation with CovaBot!</p>
                <small>Type a message below to test the bot's responses</small>
            </div>
        `;

        this.chatMessages = [];
        this.messageCount = 0;
        this.responseCount = 0;
        this.updateChatStats();

        this.showToast('Chat cleared', 'success');
    }

    updateChatStats() {
        const messageCountEl = document.getElementById('message-count');
        const responseCountEl = document.getElementById('response-count');

        if (messageCountEl) messageCountEl.textContent = this.messageCount;
        if (responseCountEl) responseCountEl.textContent = this.responseCount;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application
const covaBot = new CovaBot();
