# Container Image Cleanup Guide

This guide provides multiple methods to clean up published container images in your GitHub Container Registry (GHCR).

## 🎯 Quick Reference

| Method | Best For | Difficulty | Automation |
|--------|----------|------------|------------|
| [GitHub Web UI](#method-1-github-web-interface) | Manual cleanup, visual inspection | Easy | None |
| [GitHub CLI Scripts](#method-2-github-cli-scripts) | Bulk operations, scripted cleanup | Medium | High |
| [GitHub Actions](#method-3-automated-cleanup-workflow) | Scheduled cleanup, maintenance | Easy | Full |
| [Manual API Calls](#method-4-manual-api-calls) | Custom scenarios, debugging | Hard | Medium |

## Method 1: GitHub Web Interface

### 🌐 Access Your Packages
1. Go to your GitHub profile: `https://github.com/andrewgari`
2. Click the "Packages" tab
3. You'll see your container packages: `bunkbot`, `djcova`, `starbunk-dnd`, `covabot`

### 🗑️ Delete Specific Versions
1. Click on a package name (e.g., `bunkbot`)
2. You'll see all versions with their tags and creation dates
3. Select the versions you want to delete
4. Click "Delete" and confirm

### 📋 What You'll See
- **latest**: Production images (keep these)
- **pr-123-snapshot**: PR testing images (safe to delete)
- **main-abc1234**: Branch-based images (safe to delete old ones)
- **Untagged**: Failed or intermediate builds (safe to delete)

## Method 2: GitHub CLI Scripts

### 📥 Prerequisites
```bash
# Install GitHub CLI
# macOS
brew install gh

# Ubuntu/Debian
sudo apt install gh

# Windows
winget install GitHub.cli

# Authenticate
gh auth login
```

### 🧹 General Cleanup Script

Use the provided `cleanup-images.sh` script:

```bash
# Make executable
chmod +x cleanup-images.sh

# Show what would be deleted (dry run)
./cleanup-images.sh --dry-run --pr-only

# Delete all PR snapshot images
./cleanup-images.sh --pr-only

# Delete images older than 30 days (except latest)
./cleanup-images.sh --old-only

# Delete all versions except latest (dangerous!)
./cleanup-images.sh --all --dry-run
```

### 🎯 PR-Specific Cleanup

Use the `cleanup-pr-images.sh` script:

```bash
# Make executable
chmod +x cleanup-pr-images.sh

# Delete snapshots for specific PR
./cleanup-pr-images.sh 123

# Delete all PR snapshots
./cleanup-pr-images.sh
```

### 💡 Manual GitHub CLI Commands

```bash
# List all packages
gh api /user/packages?package_type=container

# List versions for a specific container
gh api /users/andrewgari/packages/container/bunkbot/versions

# Delete a specific version
gh api -X DELETE /users/andrewgari/packages/container/bunkbot/versions/VERSION_ID
```

## Method 3: Automated Cleanup Workflow

### ⚙️ Scheduled Cleanup
The `cleanup-old-images.yml` workflow runs automatically:
- **Weekly**: Every Sunday at 2 AM UTC
- **Targets**: Images older than 30 days (except `latest`)
- **Safe**: Preserves production images

### 🚀 Manual Trigger
1. Go to Actions tab in your repository
2. Select "Cleanup Old Container Images"
3. Click "Run workflow"
4. Choose cleanup type:
   - **old-images**: Delete images older than X days
   - **pr-snapshots**: Delete all PR snapshot images
   - **untagged**: Delete untagged images
   - **dry-run**: Show what would be deleted

### 📊 Monitoring
- Check workflow runs in the Actions tab
- Review the summary for cleanup statistics
- Logs show detailed information about deleted images

## Method 4: Manual API Calls

### 🔧 Using curl

```bash
# Get your GitHub token
GITHUB_TOKEN="your_token_here"
OWNER="andrewgari"

# List packages
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     "https://api.github.com/users/$OWNER/packages?package_type=container"

# List versions for bunkbot
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     "https://api.github.com/users/$OWNER/packages/container/bunkbot/versions"

# Delete a specific version
curl -X DELETE \
     -H "Authorization: Bearer $GITHUB_TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     "https://api.github.com/users/$OWNER/packages/container/bunkbot/versions/VERSION_ID"
```

## 🛡️ Safety Guidelines

### ✅ Safe to Delete
- **PR snapshots**: `pr-123-snapshot` tags
- **Old branch images**: `main-abc1234` older than 30 days
- **Untagged images**: Usually failed builds
- **Development tags**: `dev-*`, `test-*`

### ⚠️ Be Careful With
- **Latest tags**: `latest` (production images)
- **Recent images**: Less than 7 days old
- **Semantic versions**: `v1.0.0`, `1.2.3`

### ❌ Never Delete
- **Production images**: Currently deployed versions
- **Latest stable**: The `latest` tag unless you're sure

## 📈 Cleanup Strategies

### 🔄 Regular Maintenance
```bash
# Weekly cleanup of PR snapshots
./cleanup-images.sh --pr-only

# Monthly cleanup of old images
./cleanup-images.sh --old-only
```

### 🚨 Emergency Cleanup
```bash
# When storage is full - be very careful!
./cleanup-images.sh --dry-run --all  # Check first
./cleanup-images.sh --old-only       # Start conservative
```

### 🎯 Targeted Cleanup
```bash
# After PR is merged
./cleanup-pr-images.sh 123

# Before major release
./cleanup-images.sh --dry-run --old-only
```

## 🔍 Monitoring & Verification

### 📊 Check Package Sizes
```bash
# List packages with sizes
gh api /user/packages?package_type=container | jq '.[] | {name, repository, updated_at}'
```

### 📈 Track Cleanup Results
- Monitor GitHub Actions workflow summaries
- Check package sizes before/after cleanup
- Verify production images are intact

### 🚨 Rollback Plan
If you accidentally delete important images:
1. Check if the image is still in CI/CD cache
2. Rebuild from the source code commit
3. Re-tag and push the rebuilt image

## 🤖 Automation Tips

### 📅 Scheduled Cleanup
- Use the GitHub Actions workflow for regular maintenance
- Adjust the schedule based on your development velocity
- Monitor cleanup logs for any issues

### 🔗 Integration with CI/CD
- Add cleanup steps to your deployment workflows
- Clean up PR images when PRs are closed (already implemented)
- Set up alerts for storage usage

### 📝 Custom Scripts
- Modify the provided scripts for your specific needs
- Add logging and notification features
- Integrate with your monitoring systems

## 🆘 Troubleshooting

### Common Issues
1. **Permission denied**: Ensure proper GitHub token scopes
2. **Package not found**: Check package name spelling
3. **Version in use**: Some versions may be locked by deployments

### Getting Help
- Check GitHub's package documentation
- Review workflow logs for detailed error messages
- Test with `--dry-run` first to avoid accidents
