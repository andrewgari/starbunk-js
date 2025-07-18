# Qdrant Vector Database Setup Plan

## 🎯 **Overview**

This plan outlines the complete setup of Qdrant vector database for CovaBot's memory and semantic search capabilities. The setup includes both development and production environments, with focus on Unraid server deployment.

## 📋 **Prerequisites**

- [x] CovaBot memory and configuration services merged (PR 248) ✅
- [ ] Unraid server with Docker support
- [ ] Network access to Qdrant instance
- [ ] Sufficient storage for vector data (~1GB+ recommended)
- [ ] Basic understanding of vector databases

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CovaBot       │    │   Qdrant        │    │   Web UI        │
│   Container     │◄──►│   Vector DB     │◄──►│   (Optional)    │
│                 │    │                 │    │                 │
│ - QdrantService │    │ - Collections   │    │ - Dashboard     │
│ - Embeddings    │    │ - Vectors       │    │ - Monitoring    │
│ - Memory Mgmt   │    │ - Search API    │    │ - Admin Tools   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📦 **Phase 1: Development Environment Setup**

### 1.1 Local Docker Compose Setup

Create a development Docker Compose file for local testing:

**File: `docker-compose.dev.yml`**
```yaml
version: '3.8'

services:
  qdrant:
    image: qdrant/qdrant:v1.7.4
    container_name: qdrant-dev
    ports:
      - "6333:6333"  # REST API
      - "6334:6334"  # gRPC API (optional)
    volumes:
      - qdrant_data:/qdrant/storage
    environment:
      - QDRANT__SERVICE__HTTP_PORT=6333
      - QDRANT__SERVICE__GRPC_PORT=6334
      - QDRANT__LOG_LEVEL=INFO
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  covabot-dev:
    build:
      context: .
      dockerfile: containers/covabot/Dockerfile
    container_name: covabot-dev
    depends_on:
      qdrant:
        condition: service_healthy
    environment:
      - QDRANT_URL=http://qdrant:6333
      - EMBEDDING_DIMENSIONS=384
      - EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
      - NODE_ENV=development
    volumes:
      - ./containers/covabot:/app
    restart: unless-stopped

volumes:
  qdrant_data:
    driver: local
```

### 1.2 Environment Variables Setup

**File: `.env.development`**
```bash
# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=  # Optional for development

# Embedding Configuration
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
EMBEDDING_DIMENSIONS=384
EMBEDDING_BATCH_SIZE=32
EMBEDDING_CACHE_SIZE=1000
EMBEDDING_TIMEOUT=30000

# CovaBot Configuration
NODE_ENV=development
DEBUG_MODE=true
```

### 1.3 Development Testing Commands

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Check Qdrant health
curl http://localhost:6333/health

# View Qdrant collections
curl http://localhost:6333/collections

# Stop development environment
docker-compose -f docker-compose.dev.yml down
```

## 🚀 **Phase 2: Production Unraid Setup**

### 2.1 Unraid Docker Template

**Qdrant Container Configuration:**
```yaml
Container Name: qdrant-covabot
Repository: qdrant/qdrant:v1.7.4
Network Type: Custom (covabot-network)

Port Mappings:
- Container Port: 6333 → Host Port: 6333 (REST API)
- Container Port: 6334 → Host Port: 6334 (gRPC - Optional)

Volume Mappings:
- Container Path: /qdrant/storage → Host Path: /mnt/user/appdata/qdrant/storage
- Container Path: /qdrant/config → Host Path: /mnt/user/appdata/qdrant/config

Environment Variables:
- QDRANT__SERVICE__HTTP_PORT=6333
- QDRANT__SERVICE__GRPC_PORT=6334
- QDRANT__LOG_LEVEL=INFO
- QDRANT__STORAGE__PERFORMANCE__MAX_SEARCH_THREADS=4
- QDRANT__STORAGE__OPTIMIZERS__MEMMAP_THRESHOLD=200000

