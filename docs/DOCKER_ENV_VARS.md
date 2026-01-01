# Docker Environment Variables Strategy

## Overview

This document describes how environment variables are handled in Starbunk's Docker images, including which variables are baked into images at build time and which must be provided at runtime.

## Architecture

### Build-Time vs Runtime Environment Variables

Starbunk follows a **layered approach** to environment variables:

1. **Build-time defaults** - Non-secret configuration baked into the image
2. **Runtime overrides** - Values from `.env` file or docker-compose environment
3. **Precedence** - Runtime values **always override** build-time defaults

This ensures:
- Faster deployments (common config pre-set)
- Security (secrets never baked in)
- Flexibility (easy to override for different environments)

## Variable Categories

### 🔐 Secrets (NEVER baked into images)

These must be provided via `.env` file or runtime environment:

```bash
# Discord Bot Tokens
STARBUNK_TOKEN
BUNKBOT_TOKEN
DJCOVA_TOKEN
STARBUNK_DND_TOKEN
COVABOT_TOKEN
SNOWBUNK_TOKEN

# API Keys
OPENAI_API_KEY
GEMINI_API_KEY
QDRANT_API_KEY

# Database
POSTGRES_PASSWORD
DATABASE_URL

# Other Secrets
METRICS_AUTH_TOKEN
E2E_MONITOR_TOKEN
JWT_SECRET
API_KEY
```

### ✅ Non-Secrets (Can be baked into images)

These configuration values are set at build time with defaults that can be overridden at runtime:

#### Debug & Environment Settings
- `DEBUG_MODE` (false for production, true for PR builds)
- `NODE_ENV` (production/development)
- `LOG_LEVEL` (info/debug)
- `LOG_FORMAT` (json)

#### Observability Settings
- `ENABLE_METRICS` (true)
- `ENABLE_STRUCTURED_LOGGING` (true)
- `ENABLE_RUNTIME_METRICS` (true)
- `METRICS_PUSH_INTERVAL` (30000)

#### Service Ports
- `METRICS_PORT` (3000)
- `HEALTH_PORT` (3000)

#### Model Configuration
- `OLLAMA_DEFAULT_MODEL`
- `OLLAMA_AUTO_PULL_MODELS`
- `OLLAMA_PULL_ON_STARTUP`
- `OLLAMA_PULL_TIMEOUT_MS`
- `OPENAI_DEFAULT_MODEL`
- `GEMINI_DEFAULT_MODEL`

#### Other Settings
- `USE_DATABASE` (for CovaBot)
- Various embedding and performance tuning settings

## Build Configurations

### PR Builds (Debug Mode)

PR builds automatically enable debug settings:

```yaml
build-args: |
  DEBUG_MODE=true
  NODE_ENV=development
  LOG_LEVEL=debug
```

When a PR is merged, a new production image is built with production settings.

### Production Builds (Main Branch)

Production builds use optimized settings:

```yaml
build-args: |
  DEBUG_MODE=false
  NODE_ENV=production
  LOG_LEVEL=info
```

### Manual Builds

Manual workflow dispatches use production settings by default.

## Runtime Override Example

Even if an image was built with `DEBUG_MODE=false`, you can override it at runtime:

### Using .env file:
```bash
# .env
DEBUG_MODE=true
LOG_LEVEL=debug
```

### Using docker-compose.yml:
```yaml
services:
  bunkbot:
    image: ghcr.io/andrewgari/bunkbot:latest
    environment:
      - DEBUG_MODE=true
      - LOG_LEVEL=debug
```

### Using docker run:
```bash
docker run -e DEBUG_MODE=true -e LOG_LEVEL=debug ghcr.io/andrewgari/bunkbot:latest
```

The runtime value **always takes precedence** over the baked-in value.

## Image Tags

Different image tags are created for different purposes and environments:

### PR Images (Debug/Development)
- **Tag**: `pr-<number>` (e.g., `pr-123`)
- **Build Settings**: `DEBUG_MODE=true`, `NODE_ENV=development`, `LOG_LEVEL=debug`
- **Trigger**: Opening or updating a pull request
- **Purpose**: Testing and development
- **Example**: `ghcr.io/andrewgari/bunkbot:pr-123`

### Staging Images (Pre-Release/Debug)
- **Tag**: `staging`
- **Build Settings**: `DEBUG_MODE=true`, `NODE_ENV=development`, `LOG_LEVEL=debug`
- **Trigger**: Creating a pre-release on GitHub
- **Purpose**: Staging/pre-production testing with debug enabled
- **Example**: `ghcr.io/andrewgari/bunkbot:staging`
- **Also Tagged**: Release version (e.g., `v1.0.0-beta.1`)

### Latest Images (Production)
- **Tag**: `latest`
- **Build Settings**: `DEBUG_MODE=false`, `NODE_ENV=production`, `LOG_LEVEL=info`
- **Trigger**: Merging to main branch
- **Purpose**: Latest production-ready build
- **Example**: `ghcr.io/andrewgari/bunkbot:latest`
- **Also Tagged**: `<sha>`, `<timestamp>-<sha>-stable`

### Production Images (Release)
- **Tag**: `prod`
- **Build Settings**: `DEBUG_MODE=false`, `NODE_ENV=production`, `LOG_LEVEL=info`
- **Trigger**: Creating a full release on GitHub
- **Purpose**: Stable production releases
- **Example**: `ghcr.io/andrewgari/bunkbot:prod`
- **Also Tagged**: Release version (e.g., `v1.0.0`)

