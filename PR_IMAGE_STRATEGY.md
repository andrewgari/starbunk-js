# PR Docker Image Strategy

## 🎯 **New Predictable Naming Convention**

We've updated the PR image naming strategy to use predictable, reusable names instead of hash-based tags.

### **Before vs After:**

| Aspect | Old Strategy | New Strategy |
|--------|-------------|--------------|
| **Naming** | `pr-123-abc1234` (with git hash) | `pr-123-snapshot` (predictable) |
| **Updates** | Creates new image for each commit | Overwrites existing image |
| **Predictability** | Hash changes with each commit | Same name throughout PR lifecycle |
| **Cleanup** | Multiple images per PR to clean | Single image per PR to clean |

### **Example Image Names:**

```
ghcr.io/andrewgari/starbunk/bunkbot:pr-123-snapshot
ghcr.io/andrewgari/starbunk/djcova:pr-123-snapshot
ghcr.io/andrewgari/starbunk/starbunk-dnd:pr-123-snapshot
ghcr.io/andrewgari/starbunk/covabot:pr-123-snapshot
```

## 🔄 **Image Lifecycle:**

### **1. PR Creation/Update:**
- When a PR is opened or updated (new commits pushed)
- Workflow builds and pushes image with `pr-{number}-snapshot` tag
- **Overwrites** any existing image with the same tag
- Only one image exists per PR per container

### **2. PR Testing:**
- Developers can reference the same image name throughout PR lifecycle
- No need to update references when new commits are pushed
- Consistent naming makes testing and deployment easier

### **3. PR Closure:**
- When PR is closed or merged
- Cleanup workflow automatically deletes the `pr-{number}-snapshot` image
- Clean slate for future PRs

## 🚀 **Usage Examples:**

### **Pull a PR Image:**
```bash
# Pull specific container for PR 123
docker pull ghcr.io/andrewgari/starbunk/bunkbot:pr-123-snapshot

# Pull all containers for PR 123
./pr-images.sh  # Use option 6
```

### **Test with Docker Compose:**
```bash
# Create override file for testing
./pr-images.sh  # Use option 4

# Or manually create docker-compose.pr-test.yml:
version: '3.8'
services:
  bunkbot:
    image: ghcr.io/andrewgari/starbunk/bunkbot:pr-123-snapshot

# Test the PR image
docker-compose -f docker-compose.yml -f docker-compose.pr-test.yml up bunkbot
```

### **Check Image Availability:**
```bash
# Check if PR images exist
./pr-images.sh  # Use option 5

# Or manually
docker manifest inspect ghcr.io/andrewgari/starbunk/bunkbot:pr-123-snapshot
```

## 🛠️ **Management Tools:**

### **PR Images Script:**
```bash
./pr-images.sh
```

**Features:**
- Check if PR images exist
- Pull PR images
- Create test docker-compose overrides
- Bulk operations for all containers

### **GitHub Actions Integration:**
- **Automatic building** on PR updates
- **Predictable naming** in PR comments
- **Automatic cleanup** on PR closure
- **Smart caching** with consistent tags

## 📊 **Benefits:**

### **For Developers:**
1. **Predictable URLs** - Same image name throughout PR lifecycle
2. **Easier Testing** - No need to update references for new commits
3. **Simplified CI/CD** - Consistent naming in deployment scripts
4. **Better Caching** - Docker layers cached more effectively

### **For Operations:**
1. **Reduced Storage** - Only one image per PR instead of multiple
2. **Cleaner Registry** - Less clutter from hash-based tags
3. **Easier Cleanup** - Single predictable name to delete
4. **Better Monitoring** - Consistent naming for tracking

## 🔍 **Monitoring & Verification:**

### **Check PR Images:**
```bash
# Via script
./pr-images.sh

# Via GitHub web interface
https://github.com/andrewgari?tab=packages

# Via Docker CLI
docker manifest inspect ghcr.io/andrewgari/starbunk/bunkbot:pr-123-snapshot
```

### **GitHub Actions Logs:**
- Monitor builds: https://github.com/andrewgari/starbunk-js/actions
- Check PR comments for image availability
- Verify cleanup in closed PR workflows

## ⚠️ **Important Notes:**

1. **Image Replacement:** New commits overwrite existing PR images
2. **No History:** Previous commit images are not preserved
3. **Cleanup Required:** Images must be manually deleted if cleanup fails
4. **Naming Convention:** Always use `pr-{number}-snapshot` format
5. **Container Scope:** Each container has its own PR image

## 🔧 **Troubleshooting:**

### **Image Not Found:**
- Check if PR workflow completed successfully
- Verify PR number is correct
- Ensure container was changed in the PR

### **Pull Failures:**
- Authenticate with GHCR: `docker login ghcr.io`
- Check if image is public or you have access
- Verify image name spelling

### **Cleanup Issues:**
- Manually delete via GitHub web interface
- Check cleanup workflow logs
- Verify PR closure triggered cleanup

## 🚀 **Migration:**

The new strategy is now active for all new PRs. Existing PR images with old naming will be cleaned up naturally as PRs are closed or can be manually removed.
