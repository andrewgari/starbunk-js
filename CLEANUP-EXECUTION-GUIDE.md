# GHCR Cleanup Execution Guide

This guide walks you through safely cleaning up your GitHub Container Registry images while preserving your protected production and PR testing images.

## 🛡️ Protected Images (Will NOT be deleted)

✅ **Production Images (Always Preserved):**
- `ghcr.io/andrewgari/bunkbot:latest`
- `ghcr.io/andrewgari/djcova:latest`
- `ghcr.io/andrewgari/starbunk-dnd:latest`
- `ghcr.io/andrewgari/covabot:latest`

✅ **Current PR Testing Images (Always Preserved):**
- Any images with tags matching `pr-*-snapshot` pattern
- Example: `ghcr.io/andrewgari/bunkbot:pr-123-snapshot`

## 🗑️ Target Images (Will be deleted)

❌ **Safe to Delete:**
- Untagged images (build artifacts)
- Images older than 30 days (except protected ones)
- Development/branch images (`main-abc1234`, `dev-*`, `test-*`)
- Old PR snapshots from closed PRs
- Duplicate or intermediate build artifacts

## 📋 Step-by-Step Execution

### Step 1: Prerequisites

```bash
# Ensure GitHub CLI is installed and authenticated
gh --version
gh auth status

# If not authenticated:
gh auth login
```

### Step 2: Make Script Executable

```bash
chmod +x cleanup-ghcr-safe.sh
```

### Step 3: Dry Run (REQUIRED FIRST STEP)

```bash
# Run dry-run to see what would be deleted
./cleanup-ghcr-safe.sh

# Or with custom age threshold (e.g., 14 days)
./cleanup-ghcr-safe.sh --days 14
```

**⚠️ IMPORTANT:** Review the dry-run output carefully before proceeding!

### Step 4: Review Dry Run Output

The script will categorize each image:

- 🛡️ **PROTECTED** - Will be kept (latest, pr-*-snapshot)
- 🗑️ **[WOULD DELETE]** - Marked for deletion
  - 🏷️ UNTAGGED - Untagged images
  - 📅 OLD - Images older than threshold
  - 🔧 DEV/BRANCH - Development images
- ✅ **[KEEPING]** - Recent non-protected images

### Step 5: Execute Cleanup (Only if dry-run looks correct)

```bash
# Execute the actual cleanup
./cleanup-ghcr-safe.sh --execute

# Or with custom age threshold
./cleanup-ghcr-safe.sh --execute --days 14
```

## 📊 Expected Output Example

```
🧹 Safe GHCR Container Image Cleanup
====================================

🔍 DRY RUN MODE - No images will be deleted
   Use --execute to actually delete images
📅 Age threshold: 30 days
📦 Containers: bunkbot djcova starbunk-dnd covabot

📦 Processing container: bunkbot
==================================================
  ✅ [KEEPING] 🛡️  PROTECTED - ID: 12345
      Tags: latest
      Age: 45 days - Reason: contains protected tag

  🗑️  [WOULD DELETE] 📅 OLD - ID: 12346
      Tags: main-abc1234
      Age: 35 days - Reason: older than 30 days

  ✅ [KEEPING] 🛡️  PROTECTED - ID: 12347
      Tags: pr-123-snapshot
      Age: 2 days - Reason: contains protected tag

  🗑️  [WOULD DELETE] 🏷️  UNTAGGED - ID: 12348
      Tags: <untagged>
      Age: 5 days - Reason: untagged image

📊 Container Summary for bunkbot:
   Processed: 4 versions
   Kept: 2 versions
   Would delete: 2 versions
```

## 🚨 Safety Checks

### Before Executing:

1. **Verify Protected Images**: Ensure all `latest` tags are marked as PROTECTED
2. **Check PR Snapshots**: Confirm active PR snapshots are marked as PROTECTED
3. **Review Old Images**: Make sure you don't need any of the OLD images
4. **Backup Plan**: Know how to rebuild images if needed

### Red Flags (Stop if you see these):

- ❌ `latest` tag marked for deletion
- ❌ Current PR snapshots marked for deletion
- ❌ Recently created images marked for deletion unexpectedly

## 🔧 Customization Options

### Adjust Age Threshold
```bash
# Delete images older than 14 days
./cleanup-ghcr-safe.sh --days 14

# Delete images older than 60 days (more conservative)
./cleanup-ghcr-safe.sh --days 60
```

### Help and Options
```bash
# See all available options
./cleanup-ghcr-safe.sh --help
```

## 📈 Monitoring Results

### During Execution:
- Watch for any error messages
- Note the number of images being deleted
- Verify protected images are being kept

### After Execution:
```bash
# Check remaining images
gh api /users/andrewgari/packages?package_type=container

# Verify specific container
gh api /users/andrewgari/packages/container/bunkbot/versions
```

## 🆘 Troubleshooting

### Common Issues:

1. **Permission Denied**
   ```bash
   # Ensure proper authentication
   gh auth refresh
   ```

2. **Package Not Found**
   - Check if package names are correct
   - Verify you have access to the packages

3. **API Rate Limits**
   - The script includes error handling
   - Wait a few minutes and retry if needed

### Recovery Options:

If you accidentally delete important images:

1. **Check CI/CD Cache**: Images might still be in GitHub Actions cache
2. **Rebuild from Source**: Use the original commit to rebuild
3. **Check Backups**: If you have any image backups

## ✅ Post-Cleanup Verification

### Verify Protected Images Still Exist:
```bash
# Check that latest images are still available
docker pull ghcr.io/andrewgari/bunkbot:latest
docker pull ghcr.io/andrewgari/djcova:latest
docker pull ghcr.io/andrewgari/starbunk-dnd:latest
docker pull ghcr.io/andrewgari/covabot:latest
```

### Test Your Applications:
```bash
# Test with Docker Compose
docker-compose up -d

# Test with Podman Compose
podman-compose up -d
```

## 📊 Expected Cleanup Results

Based on typical usage patterns, you should see:

- **Kept**: 4-8 images (latest + active PR snapshots)
- **Deleted**: 10-50+ images (depending on development activity)
- **Storage Saved**: Potentially several GB

## 🎯 Next Steps

After successful cleanup:

1. **Set up Automated Cleanup**: Use the provided GitHub Actions workflow
2. **Monitor Storage**: Keep an eye on package storage usage
3. **Regular Maintenance**: Run cleanup monthly or as needed

Remember: **Always run the dry-run first** to ensure you're comfortable with what will be deleted!
