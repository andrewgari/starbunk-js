# 🦙 Ollama Document Assistant

A powerful Discord bot that provides AI-powered document analysis and question-answering using Ollama's local LLM capabilities.

## ✨ Features

- **📄 Document Processing**: Upload and process PDF, DOCX, TXT, and Markdown files
- **🔍 Semantic Search**: Search through documents using natural language queries
- **🤖 AI Q&A**: Ask questions about your documents and get intelligent answers
- **🔐 Role-based Access**: Configurable role-based permissions for uploads and usage
- **🦙 Local AI**: Uses Ollama for privacy-focused, local LLM processing
- **📊 Document Management**: List, view, and delete uploaded documents
- **⚡ Real-time Processing**: Fast document analysis with progress feedback

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Discord Bot Token
- Ollama installed and running locally
- Required Ollama models (e.g., `llama2`, `nomic-embed-text`)

### Installation

1. **Clone and setup:**
   ```bash
   cd containers/ollama-docs
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Discord token and settings
   ```

3. **Start Ollama:**
   ```bash
   # Install required models
   ollama pull llama2
   ollama pull nomic-embed-text  # For embeddings (optional)
   
   # Start Ollama service
   ollama serve
   ```

4. **Run the bot:**
   ```bash
   npm run dev
   ```

## 🎯 Discord Commands

### `/docs upload`
Upload a document for AI processing.
- **Parameters**: `file` (PDF, DOCX, TXT, MD)
- **Permissions**: Admin, Moderator roles
- **Example**: `/docs upload file:my-document.pdf`

### `/docs search`
Search through uploaded documents.
- **Parameters**: `query` (search terms), `limit` (optional, max results)
- **Example**: `/docs search query:machine learning limit:3`

### `/docs ask`
Ask a question about the documents.
- **Parameters**: `question` (your question)
- **Example**: `/docs ask question:What are the key benefits mentioned?`

### `/docs list`
List all uploaded documents.
- **Example**: `/docs list`

### `/docs delete`
Delete a document by ID.
- **Parameters**: `document_id`
- **Permissions**: Admin, Moderator roles
- **Example**: `/docs delete document_id:doc_123456`

### `/docs status`
Check Ollama service status and available models.
- **Example**: `/docs status`

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Discord bot token | Required |
| `CLIENT_ID` | Discord application client ID | Required |
| `GUILD_ID` | Guild ID for development | Optional |
| `OLLAMA_URL` | Ollama service URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Default LLM model | `llama2` |
| `ALLOWED_ROLES` | Roles that can use the bot | `admin,moderator,document-user` |
| `UPLOAD_ROLES` | Roles that can upload documents | `admin,moderator` |

### Role-based Access Control

The bot supports flexible role-based permissions:

- **ALLOWED_ROLES**: Users with these roles can use search and ask commands
- **UPLOAD_ROLES**: Users with these roles can upload and delete documents

Role matching is case-insensitive and supports partial matches.

### Supported File Types

- **PDF**: `.pdf` files
- **Word Documents**: `.docx` files  
- **Text Files**: `.txt` files
- **Markdown**: `.md` files

Maximum file size: 10MB (configurable)

## 🐳 Docker Deployment

### Build the container:
```bash
docker build -t ollama-docs .
```

### Run with Docker Compose:
```yaml
version: '3.8'
services:
  ollama-docs:
    build: .
    environment:
      - DISCORD_TOKEN=your-token
      - CLIENT_ID=your-client-id
      - OLLAMA_URL=http://ollama:11434
    volumes:
      - ./data:/app/data
    depends_on:
      - ollama
      
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
      
volumes:
  ollama_data:
```

## 🔧 Development

### Project Structure
```
src/
├── index.ts                    # Main application entry
├── services/
│   ├── documentService.ts      # Document processing logic
│   ├── ollama/
│   │   └── ollamaService.ts    # Ollama API integration
│   └── discord/
│       └── commands/
│           └── docs.ts         # Discord slash commands
└── utils/
    └── fileProcessors/         # File type processors
```

### Adding New File Types

1. Install appropriate parser (e.g., `xlsx` for Excel)
2. Add MIME type to `allowedTypes` in `docs.ts`
3. Add processing logic in `documentService.ts`

### Testing

```bash
npm test                # Run tests
npm run type-check     # TypeScript validation
npm run lint           # Code linting
```

## 📊 Monitoring

### Health Check
When `ENABLE_HEALTH_CHECK=true`, the bot exposes a health endpoint:
```
GET http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "uptime": 12345,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "discord": "connected"
}
```

### Logging
The bot uses structured logging with different levels:
- `error`: Critical errors
- `warn`: Warnings and non-critical issues  
- `info`: General information
- `debug`: Detailed debugging information

## 🔒 Security Considerations

- **Local Processing**: All AI processing happens locally via Ollama
- **Role-based Access**: Configurable permissions for different user roles
- **File Validation**: Strict file type and size validation
- **Temporary Files**: Automatic cleanup of temporary upload files
- **No External APIs**: No data sent to external AI services

## 🚨 Troubleshooting

### Common Issues

**Bot not responding to commands:**
- Verify Discord token and permissions
- Check if commands are registered (`/docs status`)
- Ensure bot has necessary Discord permissions

**Ollama connection failed:**
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check OLLAMA_URL environment variable
- Ensure required models are installed

**Document processing failed:**
- Check file type is supported
- Verify file size is under limit
- Check Ollama model availability

**Permission denied:**
- Verify user has required roles
- Check ALLOWED_ROLES and UPLOAD_ROLES configuration
- Ensure role names match (case-insensitive)

### Debug Mode
Set `LOG_LEVEL=debug` for detailed logging.

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

**Built with ❤️ using Ollama and Discord.js**
