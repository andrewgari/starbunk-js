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

### 🏷️ Automatically Applied Labels
The system automatically applies labels based on file changes and PR characteristics:

**Container Labels**: `bunkbot`, `djcova`, `starbunk-dnd`, `covabot`, `snowbunk`, `shared-library`
**Change Type Labels**: `documentation`, `ci-cd`, `security`, `configuration`, `tests`, `database`, `performance`, `dependencies`
**Size Labels**: `small-change`, `medium-change`, `large-change`, `xl-change`, `small-pr`, `large-pr`
**Quality Labels**: `well-tested`, `needs-tests`, `breaking-change`, `hotfix`, `enhancement`, `bug`
**Status Labels**: `quality-gate-passed`, `quality-gate-failed`, `stale`, `archived-branch`

## Automated Workflows

### 🔒 Security & Dependencies (`.github/workflows/automated-dependency-updates.yml`)
- **Schedule**: Daily at 2 AM UTC
- **Triggers**: Security vulnerabilities, manual dispatch
- **Actions**: Creates PRs for dependency updates, security scanning
- **Notifications**: Creates issues for critical vulnerabilities

### 🏷️ Label Management (`.github/workflows/automated-label-management.yml`)
- **Triggers**: PR opened/updated, issues opened/edited
- **Actions**: Auto-assigns labels, requests reviewers, adds PR statistics
- **Intelligence**: Detects container changes, breaking changes, test coverage

### 📊 Code Quality Gates (`.github/workflows/code-quality-gates.yml`)
- **Triggers**: PR opened/updated, push to main
- **Checks**: Coverage thresholds, complexity analysis, security scanning
- **Reports**: Quality scores, performance analysis, security findings
- **Gates**: Configurable quality requirements (80% coverage, complexity <10)

### 🧹 Maintenance (`.github/workflows/stale-management.yml`)
- **Schedule**: Daily at 1 AM UTC
- **Actions**: Marks stale items, cleans up workflows, archives branches
- **Thresholds**: 14 days stale, 7 days to close, 60 days branch archive
- **Notifications**: Summary reports and tracking issues

### 📝 Changelog (`.github/workflows/changelog-generation.yml`)
- **Triggers**: Push to main, releases, manual dispatch
- **Actions**: Generates categorized changelogs from conventional commits
- **Features**: Contributor tracking, statistics, auto-PR creation
- **Format**: Markdown with links, emojis, and detailed sections

### 🚀 Versioning (`.github/workflows/semantic-versioning.yml`)
- **Triggers**: Push to main, manual dispatch
- **Analysis**: Conventional commit parsing for version determination
- **Actions**: Version bumps, Git tags, GitHub releases, container builds
- **Types**: Auto, patch, minor, major, prerelease with dry-run support

## Usage Instructions

### Code Reviews

1. **Start Reviews**:
   ```text
   Add the "review" label to your PR
   ```
   - Claude will provide automated code review
   - Code Rabbit (aicoderabbit) will be requested as reviewer

2. **Continue Reviews**:
   - Push new commits → Reviews continue automatically
   - Label remains → Reviews happen on each commit

3. **Stop Reviews**:
   ```text
   Remove the "review" label from your PR
   ```
   - No more automated reviews will be triggered

### Container Publishing

1. **Create Snapshots**:
   ```text
   Add the "publish" label to your PR
   ```
   - Snapshot containers created for changed containers only
   - Uses existing path-based optimization
   - Images tagged as `snapshot`

2. **Update Snapshots**:
   - Push new commits → New snapshots created automatically
   - Label remains → Snapshots updated on each commit

3. **Stop Publishing**:
   ```text
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
```text
1. Create PR
2. Add "review" label
3. Claude and Code Rabbit provide reviews
4. Make changes based on feedback
5. Push commits → Reviews continue
6. Remove "review" label when satisfied
```

### Example 2: Container Testing
```text
1. Create PR with container changes
2. Add "publish" label
3. Snapshot containers created
4. Test with: docker pull ghcr.io/andrewgari/container-name:snapshot
5. Push fixes → New snapshots created
6. Remove "publish" label when testing complete
```

### Example 3: Full Workflow
```text
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

## Advanced Automation Features

### 🤖 Automated Dependency Updates
- **Daily security scans**: Automatic vulnerability detection
- **Smart updates**: Patch, minor, major, and security-focused updates
- **Auto-PR creation**: Dependency updates create PRs automatically
- **Container-specific**: Updates each container independently
- **Security prioritization**: Critical/high vulnerabilities trigger immediate updates

### 🏷️ Intelligent Label Management
- **Auto-labeling**: Labels assigned based on file changes
- **Container detection**: Automatically labels affected containers
- **Change size analysis**: Small/medium/large/XL change labels
- **Test coverage tracking**: Well-tested vs needs-tests labels
- **Complexity analysis**: Automatic complexity assessment

### 📊 Code Quality Gates
- **Coverage thresholds**: Configurable test coverage requirements (default: 80%)
- **Complexity analysis**: Cyclomatic complexity monitoring (threshold: 10)
- **Security scanning**: SAST, dependency vulnerabilities, secret detection
- **Performance analysis**: Bundle size and memory usage tracking
- **Quality scoring**: 0-100 quality score with detailed metrics

### 🧹 Automated Maintenance
- **Stale management**: Auto-close inactive PRs/issues after 14+7 days
- **Workflow cleanup**: Remove old workflow runs (30+ days)
- **Branch archiving**: Archive inactive feature branches (60+ days)
- **Notification system**: Summary reports for maintenance actions

### 📝 Changelog Generation
- **Conventional commits**: Automatic parsing of commit messages
- **Categorized changes**: Features, fixes, breaking changes, etc.
- **Contributor tracking**: Automatic contributor attribution
- **Statistics**: Commit counts, file changes, contributor metrics
- **Auto-PR creation**: Changelog updates via pull requests

### 🚀 Semantic Versioning
- **Automatic versioning**: Based on conventional commit analysis
- **Release automation**: Auto-create GitHub releases
- **Container tagging**: Automatic container image versioning
- **Breaking change detection**: Smart major version bumps
- **Release notes**: Comprehensive auto-generated release notes

## Benefits

### Resource Efficiency
- **Reduced CI/CD usage**: Only runs when needed
- **Cost savings**: Fewer unnecessary builds
- **Faster feedback**: Focus resources on active development
- **Smart caching**: Docker layer and Node.js dependency caching
- **Parallel execution**: Optimized job matrices for faster builds

### Developer Control
- **Opt-in approach**: Choose when to use resources
- **Flexible workflow**: Use labels as needed
- **No disruption**: Existing workflows unchanged
- **Quality gates**: Configurable quality thresholds
- **Automated maintenance**: Hands-off repository management

### Maintained Functionality
- **Full feature set**: All existing capabilities preserved
- **Path optimization**: Smart container building continues
- **Backward compatibility**: No breaking changes
- **Enhanced automation**: Additional productivity features
- **Comprehensive monitoring**: Quality, security, and performance tracking
