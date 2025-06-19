# Starbunk Docker Images

This document explains how to publish and use the individual Docker images for each Starbunk service.

## 📦 Published Images

Each service is published as a separate image to GitHub Container Registry (GHCR):

| Service | Image | Description |
|---------|-------|-------------|
| BunkBot | `ghcr.io/andrewgari/starbunk/bunkbot:latest` | Reply bots and admin commands |
| DJCova | `ghcr.io/andrewgari/starbunk/djcova:latest` | Music service |
| Starbunk-DND | `ghcr.io/andrewgari/starbunk/starbunk-dnd:latest` | D&D features and bridge |
| CovaBot | `ghcr.io/andrewgari/starbunk/covabot:latest` | AI personality bot |

## 🚀 Publishing Images

### Quick Start
```bash
# Check if images exist
./check-images.sh

# Publish all images with latest tag
./publish-images.sh
```

### Manual Publishing Options

#### 1. Automatic (Push to Main)
```bash
git push origin main
```
- Automatically builds and publishes `latest` tags for changed containers
- Uses smart change detection

#### 2. Manual Workflow (GitHub CLI)
```bash
# Publish all containers with latest tag
gh workflow run "Manual Docker Build and Push" \
  --field containers=all \
  --field tag_prefix=release \
  --field push_to_registry=true

# Publish specific containers
gh workflow run "Manual Docker Build and Push" \
  --field containers=bunkbot,djcova \
  --field tag_prefix=dev \
  --field push_to_registry=true
```

#### 3. GitHub Web Interface
1. Go to [Actions](https://github.com/andrewgari/starbunk-js/actions)
2. Select "Manual Docker Build and Push"
3. Click "Run workflow"
4. Configure options and run

## 🏃‍♂️ Using Published Images

### Production Deployment
```bash
# Start production containers (pulls from GHCR)
./start-production.sh

# Or manually
docker-compose pull
docker-compose up -d
```

### Development
```bash
# Use local development setup
docker-compose -f docker-compose.dev.yml up -d
```

### PR Testing
```bash
# Test specific PR images
./pr-images.sh

# Or create override file for testing
echo 'version: "3.8"
services:
  bunkbot:
    image: ghcr.io/andrewgari/starbunk/bunkbot:pr-123-snapshot' > docker-compose.pr-test.yml

docker-compose -f docker-compose.yml -f docker-compose.pr-test.yml up bunkbot
```

## 🏷️ Image Tags

| Tag Pattern | Description | Trigger |
|-------------|-------------|---------|
| `latest` | Production release | Push to main or manual release |
| `pr-{number}-snapshot` | Pull request builds (predictable, reusable) | PR updates |
| `dev-{branch}` | Development builds | Manual dev builds |
| `test-{sha}` | Test builds | Manual test builds |

## 🔍 Verification

### Check if Images Exist
```bash
# Quick check
./check-images.sh

# Manual check
docker manifest inspect ghcr.io/andrewgari/starbunk/bunkbot:latest
```

### Pull Images Manually
```bash
docker pull ghcr.io/andrewgari/starbunk/bunkbot:latest
docker pull ghcr.io/andrewgari/starbunk/djcova:latest
docker pull ghcr.io/andrewgari/starbunk/starbunk-dnd:latest
docker pull ghcr.io/andrewgari/starbunk/covabot:latest
```

### Pull PR Images
```bash
# Pull specific PR images (predictable naming)
docker pull ghcr.io/andrewgari/starbunk/bunkbot:pr-123-snapshot
docker pull ghcr.io/andrewgari/starbunk/djcova:pr-123-snapshot

# Use helper script for PR image management
./pr-images.sh
```

## 🔐 Authentication

If images are private, authenticate with GHCR:
```bash
docker login ghcr.io -u andrewgari
```

## 📊 Monitoring

- **GitHub Actions**: https://github.com/andrewgari/starbunk-js/actions
- **Packages**: https://github.com/andrewgari?tab=packages
- **Container Registry**: https://github.com/andrewgari/starbunk-js/pkgs/container

## 🛠️ Troubleshooting

### Images Don't Exist
1. Run `./publish-images.sh` to trigger builds
2. Wait 5-10 minutes for completion
3. Check GitHub Actions for build status

### Pull Failures
1. Check if you're authenticated: `docker login ghcr.io`
2. Verify image names are correct
3. Check if images are public or you have access

### Build Failures
1. Check GitHub Actions logs
2. Verify Dockerfiles are correct
3. Ensure all dependencies are available

## 🔄 CI/CD Workflow

The repository uses sophisticated CI/CD with:
- **Smart change detection** - only builds what changed
- **Multi-platform support** - linux/amd64
- **Caching** - faster subsequent builds
- **Automatic cleanup** - PR images are deleted when PR closes
