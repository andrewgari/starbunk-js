# GitHub Actions Workflows

This directory contains the CI/CD workflows for the Starbunk Discord Bot project.

## 🚀 **Optimized Container Workflow**

### **Primary Workflow: `container-build-test-publish.yml`**

This is our main workflow that efficiently handles container building, testing, and publishing in a single pipeline to avoid duplication.

**Key Features:**
- ✅ **Single Build**: Builds each Docker container only once
- ✅ **Smart Testing**: Tests containers after building but before publishing
- ✅ **Conditional Publishing**: Only publishes if tests pass and conditions are met
- ✅ **Efficient Caching**: Uses GitHub Actions cache and Docker layer caching
- ✅ **Path-based Optimization**: Only processes containers that have changed
- ✅ **Artifact Reuse**: Reuses built images between jobs to avoid rebuilding

**Workflow Stages:**
1. **🔍 Detect Changes** - Determines which containers need processing
2. **📦 Test Shared Package** - Validates shared dependencies
3. **🐳 Build & Test** - Builds containers and runs validation tests
4. **📦 Publish** - Publishes validated containers to registry

**Triggers:**
- **Push to main/develop**: Builds, tests, and publishes with `latest` tags
- **Pull Requests**: Builds, tests, and publishes with `pr-{number}-snapshot` tags
- **PR Closure**: Automatically cleans up PR snapshot images

## Workflows Overview

### 1. `docker-publish.yml` - PR Docker Image Publisher
**Triggers:** Pull request opened, synchronized, reopened, or closed
**Purpose:** Creates temporary Docker images for PR testing and cleans them up when PR is closed

**Features:**
- 🔍 **Smart Change Detection**: Only builds containers that have changed
- 🚀 **Automatic Publishing**: Publishes PR images to GitHub Container Registry
- 💬 **PR Comments**: Adds comments with image pull commands
- 🗑️ **Automatic Cleanup**: Removes PR images when PR is closed

**Image Naming:**
- Format: `ghcr.io/andrewgari/starbunk-js/{container}:pr-{number}`
- Example: `ghcr.io/andrewgari/starbunk-js/bunkbot:pr-123`

### 2. `pr-checks.yml` - Pull Request Validation
**Triggers:** Pull request opened, synchronized, reopened
**Purpose:** Validates code quality, types, builds, and tests

**Checks:**
- 🔍 **ESLint**: Code quality and style checks
- 🔧 **TypeScript**: Type checking
- 🔨 **Build**: Compilation verification
- 🧪 **Unit Tests**: Jest test execution
- 🐳 **Docker Build**: Container build verification (no push)

### 3. `ci.yml` - Continuous Integration
**Triggers:** Push to main/develop, pull requests to main
**Purpose:** Comprehensive testing and container building

**Jobs:**
- 📦 **Shared Package Testing**: Tests the shared utilities
- 🧪 **Container Testing**: Tests individual containers
- 🐳 **Docker Building**: Builds container images
- 🔗 **Integration Testing**: End-to-end testing with Docker Compose

### 4. `pr-cleanup.yml` - PR Artifact Cleanup
**Triggers:** Pull request closed
**Purpose:** Removes PR-specific artifacts and images

**Cleanup Actions:**
- 🗑️ **Container Images**: Removes all PR Docker images
- 📝 **Logging**: Provides detailed cleanup logs

## Container Architecture

The workflows support the modular container architecture:

- **bunkbot**: Reply bots and admin commands
- **djcova**: Music service (Discord voice)
- **starbunk-dnd**: D&D features with LLM integration
- **covabot**: AI personality bot
- **shared**: Common utilities and services

## Path-Based Optimization

Workflows use intelligent path detection to only run jobs for changed components:

```yaml
# Example: Only test containers that changed
if: ${{ needs.detect-changes.outputs.any-container-changed == 'true' }}
```

**Monitored Paths:**
- `containers/shared/**` → Affects all containers
- `containers/{container}/**` → Affects specific container
- `package.json`, `tsconfig.json` → Affects all containers
- `.github/workflows/**` → Triggers full rebuild
- `Dockerfile*`, `docker-compose*.yml` → Triggers Docker builds

## Security & Permissions

**Required Permissions:**
- `packages: write` - For publishing/deleting container images
- `contents: read` - For accessing repository content
- `pull-requests: write` - For commenting on PRs

**Authentication:**
- Uses `GITHUB_TOKEN` for GitHub Container Registry
- No additional secrets required for basic functionality

## Usage Examples

### Testing a PR
1. Create a pull request
2. Workflows automatically run validation
3. Docker images are published with PR-specific tags
4. Use the provided pull commands to test images locally

### Local Testing
```bash
# Pull a PR image for testing
docker pull ghcr.io/andrewgari/starbunk-js/bunkbot:pr-123

# Run the PR image
docker run -d --name test-bunkbot ghcr.io/andrewgari/starbunk-js/bunkbot:pr-123
```

### Manual Cleanup
If automatic cleanup fails, you can manually delete images:
```bash
# List all package versions
gh api /user/packages/container/starbunk-js%2Fbunkbot/versions

# Delete specific version
gh api --method DELETE /user/packages/container/starbunk-js%2Fbunkbot/versions/{version_id}
```

## Troubleshooting

### Common Issues

1. **Docker Build Failures**
   - Check Dockerfile syntax
   - Verify build context includes necessary files
   - Check for missing dependencies

2. **Permission Errors**
   - Ensure repository has `packages: write` permission
   - Check if GITHUB_TOKEN has sufficient scope

3. **Image Not Found**
   - Verify the container name matches the matrix
   - Check if the PR triggered the docker-publish workflow

4. **Cleanup Failures**
   - Images may not exist (normal for first-time PRs)
   - Permission issues are logged but don't fail the job

### Debugging

Enable debug logging by setting repository secret:
```
ACTIONS_STEP_DEBUG = true
```

View workflow logs in the Actions tab for detailed information.
