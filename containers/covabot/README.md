# CovaBot - AI Personality Discord Bot

CovaBot is an advanced AI-powered Discord bot with personality-driven responses, conversation memory, and intelligent context awareness. It features server-specific identities, vector-based memory storage, and a comprehensive web management interface.

## Features

### 🤖 AI Personality System
- **Server-specific identities** with customizable nicknames and personalities
- **Multiple personality profiles** (Friendly, Professional, Casual, Custom)
- **Contextual behavior adaptation** based on conversation context
- **LLM integration** with support for OpenAI, Ollama, and Anthropic

### 🧠 Conversation Memory
- **Qdrant vector database** integration for semantic memory storage
- **Intelligent memory retrieval** using embedding similarity
- **Automatic memory cleanup** with configurable retention policies
- **Context-aware responses** using relevant conversation history

### 🌐 Web Management Interface
- **Memory management** with search, export, and cleanup tools
- **Identity configuration** for server-specific personalities
- **Real-time statistics** and health monitoring
- **Role-based access control** with JWT authentication

### 🛡️ Security & Safety
- **Debug mode safety** with testing channel whitelists
- **Rate limiting** and abuse prevention
- **Input validation** and sanitization
- **Secure token handling** and environment configuration

## Architecture

```
CovaBot Container
├── Enhanced CovaBot (Main Bot Class)
├── Services
│   ├── Identity Service (Server-specific personalities)
│   ├── Memory Service (Qdrant vector database)
│   ├── Embedding Service (Text vectorization)
│   └── LLM Service (AI response generation)
├── Web Interface
│   ├── Express Server (REST API)
│   ├── WebSocket (Real-time updates)
│   └── Management UI (Memory & Identity)
└── Configuration
    ├── Environment Variables
    ├── Personality Profiles
    └── Security Settings
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Qdrant vector database
- Discord bot token
- LLM provider API key (OpenAI/Ollama/Anthropic)

### Environment Variables

```bash
# Discord Configuration
STARBUNK_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/covabot

# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION_NAME=covabot_memories

# LLM Provider (choose one or more)
OPENAI_API_KEY=your_openai_api_key
OLLAMA_BASE_URL=http://localhost:11434
ANTHROPIC_API_KEY=your_anthropic_api_key

# Web Interface
WEB_PORT=7080
WEB_HOST=0.0.0.0
JWT_SECRET=your_jwt_secret

# Debug Mode (optional)
DEBUG_MODE=false
TESTING_CHANNEL_IDS=channel1,channel2
```

### Installation

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start the bot
npm start

# Or run in development mode
npm run dev
```

### Docker Deployment

```bash
# Build container
docker build -t covabot .

# Run container
docker run -d \
  --name covabot \
  --env-file .env \
  -p 7080:7080 \
  covabot
```

## Configuration

### Personality Profiles

CovaBot comes with three default personality profiles:

#### Friendly Assistant (Default)
- Helpful and warm personality
- Casual communication style
- High supportiveness and empathy

#### Professional Assistant
- Formal and efficient communication
- Focused on accuracy and reliability
- Concise and business-appropriate responses

#### Casual Friend
- Relaxed and informal personality
- Uses humor and casual language
- Spontaneous and relatable responses

### Custom Personalities

Create custom personalities through the web interface or API:

```json
{
  "name": "Custom Assistant",
  "description": "A specialized AI assistant",
  "traits": [
    { "name": "helpfulness", "value": 90, "description": "Always helpful" },
    { "name": "creativity", "value": 75, "description": "Creative responses" }
  ],
  "responseStyle": {
    "formality": 50,
    "verbosity": 60,
    "emotiveness": 70,
    "humor": 40,
    "supportiveness": 80
  },
  "triggerPatterns": ["cova", "assistant"],
  "contextualBehaviors": [
    {
      "context": "greeting",
      "behavior": "Respond warmly and personally",
      "priority": 100
    }
  ]
}
```

## Web Interface

Access the web management interface at `http://localhost:7080`

### Features
- **Dashboard** - Real-time statistics and health monitoring
- **Memory Management** - Search, view, and manage conversation memories
- **Identity Configuration** - Manage server-specific personalities
- **User Management** - Role-based access control
- **API Documentation** - Interactive API explorer

### API Endpoints

```
GET  /health              - Health check
GET  /api/stats           - Bot statistics
GET  /api/memory/search   - Search memories
GET  /api/identity/servers - Server identities
POST /api/identity/personality - Create personality
```

## Development

### Project Structure

```
src/
├── cova-bot/           # Main bot implementation
├── services/           # Core services
│   ├── identity/       # Identity management
│   ├── memory/         # Memory storage
│   ├── embedding/      # Text vectorization
│   └── llm/           # LLM integration
├── web/               # Web interface
│   ├── routes/        # API routes
│   ├── middleware/    # Express middleware
│   └── controllers/   # Request handlers
├── types/             # TypeScript definitions
├── config/            # Configuration management
└── utils/             # Utility functions
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint
```

### Building

```bash
# Clean build directory
npm run clean

# Build TypeScript
npm run build

# Build for production
npm run build:prod
```

## Deployment

### Docker Compose

```yaml
version: '3.8'
services:
  covabot:
    build: .
    ports:
      - "7080:7080"
    environment:
      - STARBUNK_TOKEN=${STARBUNK_TOKEN}
      - DATABASE_URL=${DATABASE_URL}
      - QDRANT_URL=${QDRANT_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - qdrant
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: covabot
      POSTGRES_USER: covabot
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  postgres_data:
  qdrant_data:
```

### Production Considerations

- **Environment Variables**: Use secure secret management
- **Database**: Configure connection pooling and backups
- **Monitoring**: Set up health checks and alerting
- **Scaling**: Consider horizontal scaling for high-traffic servers
- **Security**: Enable HTTPS and configure firewalls

## Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check Discord token validity
   - Verify bot permissions in Discord server
   - Check debug mode channel whitelist

2. **Memory not working**
   - Verify Qdrant connection
   - Check embedding service initialization
   - Review vector database configuration

3. **LLM responses failing**
   - Validate API keys
   - Check provider rate limits
   - Review model availability

4. **Web interface not accessible**
   - Verify port configuration
   - Check firewall settings
   - Review CORS configuration

### Debug Mode

Enable debug mode for development:

```bash
DEBUG_MODE=true
TESTING_CHANNEL_IDS=your_test_channel_id
```

This restricts bot responses to whitelisted channels for safe testing.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting guide