Docker Command:
--restart=unless-stopped
--health-cmd="curl -f http://localhost:6333/health || exit 1"
--health-interval=30s
--health-timeout=10s
--health-retries=3
```

### 2.2 Unraid Directory Structure

```
/mnt/user/appdata/qdrant/
├── storage/                 # Vector data storage
│   ├── collections/
│   ├── meta/
│   └── wal/
├── config/                  # Configuration files
│   └── production.yaml
├── logs/                    # Log files
└── backups/                 # Backup storage
```

### 2.3 Production Configuration File

**File: `/mnt/user/appdata/qdrant/config/production.yaml`**
```yaml
service:
  http_port: 6333
  grpc_port: 6334
  enable_cors: true
  max_request_size_mb: 32

storage:
  # Storage optimizations for production
  performance:
    max_search_threads: 4
    max_optimization_threads: 2
  
  # Memory management
  optimizers:
    memmap_threshold: 200000
    indexing_threshold: 10000
    flush_interval_sec: 30
  
  # Persistence settings
  wal:
    wal_capacity_mb: 32
    wal_segments_ahead: 2

cluster:
  enabled: false  # Single node setup

telemetry:
  disabled: true  # Disable telemetry for privacy

log_level: INFO
```

## 🔧 **Phase 3: CovaBot Integration (Using PR 248 Services)**

### 3.0 PR 248 Services Overview

The following services from PR 248 will integrate with Qdrant:

- **`QdrantMemoryService`** - Unified memory management with vector embeddings
- **`EmbeddingService`** - Text vectorization using transformers
- **`BotConfigurationService`** - Persistent configuration management
- **`PersonalityNotesService`** - Enhanced personality note management
- **`PersonalityNotesServiceDb`** - Database-backed personality persistence

### 3.1 Production Environment Variables

**File: `/mnt/user/appdata/covabot/.env.production`**
```bash
# Qdrant Configuration
QDRANT_URL=http://qdrant-covabot:6333
QDRANT_API_KEY=your-secure-api-key-here  # Optional but recommended

# Embedding Configuration
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
EMBEDDING_DIMENSIONS=384
EMBEDDING_BATCH_SIZE=16  # Reduced for production stability
EMBEDDING_CACHE_SIZE=2000  # Increased for production
EMBEDDING_TIMEOUT=60000  # Increased timeout

# Memory Collections (from PR 248 QdrantMemoryService)
PERSONALITY_COLLECTION=covabot_personality
CONVERSATION_COLLECTION=covabot_conversations
MEMORY_COLLECTION=covabot_memory

# Performance Tuning
QDRANT_SEARCH_LIMIT=50
QDRANT_SIMILARITY_THRESHOLD=0.7
QDRANT_BATCH_SIZE=100

# Production Settings
NODE_ENV=production
DEBUG_MODE=false
```

### 3.2 Docker Compose Production Setup

**File: `docker-compose.production.yml`**
```yaml
version: '3.8'

networks:
  covabot-network:
    driver: bridge

services:
  qdrant:
    image: qdrant/qdrant:v1.7.4
    container_name: qdrant-covabot
    networks:
      - covabot-network
    ports:
      - "6333:6333"
    volumes:
      - /mnt/user/appdata/qdrant/storage:/qdrant/storage
      - /mnt/user/appdata/qdrant/config:/qdrant/config
    environment:
      - QDRANT__CONFIG_PATH=/qdrant/config/production.yaml
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s

  covabot:
    image: ghcr.io/andrewgari/covabot:latest
    container_name: covabot-production
    networks:
      - covabot-network
    depends_on:
      qdrant:
        condition: service_healthy
    env_file:
      - /mnt/user/appdata/covabot/.env.production
    volumes:
      - /mnt/user/appdata/covabot/data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "process.exit(0)"]
      interval: 60s
      timeout: 30s
      retries: 3
```

**Note:** This integrates with the existing CovaBot container from PR 248, which includes:
- `QdrantMemoryService` for vector database operations
- `EmbeddingService` for text vectorization
- `BotConfigurationService` for persistent settings
- `PersonalityNotesService` for personality management

## 🧪 **Phase 4: Testing & Validation**

### 4.1 Health Check Script

**File: `scripts/qdrant-health-check.sh`**
```bash
#!/bin/bash

