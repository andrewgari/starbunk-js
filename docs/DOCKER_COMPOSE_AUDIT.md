# Docker Compose Configuration Audit

**Date**: 2026-01-22  
**Issue**: [#TBD] Clarify if build field is needed in BunkBot docker-compose service

## Executive Summary

This audit examines the docker-compose.yml configuration and environment variable requirements for the StarBunk Discord Bot project. The key finding is that the **`build` field is NOT needed** in the root docker-compose.yml for production deployments, as pre-built images are available from the GitHub Container Registry (GHCR).

## Table of Contents

1. [Build vs Image Field Analysis](#build-vs-image-field-analysis)
2. [Environment Variable Requirements](#environment-variable-requirements)
3. [Docker Compose File Comparison](#docker-compose-file-comparison)
4. [Recommendations](#recommendations)

---

## Build vs Image Field Analysis

### Current Pattern in Root `docker-compose.yml`

All four bot services (BunkBot, DJCova, CovaBot, BlueBot) currently have BOTH fields:

```yaml
bunkbot:
  build:
    context: .
    dockerfile: src/bunkbot/Dockerfile
  image: ghcr.io/andrewgari/bunkbot:prod
```

### Purpose of Each Field

#### `build` Field
- **Purpose**: Specifies how to build the Docker image locally from source
- **When used**: Development environments or when pre-built images are unavailable
- **Effect**: When running `docker-compose build`, Docker will compile the image from the Dockerfile

#### `image` Field
- **Purpose**: Specifies which pre-built image to pull from a registry
- **When used**: Production deployments using CI/CD built images
- **Effect**: When running `docker-compose up`, Docker will pull this image from GHCR if not available locally

### Docker Compose Behavior with Both Fields

When both `build` and `image` fields are present:

1. **`docker-compose up`**: Uses the `image` field - pulls `ghcr.io/andrewgari/bunkbot:prod` from registry
2. **`docker-compose build`**: Uses the `build` field - builds locally and tags with the `image` name
3. **Priority**: The `image` field takes precedence for `up` commands unless forced to build

### Is the `build` Field Needed?

**NO** - For production deployments using pre-built images, the `build` field is **redundant**.

**Rationale**:
- CI/CD pipeline builds images automatically (`.github/workflows/main-deploy.yml`)
- Images are pushed to GHCR with tags: `latest`, `prod`, `staging`, and version numbers
- Production users should pull pre-built images, not build locally
- Local builds can cause version drift from CI/CD built images

**When `build` IS useful**:
- Development environments (see `src/bunkbot/docker-compose.dev.yml`)
- Testing local changes before committing
- Environments without internet access to GHCR
- Custom forks that don't use the CI/CD pipeline

---

## Environment Variable Requirements

### Core Required Variables

#### All Services
```bash
# Required for all bot services
GUILD_ID=your-discord-server-id
```

#### Service-Specific Bot Tokens
```bash
# Required for BunkBot
BUNKBOT_TOKEN=your-bunkbot-token-here

# Optional (defaults to STARBUNK_TOKEN if not set)
DJCOVA_TOKEN=your-djcova-token-here
COVABOT_TOKEN=your-covabot-token-here
BLUEBOT_TOKEN=your-bluebot-token-here

# Fallback token
STARBUNK_TOKEN=your-fallback-token-here
```

#### Client IDs
```bash
# Required for DJCova (slash command registration)
DJCOVA_CLIENT_ID=your-djcova-client-id-here

# Optional for other services
BUNKBOT_CLIENT_ID=your-bunkbot-client-id-here
COVABOT_CLIENT_ID=your-covabot-client-id-here
BLUEBOT_CLIENT_ID=your-bluebot-client-id-here
```

### Optional Variables (with Defaults)

#### Observability Configuration
```bash
# OpenTelemetry Collector (defaults shown)
OTEL_COLLECTOR_HOST=starbunk-otel-collector
OTEL_COLLECTOR_HTTP_PORT=4318
OTEL_COLLECTOR_GRPC_PORT=4317
ENVIRONMENT=production
LOG_LEVEL=info
METRICS_PORT=3000
```

#### Storage Configuration
```bash
# Unraid or custom data path (defaults to ./data)
UNRAID_APPDATA_PATH=
```

#### CovaBot Specific
```bash
# LLM Configuration
OPENAI_API_KEY=                           # Optional, disables OpenAI if empty
OPENAI_DEFAULT_MODEL=gpt-4o-mini         # Default model
OLLAMA_API_URL=                           # Optional, disables Ollama if empty
OLLAMA_DEFAULT_MODEL=mistral:latest      # Default Ollama model
OLLAMA_AUTO_PULL_MODELS=true             # Auto-download missing models
OLLAMA_PULL_ON_STARTUP=true              # Pull models on startup
OLLAMA_PULL_TIMEOUT_MS=1200000           # 20 minute timeout

# Redis (Social Battery)
REDIS_HOST=host.docker.internal
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Qdrant (Vector DB)
QDRANT_URL=http://host.docker.internal:6333
QDRANT_API_KEY=

# Web Interface
COVABOT_WEB_PORT=7080                     # Host port for web UI
COVABOT_API_KEY=                          # Optional API auth
```

#### Debug/Testing
```bash
DEBUG_MODE=false                          # Verbose logging
TESTING_SERVER_IDS=                       # Comma-separated server IDs
TESTING_CHANNEL_IDS=                      # Comma-separated channel IDs
```

### Variable Usage by Service

| Variable | BunkBot | DJCova | CovaBot | BlueBot | Required |
|----------|---------|---------|---------|---------|----------|
| GUILD_ID | ✅ | ✅ | ✅ | ✅ | **Yes** |
| *_TOKEN | ✅ | ✅ | ✅ | ✅ | **Yes** |
| *_CLIENT_ID | ⚠️ | ✅ | ⚠️ | ⚠️ | DJCova only |
| OPENAI_API_KEY | ❌ | ❌ | ✅ | ❌ | No |
| OLLAMA_API_URL | ❌ | ❌ | ✅ | ❌ | No |
| REDIS_* | ❌ | ❌ | ✅ | ❌ | No |
| QDRANT_* | ❌ | ❌ | ✅ | ❌ | No |
| OTEL_* | ✅ | ✅ | ✅ | ✅ | No (has defaults) |
| UNRAID_APPDATA_PATH | ✅ | ✅ | ✅ | ✅ | No (defaults to ./data) |

---

## Docker Compose File Comparison

The project has multiple docker-compose files for different use cases:

### 1. Root `docker-compose.yml` (Production)
- **Location**: `/docker-compose.yml`
- **Purpose**: Production deployment with pre-built images
- **Pattern**: Has both `build` and `image` fields (REDUNDANT)
- **Services**: All 4 bots + observability stack (9 services total)
- **Recommendation**: **Remove `build` fields**

### 2. Infrastructure `docker-compose.yml` (Alternative Production)
- **Location**: `/infrastructure/docker/docker-compose.yml`
- **Purpose**: Production with additional infrastructure (PostgreSQL, Redis)
- **Pattern**: Uses `image` field ONLY ✅
- **Services**: All 4 bots + database + observability stack (11 services total)
- **Note**: This is the CORRECT pattern for production

### 3. Development `docker-compose.dev.yml`
- **Location**: `/src/bunkbot/docker-compose.dev.yml`
- **Purpose**: Local development with live code changes
- **Pattern**: Uses `build` field ONLY ✅
- **Services**: Single service (bunkbot-dev)
- **Note**: This is the CORRECT pattern for development

### Key Differences

| File | Use Case | Build Field | Image Field | Pattern |
|------|----------|-------------|-------------|---------|
| `docker-compose.yml` | Production | ✅ | ✅ | ⚠️ Mixed (redundant) |
| `infrastructure/docker/docker-compose.yml` | Production | ❌ | ✅ | ✅ Correct |
| `src/*/docker-compose.dev.yml` | Development | ✅ | ❌ | ✅ Correct |

---

## Recommendations

### 1. Remove `build` Fields from Root docker-compose.yml

**Action**: Remove the `build` sections from all services in the root `docker-compose.yml`

**Before**:
```yaml
bunkbot:
  build:
    context: .
    dockerfile: src/bunkbot/Dockerfile
  image: ghcr.io/andrewgari/bunkbot:prod
```

**After**:
```yaml
bunkbot:
  image: ghcr.io/andrewgari/bunkbot:prod
```

**Benefits**:
- Clearer intent: production uses pre-built images
- Prevents accidental local builds
- Faster startup (no build step check)
- Consistent with `infrastructure/docker/docker-compose.yml`

### 2. Document the Pattern

Add comments to `docker-compose.yml`:

```yaml
# Production deployment using pre-built images from GHCR
# For local development, see src/{service}/docker-compose.dev.yml
services:
  bunkbot:
    image: ghcr.io/andrewgari/bunkbot:prod
    # ... rest of config
```

### 3. Create Development Instructions

Add to README.md:

```markdown
## Development vs Production

### Production Deployment (Pre-built Images)
```bash
# Uses images from ghcr.io
docker-compose up -d
```

### Local Development (Build from Source)
```bash
# Build and run individual services
cd src/bunkbot
docker-compose -f docker-compose.dev.yml up --build
```
```

### 4. Consistency Check

Apply the same pattern to all similar docker-compose files:
- ✅ Root `docker-compose.yml` - Remove build fields
- ✅ `infrastructure/docker/docker-compose.yml` - Already correct
- ✅ `src/*/docker-compose.dev.yml` - Already correct (development)

---

## CI/CD Pipeline Notes

The GitHub Actions workflow (`.github/workflows/main-deploy.yml`) handles image building:

1. **Detects Changes**: Determines which services need rebuilding
2. **Builds Images**: Uses `Dockerfile.ci` for optimized CI builds
3. **Pushes to GHCR**: Tags images with `latest`, `main`, and commit SHA
4. **Release Promotion**: Release workflow re-tags `latest` as `prod` or `staging`

**Image Tags Available**:
- `ghcr.io/andrewgari/{service}:latest` - Latest main branch build
- `ghcr.io/andrewgari/{service}:prod` - Production release
- `ghcr.io/andrewgari/{service}:staging` - Pre-release
- `ghcr.io/andrewgari/{service}:v*.*.*` - Specific version

**Current docker-compose.yml uses**: `:prod` tag (correct for production)

---

## Conclusion

The `build` field in the root `docker-compose.yml` is **redundant and should be removed**. The project already has proper separation:

- **Production**: Use `image` field pointing to GHCR
- **Development**: Use separate `docker-compose.dev.yml` with `build` field

This audit confirms that the infrastructure docker-compose file already follows best practices, and the root file should be updated to match.
