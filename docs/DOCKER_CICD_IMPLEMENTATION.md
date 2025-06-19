# Docker CI/CD Pipeline Implementation

## Overview

This document describes the complete Docker CI/CD pipeline implementation for the Starbunk-js project with 4 containers: `bunkbot`, `djcova`, `starbunk-dnd`, and `covabot`.

## Pipeline Architecture

### 1. **PR Docker Images** (High Priority ✅)
- **Workflow**: `.github/workflows/docker-publish.yml`
- **Trigger**: PR opened/updated/reopened
- **Functionality**: 
  - Builds and publishes Docker images tagged with `pr-{PR_NUMBER}`
  - Uses path-based detection to only build changed containers
  - Publishes to GitHub Container Registry (GHCR)
  - Comments on PR with image details
  - Automatically cleans up images when PR is closed

### 2. **Main Branch Images** (Critical ✅)
- **Workflow**: `.github/workflows/ci.yml` (modified)
- **Trigger**: Push to main branch
- **Functionality**:
  - Builds and publishes images tagged as `latest`
  - Includes SHA-based tags for traceability
  - All 4 containers are built and published on main branch changes
  - Uses path-based detection for efficiency

### 3. **Manual Workflow Triggers** (✅)
- **Workflow**: `.github/workflows/manual-docker-build.yml`
- **Trigger**: Manual workflow dispatch
- **Functionality**:
  - Allows manual execution from any branch
  - Supports individual container builds or all containers
  - Flexible tagging: `dev-{BRANCH_NAME}`, `test-{SHORT_SHA}`, `latest`, or custom tags
  - Optional registry publishing

### 4. **PR Cleanup** (✅)
- **Workflows**: 
  - `.github/workflows/pr-cleanup.yml`
  - `.github/workflows/docker-publish.yml` (integrated cleanup)
- **Trigger**: PR closed/merged
- **Functionality**: Removes PR images from registry automatically

## Image Naming Convention

All images follow the pattern: `ghcr.io/andrewgari/starbunk-{container}:{tag}`

### Examples:
- **PR Images**: `ghcr.io/andrewgari/starbunk-bunkbot:pr-233`
- **Main Branch**: `ghcr.io/andrewgari/starbunk-bunkbot:latest`
- **Manual Dev**: `ghcr.io/andrewgari/starbunk-bunkbot:dev-feature-branch`
- **Manual Test**: `ghcr.io/andrewgari/starbunk-bunkbot:test-abc1234`

## Container Specifications

### BunkBot
- **Purpose**: Reply bots and admin commands
- **Dependencies**: Discord + webhooks + basic DB
- **Port**: 3000
- **System Deps**: openssl

### DJCova
- **Purpose**: Music service (Discord voice only)
- **Dependencies**: Discord voice only
- **Port**: 3001
- **System Deps**: ffmpeg, openssl, python3

### Starbunk-DND
- **Purpose**: D&D features and Snowbunk bridge
- **Dependencies**: Full stack + LLM + bridge
- **Port**: 3002
- **System Deps**: openssl, python3

### CovaBot
- **Purpose**: AI personality bot
- **Dependencies**: Discord + LLM + minimal DB
- **Port**: 3003
- **System Deps**: openssl

## Path-Based Detection

The workflows use intelligent path detection to only build containers when relevant files change:

```yaml
shared:
  - 'containers/shared/**'
bunkbot:
  - 'containers/bunkbot/**'
djcova:
  - 'containers/djcova/**'
starbunk-dnd:
  - 'containers/starbunk-dnd/**'
covabot:
  - 'containers/covabot/**'
```

**Special Rules**:
- Changes to `containers/shared/**` trigger all container builds
- Changes to root files (package.json, etc.) trigger all container builds
- Changes to workflows trigger all container builds

## Security & Best Practices

### Container Security
- Multi-stage builds for smaller production images
- Non-root users for all containers
- Minimal system dependencies
- Security scanning integrated

### Registry Security
- Uses GitHub Container Registry (GHCR)
- Authenticated with GitHub tokens
- Proper permissions (packages: write)
- Automatic cleanup of temporary images

## Build Process

### Shared Package Linking
Each container follows this build pattern:
1. Install shared package dependencies
2. Install container-specific dependencies
3. Build shared package and create tarball
4. Install shared package tarball in container
5. Build container application
6. Create production image with built artifacts

### Caching Strategy
- GitHub Actions cache for Docker layers
- Scoped caching per container for efficiency
- Cache reuse across builds

## Workflow Files Summary

| File | Purpose | Triggers |
|------|---------|----------|
| `ci.yml` | Main CI + Docker publishing | Push to main, PRs |
| `docker-publish.yml` | PR Docker images | PR events |
| `manual-docker-build.yml` | Manual builds | workflow_dispatch |
| `pr-cleanup.yml` | Image cleanup | PR closed |
| `docker-build-reusable.yml` | Shared build logic | Called by other workflows |

## Usage Examples

### Pull a PR Image
```bash
docker pull ghcr.io/andrewgari/starbunk-bunkbot:pr-233
```

### Pull Latest Production Image
```bash
docker pull ghcr.io/andrewgari/starbunk-bunkbot:latest
```

### Manual Build Trigger
1. Go to Actions tab in GitHub
2. Select "Manual Docker Build and Push"
3. Choose containers and tag strategy
4. Run workflow

## Troubleshooting

### Common Issues
1. **Build Failures**: Check shared package linking in Dockerfile
2. **Permission Errors**: Verify GITHUB_TOKEN has packages:write permission
3. **Image Not Found**: Check naming convention and registry permissions

### Monitoring
- All workflows provide detailed summaries
- PR comments show published images
- GitHub Actions logs provide build details
- Container registry shows all published images

## Next Steps

1. **Test the pipeline** by creating a PR with container changes
2. **Verify main branch publishing** works correctly
3. **Test manual workflows** for different scenarios
4. **Monitor and optimize** build times and caching
5. **Add integration tests** for published images
