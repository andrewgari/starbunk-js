# Docker Image Naming Convention Update

## 🔄 Changes Made

Updated all GitHub workflows and configuration files to use the new cleaner image naming convention.

### ✅ **New Image Names:**

| Service | Old Name | New Name |
|---------|----------|----------|
| BunkBot | `ghcr.io/andrewgari/starbunk-bunkbot:latest` | `ghcr.io/andrewgari/starbunk/bunkbot:latest` |
| DJCova | `ghcr.io/andrewgari/starbunk-djcova:latest` | `ghcr.io/andrewgari/starbunk/djcova:latest` |
| Starbunk-DND | `ghcr.io/andrewgari/starbunk-starbunk-dnd:latest` | `ghcr.io/andrewgari/starbunk/starbunk-dnd:latest` |
| CovaBot | `ghcr.io/andrewgari/starbunk-covabot:latest` | `ghcr.io/andrewgari/starbunk/covabot:latest` |

### 📁 **Files Updated:**

#### GitHub Workflows:
- `.github/workflows/docker-publish.yml` - PR image publishing
- `.github/workflows/ci.yml` - Main branch publishing  
- `.github/workflows/docker-build-reusable.yml` - Reusable build workflow
- `.github/workflows/manual-docker-build.yml` - Manual build workflow

#### Docker Configuration:
- `docker-compose.yml` - Production image references

#### Scripts:
- `start-production.sh` - Production startup script
- `start-containers.sh` - General startup script  
- `check-images.sh` - Image verification script

#### Documentation:
- `DOCKER_IMAGES.md` - Image documentation
- `DOCKER_TROUBLESHOOTING.md` - Troubleshooting guide

## 🚀 **Next Steps:**

### 1. Publish New Images
The workflows are now configured to publish with the new naming convention. Trigger a build:

```bash
# Option 1: Use the helper script
./publish-images.sh

# Option 2: Manual GitHub CLI
gh workflow run "Manual Docker Build and Push" \
  --field containers=all \
  --field tag_prefix=release \
  --field push_to_registry=true

# Option 3: Push to main branch
git add .
git commit -m "Update Docker image naming convention to starbunk/* format"
git push origin main
```

### 2. Clean Up Old Images (Optional)
After the new images are published and working, you can clean up the old images:

1. Go to https://github.com/andrewgari?tab=packages
2. Delete the old packages:
   - `starbunk-bunkbot`
   - `starbunk-djcova` 
   - `starbunk-starbunk-dnd`
   - `starbunk-covabot`

### 3. Verify New Setup
```bash
# Check if new images exist
./check-images.sh

# Start production containers with new images
./start-production.sh
```

## 🎯 **Benefits of New Naming:**

1. **Cleaner Organization**: All images under `starbunk/` namespace
2. **Consistent Naming**: No more mixed `starbunk-` prefixes
3. **Better Grouping**: Images appear together in GHCR
4. **Simpler References**: Shorter, more readable image names

## 🔍 **Verification:**

After publishing, the new images will be available at:
- https://github.com/andrewgari/starbunk-js/pkgs/container/starbunk%2Fbunkbot
- https://github.com/andrewgari/starbunk-js/pkgs/container/starbunk%2Fdjcova
- https://github.com/andrewgari/starbunk-js/pkgs/container/starbunk%2Fstarbunk-dnd
- https://github.com/andrewgari/starbunk-js/pkgs/container/starbunk%2Fcovabot

## ⚠️ **Important Notes:**

- The old images will continue to exist until manually deleted
- The new naming convention will be used for all future builds
- All scripts and documentation have been updated to use the new names
- The docker-compose.yml now references the new image names
