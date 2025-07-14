# CovaBot Qdrant Vector Database Implementation

## Overview

This document describes the complete implementation of Qdrant vector database integration for CovaBot's memory management system. The new implementation replaces the dual storage system (PostgreSQL + file-based) with a unified vector-based approach that provides semantic search capabilities and persistent conversation memory.

## Architecture

### Core Components

1. **QdrantMemoryService** - Unified memory management service
2. **QdrantService** - Low-level Qdrant vector database operations
3. **EmbeddingService** - Local text-to-vector conversion using sentence-transformers
4. **Enhanced LLM Triggers** - Conversation memory-aware response generation

### Data Flow

```
User Message → Embedding Generation → Semantic Search → Context Generation → LLM Response → Memory Storage
```

## Features

### ✅ Implemented Features

#### Personality Notes Management
- **Semantic Search**: Find personality notes by meaning, not just keywords
- **Vector Storage**: All personality notes stored as embeddings with metadata
- **API Compatibility**: Existing web frontend endpoints work unchanged
- **Category & Priority**: Full support for existing categorization system

#### Conversation Memory
- **Persistent History**: Store all user/bot message pairs as vectors
- **Contextual Retrieval**: Find relevant past conversations for current context
- **Temporal Awareness**: Weight recent conversations higher than old ones
- **Cross-Channel Memory**: Learn from conversations across different channels

#### Enhanced LLM Integration
- **Dynamic Context**: Combine personality notes + conversation history
- **Relevance Scoring**: Only include contextually relevant memories
- **Conversation Continuity**: Maintain context across multiple exchanges
- **Memory-Aware Responses**: Bot responses consider conversation history

#### Production Features
- **Health Monitoring**: Comprehensive health checks for all components
- **Performance Metrics**: Track search times, embedding generation, cache hit rates
- **Error Handling**: Graceful degradation when services fail
- **Resource Management**: Configurable memory limits and cleanup

## Configuration

### Environment Variables

```bash
# Qdrant Configuration
USE_QDRANT=true                                    # Enable Qdrant (default: true)
QDRANT_URL=http://localhost:6333                   # Qdrant server URL
QDRANT_API_KEY=                                    # Optional API key

# Embedding Configuration
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2           # Local embedding model
EMBEDDING_DIMENSIONS=384                           # Vector dimensions
EMBEDDING_BATCH_SIZE=32                            # Batch processing size
EMBEDDING_CACHE_SIZE=1000                          # Embedding cache size

# Memory Configuration
MAX_CONVERSATION_HISTORY=100                       # Max conversation items to retrieve
MEMORY_RETENTION_DAYS=30                           # How long to keep conversation history
CONTEXT_SIMILARITY_THRESHOLD=0.7                  # Minimum similarity for context inclusion
CONVERSATION_CONTEXT_LIMIT=10                      # Max conversation items in LLM context
```

## API Endpoints

### Existing Endpoints (Unchanged)
- `GET /api/notes` - List personality notes with filtering
- `POST /api/notes` - Create new personality note
- `PUT /api/notes/:id` - Update personality note
- `DELETE /api/notes/:id` - Delete personality note
- `GET /api/context` - Get LLM context from active notes
- `GET /api/stats` - Get memory statistics
- `GET /api/health` - Health check

### New Endpoints
- `POST /api/search` - Semantic search across all memory
- `POST /api/context/enhanced` - Generate enhanced context with conversation history

### API Examples

#### Semantic Search
```bash
curl -X POST http://localhost:7080/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "gaming preferences",
    "filters": {
      "type": "personality",
      "limit": 5,
      "similarityThreshold": 0.7
    }
  }'
```

#### Enhanced Context Generation
```bash
curl -X POST http://localhost:7080/api/context/enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What games do you like?",
    "userId": "user123",
    "channelId": "channel456",
    "options": {
      "maxPersonalityNotes": 8,
      "maxConversationHistory": 6,
      "similarityThreshold": 0.6
    }
  }'
```

## Deployment

### Docker Compose (Unraid)

```yaml
services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - /mnt/user/appdata/covabot/qdrant:/qdrant/storage
    
  covabot:
    image: ghcr.io/andrewgari/starbunk-covabot:latest
    ports:
      - "7080:7080"
    environment:
      - USE_QDRANT=true
      - QDRANT_URL=http://qdrant:6333
    depends_on:
      - qdrant
```

### Migration from Existing System

