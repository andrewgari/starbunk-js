# CovaBot Personality Management System

A comprehensive web-based interface for managing CovaBot's personality, behavior, and conversation context through structured notes that are automatically integrated into LLM prompts.

## 🌟 Features

### Core Functionality
- **CRUD Operations**: Add, edit, delete, and manage personality notes
- **Categorization**: Organize notes by type (instruction, personality, behavior, knowledge, context)
- **Priority System**: High/Medium/Low priority with visual indicators
- **Search & Filter**: Full-text search and filtering by category, priority, and status
- **Real-time Integration**: Notes are automatically included in CovaBot's LLM prompts

### Storage Options
- **File-based Storage**: JSON file storage (default, no database required)
- **Database Storage**: PostgreSQL with Prisma ORM (production-ready)
- **Migration Support**: Easy migration from file to database storage

### Web Interface
- **Responsive Design**: Mobile-friendly interface with modern styling
- **Real-time Updates**: Live statistics and context preview
- **Import/Export**: Backup and restore personality configurations
- **Authentication**: API key-based security (configurable)

## 🚀 Quick Start

### Development Mode (File Storage)
```bash
# Install dependencies
npm install

# Start development server with web interface
npm run dev:web

# Access the interface
open http://localhost:3001
```

### Production Mode (Database Storage)
```bash
# Set up database
export DATABASE_URL="postgresql://user:password@localhost:5432/starbunk"

# Run database migrations
npx prisma migrate deploy

# Start with database storage
npm run start:db
```

## 📊 Architecture

### Storage Layers
```
┌─────────────────────────────────────┐
│           Web Interface             │
│     (React-like Vanilla JS)        │
├─────────────────────────────────────┤
│           Express API               │
│    (CRUD + Statistics + Health)     │
├─────────────────────────────────────┤
│        Service Layer               │
│  ┌─────────────┬─────────────────┐  │
│  │ File Service│  Database Service│  │
│  │   (JSON)    │   (PostgreSQL)  │  │
│  └─────────────┴─────────────────┘  │
├─────────────────────────────────────┤
│          LLM Integration            │
│     (Automatic Context Injection)   │
└─────────────────────────────────────┘
```

### Data Flow
1. **User Input** → Web Interface
2. **API Calls** → Express Server
3. **Service Layer** → File/Database Storage
4. **LLM Integration** → Automatic context injection
5. **Discord Bot** → Enhanced responses

## 🗂️ Note Categories

| Category | Purpose | Example |
|----------|---------|---------|
| **Instruction** | Core behavioral directives | "Always respond helpfully and concisely" |
| **Personality** | Character traits and tone | "Be friendly but professional" |
| **Behavior** | Specific response patterns | "Use emojis sparingly" |
| **Knowledge** | Domain-specific information | "You are a software development assistant" |
| **Context** | Situational awareness | "This is a Discord server for developers" |

## 🔧 Configuration

### Environment Variables
```bash
# Storage Configuration
COVABOT_DATA_DIR="/app/data"  # Directory for personality notes (Docker/Unraid)
USE_DATABASE=false            # Use PostgreSQL instead of file storage

# Database (optional)
DATABASE_URL="postgresql://user:password@localhost:5432/starbunk"

# Authentication (optional)
COVABOT_API_KEY="your-secure-api-key"

# Development
NODE_ENV=development
DEBUG=true
```

### API Endpoints

#### Core Operations
- `GET /api/notes` - List notes with filtering
- `POST /api/notes` - Create new note
- `PUT /api/notes/:id` - Update existing note
- `DELETE /api/notes/:id` - Delete note

#### Utility Endpoints
- `GET /api/stats` - Get statistics
- `GET /api/context` - Preview LLM context
- `GET /api/health` - Health check

#### Query Parameters
```
GET /api/notes?category=personality&priority=high&search=friendly&isActive=true
```

## 📝 Usage Examples

### Creating Notes via API
```bash
# Add a personality trait
curl -X POST http://localhost:3001/api/notes \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "content": "Always be encouraging and supportive",
    "category": "personality",
    "priority": "high"
  }'
```

### Programmatic Access
```typescript
import { PersonalityNotesServiceDb } from './services/personalityNotesServiceDb';

const service = PersonalityNotesServiceDb.getInstance();
await service.initialize();

// Create a note
const note = await service.createNote({
  content: "Be helpful and concise",
  category: "instruction",
  priority: "high"
});

// Get LLM context
const context = await service.getActiveNotesForLLM();
console.log(context);
```

