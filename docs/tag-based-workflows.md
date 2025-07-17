# Tag-Based Workflow Triggering

This document explains the new tag-based triggering system for GitHub Actions workflows, implemented to provide opt-in code reviews and container publishing.

## Overview

The tag-based system allows developers to control when CI/CD resources are used by adding specific labels to pull requests. This reduces unnecessary resource consumption while maintaining full functionality.

## Available Labels

### 🏷️ `review` Label
**Purpose**: Triggers code review workflows  
**Workflows Affected**: `.github/workflows/claude-code-review.yml`

**Behavior**:
- **When Added**: Requests reviews from both Claude and Code Rabbit (aicoderabbit)
- **On Commits**: Continues reviewing new commits while label is present
- **When Removed**: Stops the review process

### 🏷️ `publish` Label
**Purpose**: Triggers container snapshot creation  
**Workflows Affected**: `.github/workflows/container-build-test-publish.yml`

**Behavior**:
- **When Added**: Creates snapshot container images for changed containers
- **On Commits**: Creates new snapshots for subsequent commits while label is present
- **When Removed**: Stops creating new snapshots
- **On PR Close**: Cleans up snapshot images (only if label was used)

## Usage Instructions

### Code Reviews

1. **Start Reviews**:
   ```
   Add the "review" label to your PR
   ```
   - Claude will provide automated code review
   - Code Rabbit (aicoderabbit) will be requested as reviewer

2. **Continue Reviews**:
   - Push new commits → Reviews continue automatically
   - Label remains → Reviews happen on each commit

3. **Stop Reviews**:
   ```
   Remove the "review" label from your PR
   ```
   - No more automated reviews will be triggered

### Container Publishing

1. **Create Snapshots**:
   ```
   Add the "publish" label to your PR
   ```
   - Snapshot containers created for changed containers only
   - Uses existing path-based optimization
   - Images tagged as `snapshot`

2. **Update Snapshots**:
   - Push new commits → New snapshots created automatically
   - Label remains → Snapshots updated on each commit

3. **Stop Publishing**:
   ```
   Remove the "publish" label from your PR
   ```
   - No new snapshots created for subsequent commits

4. **Automatic Cleanup**:
   - PR closed → Snapshot images automatically deleted
   - Only applies to PRs that used the "publish" label

## Technical Details

### Label Detection
- Uses GitHub Actions expression: `contains(github.event.pull_request.labels.*.name, 'label-name')`
- Triggers on events: `labeled`, `unlabeled`, `synchronize`

### Conditional Logic
- Job-level `if` conditions check for label presence
- Maintains backward compatibility with existing workflows
- Preserves all path-based conditional builds

### Resource Optimization
- **Path-based filtering**: Still only processes changed containers
- **Opt-in approach**: Resources used only when requested
- **Existing optimizations**: All current efficiency features preserved

## Migration Guide

### For Developers
- **No breaking changes**: Existing workflows continue to work
- **Opt-in system**: Add labels when you need the functionality
- **Same commands**: All existing development workflows unchanged

### For CI/CD
- **Main branch**: Unchanged behavior (continues publishing 'latest' tags)
- **Path filters**: All existing filters preserved
- **Optimization**: Container build optimization logic maintained

## Examples

### Example 1: Code Review Only
```
1. Create PR
2. Add "review" label
3. Claude and Code Rabbit provide reviews
4. Make changes based on feedback
5. Push commits → Reviews continue
6. Remove "review" label when satisfied
```

### Example 2: Container Testing
```
1. Create PR with container changes
2. Add "publish" label
3. Snapshot containers created
4. Test with: docker pull ghcr.io/andrewgari/container-name:snapshot
5. Push fixes → New snapshots created
6. Remove "publish" label when testing complete
```

### Example 3: Full Workflow
```
1. Create PR
2. Add both "review" and "publish" labels
3. Get code reviews AND container snapshots
4. Iterate based on feedback
5. Remove labels when ready
6. Merge PR
```

## Troubleshooting

### Reviews Not Triggering
- ✅ Check that "review" label is present
- ✅ Verify PR is not in draft mode
- ✅ Ensure workflow file is on the target branch

### Containers Not Building
- ✅ Check that "publish" label is present
- ✅ Verify container files have actually changed
- ✅ Check path filters in `.github/path-filters.yml`

### Cleanup Not Working
- ✅ Ensure PR had "publish" label when closed
- ✅ Check GitHub Actions permissions
- ✅ Verify container registry access

## Benefits

### Resource Efficiency
- **Reduced CI/CD usage**: Only runs when needed
- **Cost savings**: Fewer unnecessary builds
- **Faster feedback**: Focus resources on active development

### Developer Control
- **Opt-in approach**: Choose when to use resources
- **Flexible workflow**: Use labels as needed
- **No disruption**: Existing workflows unchanged

### Maintained Functionality
- **Full feature set**: All existing capabilities preserved
- **Path optimization**: Smart container building continues
- **Backward compatibility**: No breaking changes