QDRANT_URL=${1:-"http://localhost:6333"}

echo "🔍 Checking Qdrant health..."

# Basic health check
if curl -f "$QDRANT_URL/health" > /dev/null 2>&1; then
    echo "✅ Qdrant is healthy"
else
    echo "❌ Qdrant health check failed"
    exit 1
fi

# Check collections
echo "📊 Checking collections..."
collections=$(curl -s "$QDRANT_URL/collections" | jq -r '.result.collections[].name' 2>/dev/null)

if [ -n "$collections" ]; then
    echo "✅ Collections found:"
    echo "$collections" | sed 's/^/  - /'
else
    echo "⚠️  No collections found (this is normal for new setup)"
fi

# Check cluster info
echo "🖥️  Cluster information:"
curl -s "$QDRANT_URL/cluster" | jq '.result' 2>/dev/null || echo "Unable to fetch cluster info"

echo "🎉 Health check complete!"
```

### 4.2 Collection Initialization Script

**File: `scripts/initialize-collections.js`**
```javascript
const { QdrantClient } = require('@qdrant/js-client-rest');

async function initializeCollections() {
    const client = new QdrantClient({
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY
    });

    // Collections from PR 248 QdrantMemoryService implementation
    const collections = [
        {
            name: 'covabot_personality',
            vectorSize: 384,
            distance: 'Cosine'
        },
        {
            name: 'covabot_conversations',
            vectorSize: 384,
            distance: 'Cosine'
        },
        {
            name: 'covabot_memory',
            vectorSize: 384,
            distance: 'Cosine'
        }
    ];

    for (const config of collections) {
        try {
            console.log(`Creating collection: ${config.name}`);
            await client.createCollection(config.name, {
                vectors: {
                    size: config.vectorSize,
                    distance: config.distance,
                    on_disk: true
                },
                optimizers_config: {
                    deleted_threshold: 0.2,
                    vacuum_min_vector_number: 1000,
                    default_segment_number: 2
                }
            });
            console.log(`✅ Collection ${config.name} created successfully`);
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log(`⚠️  Collection ${config.name} already exists`);
            } else {
                console.error(`❌ Failed to create collection ${config.name}:`, error.message);
            }
        }
    }

    console.log('🎉 Collection initialization complete!');
}

initializeCollections().catch(console.error);
```

## 📊 **Phase 5: Monitoring & Maintenance**

### 5.1 Monitoring Dashboard Setup

**Qdrant Web UI (Optional):**
```yaml
  qdrant-ui:
    image: qdrant/qdrant-web-ui:latest
    container_name: qdrant-ui
    networks:
      - covabot-network
    ports:
      - "3000:3000"
    environment:
      - QDRANT_HOST=qdrant
      - QDRANT_PORT=6333
    depends_on:
      - qdrant
    restart: unless-stopped
```

### 5.2 Backup Strategy

**File: `scripts/backup-qdrant.sh`**
```bash
#!/bin/bash

BACKUP_DIR="/mnt/user/appdata/qdrant/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="qdrant_backup_$TIMESTAMP"

echo "🔄 Starting Qdrant backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create snapshot via API
curl -X POST "http://localhost:6333/collections/covabot_personality/snapshots"
curl -X POST "http://localhost:6333/collections/covabot_conversations/snapshots"

# Copy storage directory
tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C /mnt/user/appdata/qdrant storage/

echo "✅ Backup completed: $BACKUP_NAME.tar.gz"

# Cleanup old backups (keep last 7 days)
find "$BACKUP_DIR" -name "qdrant_backup_*.tar.gz" -mtime +7 -delete

echo "🧹 Old backups cleaned up"
```

### 5.3 Performance Monitoring

**File: `scripts/monitor-qdrant.sh`**
```bash
#!/bin/bash

QDRANT_URL=${1:-"http://localhost:6333"}

echo "📊 Qdrant Performance Metrics"
echo "=============================="

