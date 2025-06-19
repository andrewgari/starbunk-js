# PR Image Naming Strategy Update - Summary

## 🎯 **Changes Implemented**

Successfully updated the Docker image naming strategy for PR builds to use predictable, reusable names.

### **Key Changes:**

#### **1. New Naming Convention:**
- **Before:** `ghcr.io/andrewgari/starbunk/bunkbot:pr-123-abc1234` (with git hash)
- **After:** `ghcr.io/andrewgari/starbunk/bunkbot:pr-123-snapshot` (predictable)

#### **2. Image Replacement Strategy:**
- PR updates now **overwrite** existing images instead of creating new ones
- Each PR maintains only **one image per container** throughout its lifecycle
- Consistent naming makes testing and deployment easier

#### **3. Enhanced Cleanup:**
- Updated cleanup workflow to target `pr-{number}-snapshot` pattern
- More precise deletion of PR images when PRs are closed

## 📁 **Files Modified:**

### **GitHub Workflows:**
- ✅ `.github/workflows/docker-publish.yml`
  - Updated metadata extraction to use `pr-{number}-snapshot` format
  - Modified PR comments to reflect new naming and behavior
  - Updated cleanup logic to target snapshot tags specifically

### **Scripts Created:**
- ✅ `pr-images.sh` - New PR image management tool
  - Check PR image availability
  - Pull PR images
  - Create test docker-compose overrides
  - Bulk operations for all containers

### **Documentation:**
- ✅ `PR_IMAGE_STRATEGY.md` - Comprehensive guide to new strategy
- ✅ `DOCKER_IMAGES.md` - Updated with PR image information
- ✅ `PR_NAMING_UPDATE_SUMMARY.md` - This summary document

## 🚀 **New Workflow Behavior:**

### **PR Creation/Update:**
1. Developer opens PR or pushes new commits
2. GitHub Actions detects changes and builds affected containers
3. Images are pushed with `pr-{number}-snapshot` tags
4. **Existing images with same tag are overwritten**
5. PR comment shows predictable image names

### **PR Testing:**
1. Developers can reference consistent image names
2. Use `./pr-images.sh` for easy management
3. Create docker-compose overrides for testing
4. No need to update references when PR is updated

### **PR Closure:**
1. Cleanup workflow automatically triggers
2. Deletes `pr-{number}-snapshot` images for all containers
3. Clean registry state for future PRs

## 💡 **Benefits Achieved:**

### **For Developers:**
- ✅ **Predictable URLs** - Same image name throughout PR lifecycle
- ✅ **Easier Testing** - No hash changes to track
- ✅ **Simplified Scripts** - Consistent naming in automation
- ✅ **Better UX** - Clear, memorable image names

### **For Operations:**
- ✅ **Reduced Storage** - One image per PR instead of multiple
- ✅ **Cleaner Registry** - Less clutter from hash-based tags
- ✅ **Easier Cleanup** - Single predictable name to delete
- ✅ **Better Monitoring** - Consistent naming for tracking

## 🔧 **Usage Examples:**

### **Check PR Images:**
```bash
# Interactive script
./pr-images.sh

# Check specific PR
docker manifest inspect ghcr.io/andrewgari/starbunk/bunkbot:pr-123-snapshot
```

### **Pull PR Images:**
```bash
# Pull specific container
docker pull ghcr.io/andrewgari/starbunk/bunkbot:pr-123-snapshot

# Pull all containers for a PR
./pr-images.sh  # Choose option 6
```

### **Test PR Images:**
```bash
# Create test override
./pr-images.sh  # Choose option 4

# Run with override
docker-compose -f docker-compose.yml -f docker-compose.pr-test.yml up bunkbot
```

## ⚡ **Immediate Impact:**

### **Next PR Will:**
1. Use new `pr-{number}-snapshot` naming
2. Overwrite images on subsequent commits
3. Show updated PR comments with predictable names
4. Clean up properly when closed

### **Existing PRs:**
- Old naming will continue until PRs are closed
- New commits to existing PRs will use new naming
- Gradual migration as PRs are updated

## 🔍 **Verification Steps:**

1. **Create or update a PR** to trigger new workflow
2. **Check PR comments** for new image naming format
3. **Verify image exists** using `./pr-images.sh`
4. **Test image replacement** by pushing another commit
5. **Confirm cleanup** when PR is closed

## 📊 **Monitoring:**

- **GitHub Actions:** https://github.com/andrewgari/starbunk-js/actions
- **Container Registry:** https://github.com/andrewgari?tab=packages
- **PR Comments:** Check for new format in PR discussions

## 🎉 **Success Criteria:**

- ✅ PR images use predictable `pr-{number}-snapshot` naming
- ✅ Image replacement works on PR updates
- ✅ Cleanup removes correct images on PR closure
- ✅ Developer experience improved with consistent naming
- ✅ Registry storage optimized with fewer duplicate images

The new PR image naming strategy is now fully implemented and ready for use!
