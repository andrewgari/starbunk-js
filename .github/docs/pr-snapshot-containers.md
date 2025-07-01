# PR Snapshot Container System

## 🎯 Overview

The PR Snapshot Container System provides convenient "latest" references for each Pull Request while maintaining the ability to reference specific builds when needed. This system automatically creates and manages container snapshots for all PR builds.

## 📦 Container Naming Convention

### For Pull Requests
Each PR generates **two types** of container images:

#### 1. Specific Versioned Containers
- **Format**: `pr-{pr-number}-{short-sha}`
- **Example**: `ghcr.io/andrewgari/starbunk-bunkbot:pr-235-abc1234`
- **Purpose**: Immutable reference to a specific build
- **Retention**: Kept for historical reference until PR cleanup

#### 2. Snapshot Containers (Latest)
- **Format**: `pr-{pr-number}-snapshot`
- **Example**: `ghcr.io/andrewgari/starbunk-bunkbot:pr-235-snapshot`
- **Purpose**: Always points to the most recent build of that PR
- **Behavior**: Updated in-place with each new PR push

### For Main Branch
- **Latest**: `ghcr.io/andrewgari/starbunk-bunkbot:latest`
- **Versioned**: `ghcr.io/andrewgari/starbunk-bunkbot:main-{short-sha}`

## 🔄 Snapshot Update Behavior

### First PR Push
```bash
# Creates both containers pointing to the same image
ghcr.io/andrewgari/starbunk-bunkbot:pr-235-abc1234  # Specific version
ghcr.io/andrewgari/starbunk-bunkbot:pr-235-snapshot # Snapshot (latest)
```

### Subsequent PR Pushes
```bash
# New specific version created
ghcr.io/andrewgari/starbunk-bunkbot:pr-235-def5678  # New specific version

# Snapshot updated in-place to point to new image
ghcr.io/andrewgari/starbunk-bunkbot:pr-235-snapshot # Updated to def5678
```

### Result
- **Snapshot tag** always references the most current version
- **Specific versions** remain immutable for reproducible builds
- **No duplicate snapshot containers** - only one per PR

## 🚀 Usage Examples

### For Testing (Recommended)
```bash
# Pull the latest snapshot - always gets the most recent build
docker pull ghcr.io/andrewgari/starbunk-bunkbot:pr-235-snapshot

# Run the container
docker run -d --name test-bunkbot ghcr.io/andrewgari/starbunk-bunkbot:pr-235-snapshot
```

### For Reproducible Builds
```bash
# Pull a specific version - immutable reference
docker pull ghcr.io/andrewgari/starbunk-bunkbot:pr-235-abc1234

# This will always be the exact same image
docker run -d --name stable-bunkbot ghcr.io/andrewgari/starbunk-bunkbot:pr-235-abc1234
```

### Docker Compose Example
```yaml
version: '3.8'
services:
  bunkbot:
    image: ghcr.io/andrewgari/starbunk-bunkbot:pr-235-snapshot
    environment:
      - DEBUG_MODE=true
    restart: unless-stopped

  djcova:
    image: ghcr.io/andrewgari/starbunk-djcova:pr-235-snapshot
    environment:
      - DEBUG_MODE=true
    restart: unless-stopped
```

## 🗑️ Cleanup & Retention Policy

### Automatic Cleanup
1. **PR Closed/Merged**: All PR-related containers are immediately deleted
2. **Weekly Cleanup**: Removes old PR containers from closed PRs (30+ days)
3. **Untagged Images**: Removes orphaned untagged images

### Retention Rules
- ✅ **Keep**: Latest production images (`latest`, `main-*`)
- ✅ **Keep**: Current PR snapshots (open PRs)
- ✅ **Keep**: Recent PR containers (< 30 days, even if PR closed)
- 🗑️ **Delete**: Old PR containers (30+ days, PR closed)
- 🗑️ **Delete**: Untagged/orphaned images
- 🗑️ **Delete**: All PR containers when PR is closed

### Manual Cleanup
```bash
# Trigger cleanup workflow manually
gh workflow run container-registry-cleanup.yml

# Dry run to see what would be deleted
gh workflow run container-registry-cleanup.yml -f dry_run=true

# Custom retention period
gh workflow run container-registry-cleanup.yml -f retention_days=14
```

## 🔍 Monitoring & Visibility

### PR Comments
Each successful container build adds a comment to the PR with:
- 📦 Available image tags (both snapshot and specific)
- 🚀 Quick start commands
- ℹ️ Container information and cleanup policy

### Build Logs
Enhanced logging shows:
- 📋 Available images for each container
- 🚀 Push status for each tag
- 📦 Snapshot system information
- 🔄 In-place update confirmation

### Registry Cleanup Logs
Detailed cleanup reporting includes:
- 📊 Total versions scanned and deleted
- 🔓 Open PRs protected from deletion
- 📅 Retention period and cutoff dates
- 💡 Dry run simulation results

## 🛠️ Implementation Details

### Workflow Integration
The system is integrated into:
- **Main Build Workflow**: `container-build-test-publish.yml`
- **Cleanup Workflow**: `container-registry-cleanup.yml`

### Docker Metadata Action
Uses `docker/metadata-action@v5` to generate tags:
```yaml
tags: |
  # For PR builds - create both specific versioned and snapshot tags
  type=raw,value=pr-${{ github.event.pull_request.number }}-{{sha}},enable=${{ github.event_name == 'pull_request' }}
  type=raw,value=pr-${{ github.event.pull_request.number }}-snapshot,enable=${{ github.event_name == 'pull_request' }}
```

### GitHub Container Registry
- **Registry**: `ghcr.io`
- **Permissions**: Managed through GitHub Actions permissions
- **API**: Uses GitHub REST API for cleanup operations

## 🎯 Benefits

### For Developers
- 🔄 **Always Latest**: Snapshot tags automatically update
- 🏷️ **Reproducible**: Specific versions for consistent testing
- 🚀 **Easy Testing**: Simple pull commands for PR testing
- 🗑️ **No Maintenance**: Automatic cleanup prevents registry bloat

### For CI/CD
- 📦 **Efficient Storage**: In-place updates reduce storage usage
- 🔄 **Consistent Naming**: Predictable tag patterns
- 🛡️ **Safety**: Protects open PRs from cleanup
- 📊 **Visibility**: Comprehensive logging and monitoring

### For Operations
- 🗑️ **Automatic Cleanup**: No manual registry maintenance
- 📅 **Configurable Retention**: Adjustable cleanup policies
- 🔍 **Dry Run Support**: Safe cleanup testing
- 📊 **Detailed Reporting**: Complete cleanup visibility

## 🚨 Important Notes

1. **Snapshot Updates**: Snapshot tags are updated in-place, so always pull before use
2. **Immutable Versions**: Specific versioned tags never change
3. **Cleanup Timing**: PR containers are deleted immediately when PR closes
4. **Open PR Protection**: Cleanup workflows never delete containers for open PRs
5. **Registry Limits**: GitHub Container Registry has storage limits - cleanup helps manage usage

## 🔗 Related Documentation

- [Path-Based Conditional Builds](path-based-builds.md)
- [Container Build Workflow](../workflows/container-build-test-publish.yml)
- [Registry Cleanup Workflow](../workflows/container-registry-cleanup.yml)