# Collection stats (from PR 248 services)
for collection in covabot_personality covabot_conversations covabot_memory; do
    echo "📁 Collection: $collection"
    curl -s "$QDRANT_URL/collections/$collection" | jq -r '
        .result | 
        "  Vectors: \(.vectors_count // 0)",
        "  Indexed: \(.indexed_vectors_count // 0)",
        "  Points: \(.points_count // 0)",
        "  Segments: \(.segments_count // 0)"
    ' 2>/dev/null || echo "  ❌ Unable to fetch stats"
    echo ""
done

# Cluster metrics
echo "🖥️  Cluster Metrics:"
curl -s "$QDRANT_URL/metrics" | grep -E "(qdrant_collections_total|qdrant_points_total)" || echo "  ❌ Unable to fetch metrics"
```

## 🚀 **Phase 6: Deployment Checklist**

### 6.1 Pre-Deployment Checklist

- [ ] Unraid server has sufficient resources (4GB+ RAM, 10GB+ storage)
- [ ] Docker and Docker Compose installed on Unraid
- [ ] Network ports 6333 and 6334 available
- [ ] Backup strategy implemented
- [ ] Environment variables configured
- [ ] Health check scripts tested

### 6.2 Deployment Steps

1. **Create directory structure:**
   ```bash
   mkdir -p /mnt/user/appdata/qdrant/{storage,config,logs,backups}
   ```

2. **Deploy configuration files:**
   ```bash
   # Copy production.yaml to config directory
   # Copy environment files
   # Set proper permissions
   ```

3. **Start Qdrant container:**
   ```bash
   docker-compose -f docker-compose.production.yml up -d qdrant
   ```

4. **Verify Qdrant health:**
   ```bash
   ./scripts/qdrant-health-check.sh
   ```

5. **Initialize collections:**
   ```bash
   node scripts/initialize-collections.js
   ```

6. **Start CovaBot:**
   ```bash
   docker-compose -f docker-compose.production.yml up -d covabot
   ```

7. **Verify integration:**
   ```bash
   # Check CovaBot logs for Qdrant connection
   docker logs covabot-production
   ```

### 6.3 Post-Deployment Validation

- [ ] Qdrant health endpoint responding
- [ ] Collections created successfully
- [ ] CovaBot connecting to Qdrant
- [ ] Memory storage/retrieval working
- [ ] Backup script functional
- [ ] Monitoring dashboard accessible (if enabled)

## 🔧 **Phase 7: Troubleshooting Guide**

### Common Issues & Solutions

**Issue: Connection refused**
```bash
# Check if Qdrant is running
docker ps | grep qdrant

# Check logs
docker logs qdrant-covabot

# Verify network connectivity
docker exec covabot-production ping qdrant-covabot
```

**Issue: Collections not created**
```bash
# Manual collection creation (matches PR 248 QdrantMemoryService)
curl -X PUT "http://localhost:6333/collections/covabot_personality" \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 384,
      "distance": "Cosine"
    }
  }'

# Create all collections from PR 248
for collection in covabot_personality covabot_conversations covabot_memory; do
  curl -X PUT "http://localhost:6333/collections/$collection" \
    -H "Content-Type: application/json" \
    -d '{"vectors": {"size": 384, "distance": "Cosine"}}'
done
```

**Issue: Performance problems**
```bash
# Check resource usage
docker stats qdrant-covabot

# Monitor collection sizes
./scripts/monitor-qdrant.sh

# Optimize collections
curl -X POST "http://localhost:6333/collections/covabot_personality/index"
```

## 📚 **Additional Resources**

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Qdrant Docker Hub](https://hub.docker.com/r/qdrant/qdrant)
- [Vector Database Best Practices](https://qdrant.tech/articles/vector-database-performance/)
- [Unraid Docker Guide](https://unraid.net/community/apps)

## 🎯 **Success Criteria**

- [ ] Qdrant running stably on Unraid
- [ ] CovaBot successfully connecting and storing vectors
- [ ] Semantic search returning relevant results
- [ ] Backup and monitoring systems operational
- [ ] Performance meeting requirements (< 100ms search latency)
- [ ] Data persistence across container restarts

---

**Next Steps:** Once Qdrant is deployed, we can proceed with:
1. Personality data seeding
2. LLM integration for conversation handling
3. Web interface development for memory management
4. Advanced features like conversation intelligence