```bash
# Migrate from file-based storage
npm run migrate-to-qdrant --source file --backup ./backup.json

# Migrate from PostgreSQL
npm run migrate-to-qdrant --source database --backup ./backup.json

# Dry run to test migration
npm run migrate-to-qdrant --source file --dry-run
```

## Performance

### Benchmarks (Local Testing)

- **Embedding Generation**: ~50ms per text (384-dim vectors)
- **Vector Search**: ~10ms for 1000 vectors
- **Context Generation**: ~100ms (including embedding + search)
- **Memory Usage**: ~500MB for embedding model + 200MB for Qdrant

### Optimization Features

- **Embedding Caching**: LRU cache for frequently accessed texts
- **Batch Processing**: Efficient bulk operations
- **Vector Compression**: Quantized models for reduced memory usage
- **Connection Pooling**: Efficient Qdrant client management

## Monitoring

### Health Check Response
```json
{
  "status": "healthy",
  "qdrant": {
    "connected": true,
    "collections": ["covabot_personality", "covabot_conversations"],
    "vectorCount": 1250
  },
  "embedding": {
    "loaded": true,
    "model": "Xenova/all-MiniLM-L6-v2",
    "dimensions": 384
  },
  "memory": {
    "personalityNotes": 45,
    "conversations": 1205,
    "cacheHitRate": 0.85
  },
  "performance": {
    "averageSearchTime": 12.5,
    "averageEmbeddingTime": 48.2
  }
}
```

### Statistics Dashboard
- **Memory Usage**: Personality notes vs. conversation history
- **Search Performance**: Average response times and cache hit rates
- **Conversation Analytics**: Message frequency, topic distribution
- **Vector Quality**: Similarity score distributions

## Testing

### Unit Tests
```bash
# Run all Qdrant-related tests
npm test -- --testPathPattern=qdrant

# Run specific service tests
npm test src/services/__tests__/qdrantMemoryService.test.ts
```

### Integration Tests
```bash
# Test full conversation flow
npm run test:integration

# Test migration scripts
npm run test:migration
```

### Web Interface Testing
- Access http://localhost:7080 for personality management
- Use semantic search to find relevant notes
- Test conversation memory through chat interface

## Troubleshooting

### Common Issues

#### Qdrant Connection Failed
```bash
# Check Qdrant status
curl http://localhost:6333/health

# Check Docker logs
docker logs covabot-qdrant
```

#### Embedding Model Loading Issues
```bash
# Check available disk space (models are ~100MB)
df -h

# Check memory usage
docker stats covabot
```

#### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check Qdrant collection info
curl http://localhost:6333/collections/covabot_personality
```

### Debug Mode
```bash
# Enable debug logging
DEBUG_MODE=true npm run dev:qdrant

# Check service health
curl http://localhost:7080/api/health
```

## Migration Guide

### From PostgreSQL/File System

1. **Backup Existing Data**
   ```bash
   npm run migrate-to-qdrant --source database --backup ./backup.json
   ```

2. **Test Migration (Dry Run)**
   ```bash
   npm run migrate-to-qdrant --source database --dry-run
   ```

3. **Perform Migration**
   ```bash
   npm run migrate-to-qdrant --source database
   ```

4. **Verify Results**
   ```bash
   curl http://localhost:7080/api/stats
   ```

### Rollback Plan

If issues occur, you can rollback by:
1. Stopping the Qdrant-enabled container
2. Restoring from backup using the old system
3. Setting `USE_QDRANT=false` in environment

## Future Enhancements

### Planned Features
- **Advanced Analytics**: Conversation topic clustering and trends
- **Multi-User Memory**: User-specific conversation contexts
- **Memory Consolidation**: Automatic summarization of old conversations
- **External Embeddings**: Support for OpenAI/Cohere embedding APIs
- **Memory Sharing**: Cross-bot memory sharing for consistent personality

### Performance Improvements
- **GPU Acceleration**: CUDA support for faster embedding generation
- **Distributed Qdrant**: Multi-node setup for large-scale deployments
- **Streaming Updates**: Real-time memory updates without blocking
- **Smart Caching**: Predictive caching based on conversation patterns

## Support

For issues or questions:
1. Check the health endpoint: `GET /api/health`
2. Review Docker logs: `docker logs covabot`
3. Test individual components using the web interface
4. Consult the troubleshooting section above

The Qdrant implementation provides a robust, scalable foundation for CovaBot's memory management with significant improvements in conversation quality and contextual awareness.