## Image Build Matrix Summary

| Trigger | Tag(s) | DEBUG_MODE | NODE_ENV | LOG_LEVEL | Purpose |
|---------|--------|------------|----------|-----------|---------|
| PR opened/updated | `pr-<number>` | `true` | `development` | `debug` | Testing & Development |
| Pre-Release created | `staging`, `v1.x.x-beta` | `true` | `development` | `debug` | Staging Environment |
| Merge to main | `latest`, `<sha>` | `false` | `production` | `info` | Production (Rolling) |
| Release created | `prod`, `v1.x.x` | `false` | `production` | `info` | Production (Stable) |

## Security Best Practices

1. **Never commit secrets** to the repository
2. **Never add secrets to Dockerfiles** or build args
3. **Always use `.env` files** for secrets (and add to `.gitignore`)
4. **Use GitHub Secrets** for CI/CD secrets
5. **Regularly rotate** API keys and tokens
6. **Audit image contents** to ensure no secrets leaked in

## Verifying Build Configuration

To check what environment variables are baked into an image:

```bash
# Inspect the image
docker inspect ghcr.io/andrewgari/bunkbot:latest

# Run with --entrypoint to see env vars
docker run --rm --entrypoint env ghcr.io/andrewgari/bunkbot:latest | grep DEBUG_MODE
```

## Troubleshooting

### Problem: Environment variable not taking effect
**Solution**: Ensure you're providing it at runtime via `.env` or docker-compose environment section

### Problem: Debug mode active in production
**Solution**: Check your `.env` file and docker-compose.yml for `DEBUG_MODE=true`

### Problem: Need different config for different environments
**Solution**: Create separate `.env` files (`.env.production`, `.env.staging`) and specify which to use

## CI/CD Workflow Summary

### Image Build Separation

The CI/CD pipeline uses **four separate workflows** to ensure appropriate settings for each environment:

1. **PR Validation Workflow** (`pr-validation.yml`):
   - **Trigger**: Pull request events only (opened, updated, labeled)
   - **Build args**: `DEBUG_MODE=true`, `NODE_ENV=development`, `LOG_LEVEL=debug`
   - **Image tags**: `pr-<number>` (e.g., `ghcr.io/andrewgari/bunkbot:pr-123`)
   - **Purpose**: Testing and development
   - **Note**: This workflow does NOT run on pushes to main, preventing debug images from being created on merge

2. **Production Deployment Workflow** (`publish-main.yml`):
   - **Trigger**: Pushes to main branch (including PR merges)
   - **Build args**: `DEBUG_MODE=false`, `NODE_ENV=production`, `LOG_LEVEL=info`
   - **Image tags**: `latest`, `<sha>`, `<timestamp>-<sha>-stable`
   - **Purpose**: Production deployments (rolling/continuous)
   - **Note**: Always builds fresh images with production settings when code is merged

3. **Release Workflow - Pre-Release** (`release.yml`):
   - **Trigger**: Creating a pre-release on GitHub
   - **Build args**: `DEBUG_MODE=true`, `NODE_ENV=development`, `LOG_LEVEL=debug`
   - **Image tags**: `staging`, release version (e.g., `v1.0.0-beta.1`)
   - **Purpose**: Staging/pre-production environment with debug enabled
   - **Note**: Builds fresh images (not just tags) with debug settings for staging validation

4. **Release Workflow - Production Release** (`release.yml`):
   - **Trigger**: Creating a full release on GitHub
   - **Build args**: `DEBUG_MODE=false`, `NODE_ENV=production`, `LOG_LEVEL=info`
   - **Image tags**: `prod`, release version (e.g., `v1.0.0`)
### What Happens in Each Scenario

#### When a PR is Opened/Updated
1. PR validation workflow (`pr-validation.yml`) runs
2. Images built with `DEBUG_MODE=true`, `NODE_ENV=development`
3. Tagged as `pr-<number>` for testing
4. PR image remains isolated from production images

#### When a PR Merges to Main
1. **Only** the production workflow (`publish-main.yml`) runs
2. New production images built with `DEBUG_MODE=false`, `NODE_ENV=production`
3. Images tagged as `latest`, `<sha>`, etc.
4. PR image (with debug mode) remains separate with its `pr-<number>` tag
5. **Production images never inherit debug settings from PR builds**

#### When a Pre-Release is Created
1. Release workflow (`release.yml`) runs with pre-release flag
2. **New images built** (not just tagged) with `DEBUG_MODE=true`, `NODE_ENV=development`
3. Tagged as `staging` and version (e.g., `v1.0.0-beta.1`)
4. Suitable for staging environment testing with debug enabled

#### When a Production Release is Created
1. Release workflow (`release.yml`) runs for full release
2. **New images built** (not just tagged) with `DEBUG_MODE=false`, `NODE_ENV=production`
3. Tagged as `prod` and version (e.g., `v1.0.0`)
4. Stable production-ready images

### Manual Builds

Manual workflow dispatches use production settings by default, but can be customized via workflow inputs.

## Additional Resources

- [Docker ARG vs ENV](https://docs.docker.com/engine/reference/builder/#understand-how-arg-and-from-interact)
- [Best practices for secrets](https://docs.docker.com/build/building/secrets/)
- [Environment variables in Compose](https://docs.docker.com/compose/environment-variables/)