## 🔄 Migration

### File to Database Migration
```bash
# Run the migration script
npm run migrate-notes

# Or manually
npx ts-node src/scripts/migrate-to-database.ts
```

The migration script will:
1. Load existing notes from JSON file
2. Connect to PostgreSQL database
3. Transfer all notes with validation
4. Provide detailed progress reporting

## 🧪 Testing

### Run Tests
```bash
# All tests
npm test

# Specific service tests
npm test -- personalityNotesService
npm test -- personalityNotesServiceDb

# With coverage
npm test -- --coverage
```

### Test Categories
- **Unit Tests**: Service layer logic
- **Integration Tests**: Database operations
- **API Tests**: HTTP endpoint validation
- **Migration Tests**: Data transfer validation

## 🔒 Security

### Authentication
- API key-based authentication for production
- Development mode bypass for local testing
- Rate limiting (100 requests/minute)
- Request logging and monitoring

### Data Protection
- Input validation and sanitization
- SQL injection prevention (Prisma ORM)
- XSS protection in web interface
- CORS configuration for secure origins

## 📈 Monitoring

### Health Checks
```bash
curl http://localhost:3001/api/health
```

Response:
```json
{
  "success": true,
  "status": "healthy",
  "storage": "database",
  "timestamp": "2024-07-04T23:00:00.000Z"
}
```

### Statistics
- Total notes count
- Active vs inactive notes
- Distribution by category and priority
- Database connection status

## 🚀 Deployment

### Docker Support
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Runtime stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY dist ./dist
EXPOSE 3001
CMD ["npm", "run", "start:db"]
```

### Unraid Server Deployment

CovaBot is fully compatible with Unraid servers using persistent volume mounts:

```yaml
# docker-compose.yml excerpt
covabot:
  image: ghcr.io/andrewgari/covabot:latest
  environment:
    - COVABOT_DATA_DIR=/app/data
    - USE_DATABASE=false  # or true for PostgreSQL
  volumes:
    # Unraid persistent storage
    - /mnt/user/appdata/starbunk/covabot:/app/data
  ports:
    - "3001:3001"
```

**Unraid Benefits:**
- ✅ **Persistent Storage**: Personality notes survive container updates
- ✅ **Easy Backups**: Simple file-based backup of `/mnt/user/appdata/`
- ✅ **Web Interface**: Access at `http://unraid-ip:3001`
- ✅ **File Permissions**: Automatic handling of Docker user permissions

### Environment Setup
```bash
# Production environment
export NODE_ENV=production
export USE_DATABASE=true
export DATABASE_URL="postgresql://..."
export COVABOT_API_KEY="secure-random-key"
export COVABOT_DATA_DIR="/app/data"  # For Docker/Unraid

# Start the service
npm run start:db
```

### Testing Persistence
```bash
# Test that personality notes persist across container restarts
npm run test:persistence
```

## 🤝 Contributing

1. **Development Setup**
   ```bash
   git clone <repository>
   cd containers/covabot
   npm install
   npm run dev:web
   ```

2. **Testing**
   ```bash
   npm test
   npm run type-check
   ```

3. **Database Development**
   ```bash
   npm run dev:db
   ```

## 📚 API Reference

### Note Object
```typescript
interface PersonalityNote {
  id: string;
  content: string;
  category: 'instruction' | 'personality' | 'behavior' | 'knowledge' | 'context';
  priority: 'high' | 'medium' | 'low';
  isActive: boolean;
  tokens?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Service Interface
```typescript
interface PersonalityNotesService {
  getNotes(filters?: NoteSearchFilters): Promise<PersonalityNote[]>;
  createNote(request: CreateNoteRequest): Promise<PersonalityNote>;
  updateNote(id: string, request: UpdateNoteRequest): Promise<PersonalityNote | null>;
  deleteNote(id: string): Promise<boolean>;
  getActiveNotesForLLM(): Promise<string>;
  getStats(): Promise<Statistics>;
}
```

## 🔗 Integration

The personality notes are automatically integrated into CovaBot's LLM prompts:

```typescript
// In llm-triggers.ts
const personalityNotes = await notesService.getActiveNotesForLLM();
const userPrompt = `
Channel: ${channelName}
User: ${username}
Message: ${content}

${personalityNotes}

Respond as Cova would to this message, taking into account the personality instructions above.
`;
```

This ensures that all active personality notes are considered in every LLM response, providing consistent and contextual behavior.
