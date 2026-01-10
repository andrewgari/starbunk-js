# Version Management

This project uses a **single source of truth** for versioning to avoid duplication and sync issues.

## How It Works

### Single Source of Truth
- **`VERSION` file** contains the authoritative version number (e.g., `1.4.2`)
- All workspace packages (apps, shared, and root package.json) automatically sync their versions from this file
- **No CI/CD modifications** - CI/CD workflows do not modify package.json files

### Automatic Syncing

Version syncing happens automatically in two ways:

1. **Pre-commit hook** - When you commit changes, the `.husky/pre-commit` hook automatically:
   - Runs `sync-versions.sh` to sync VERSION to all package.json files
   - Stages any updated package.json files
   - This ensures package.json is always in sync with VERSION

2. **On npm install** - The `prepare` script runs `sync-versions.sh` when dependencies are installed

### Manual Version Updates

To update the version:

1. Edit the `VERSION` file with the new version (e.g., `1.5.0`)
2. Commit your changes - the pre-commit hook automatically syncs to all package.json files
3. That's it! No need to manually update any package.json files

## Version Update Workflow

### For Regular Development

1. **Update the VERSION file** - Simply change the version number in the VERSION file
2. **Commit** - The pre-commit hook automatically syncs to all package.json files
3. **Push** - Your changes are ready!

Example:
```bash
# Update the VERSION file
echo "1.5.0" > VERSION

# Commit - automatic sync happens via pre-commit hook
git add VERSION
git commit -m "chore(version): bump to v1.5.0"

# package.json files are automatically synced and committed!
```

### For Releases

When you're ready to create a release:

1. Update the VERSION file with the new version (typically increment minor version)
2. Commit and push to main
3. The release workflows will automatically create tags and GitHub releases

### When You Merge to Main

When a PR is merged to main, multiple automated processes occur:

#### Git Tagging (`publish-main.yml`)

The main branch is **automatically tagged** with:

1. **Version tag** (e.g., `v1.3.2`):
   - Based on the version in the `VERSION` file
   - Created only if the tag doesn't already exist
   - Follows semantic versioning format

2. **Latest tag** (`latest`):
   - Always points to the most recent commit on main
   - Force-updated on every merge
   - Useful for pulling the latest stable version

**Behavior:**
- Tags are created on **every merge to main**, regardless of whether container deployments occur
- If container deployments are triggered, tags are only created after successful deployment
- If deployments fail, no tags are created (to avoid tagging broken code)

#### Release Creation (`semantic-versioning.yml`)

The `semantic-versioning.yml` workflow automatically:

1. Checks the version in the `VERSION` file
2. Checks if a git tag already exists for this version
3. If no tag exists, creates a git tag (e.g., `v1.3.1`)
4. Creates a GitHub release with changelog
5. Triggers container builds

**Note:** Both workflows can create version tags, but they coordinate to avoid conflicts:
- `publish-main.yml` creates tags immediately on merge (if they don't exist)
- `semantic-versioning.yml` checks for existing tags and skips if already created
- This design ensures tags are created quickly while still allowing for formal GitHub releases with changelogs
- **Race condition handling**: In the unlikely event both workflows check for tag existence simultaneously, Git's atomic push operation ensures only one succeeds; the other will fail gracefully without breaking the workflow

## Manual Version Management

The VERSION file is the only file you need to edit for version changes:

```bash
# Update the VERSION file
echo "1.5.0" > VERSION

# Commit - the pre-commit hook automatically syncs to package.json files
git add VERSION
git commit -m "chore(version): bump to v1.5.0"

# Push your changes
git push
```

**Note:** You don't need to manually run `sync-versions` or stage package.json files - the pre-commit hook does this automatically!

## Conventional Commits

While automatic version bumping on PRs is disabled, you can still use conventional commit messages to document the type of changes:

- `fix: bug description` - Bug fixes
- `feat: new feature` - New features
- `feat!: breaking change` or `BREAKING CHANGE:` - Breaking changes
- `chore:`, `docs:`, `style:`, etc. - Other changes

When manually updating the VERSION file, follow semantic versioning:
- **Patch** (1.2.3 → 1.2.4) - Bug fixes, minor changes
- **Minor** (1.2.3 → 1.3.0) - New features, backward compatible
- **Major** (1.2.3 → 2.0.0) - Breaking changes

## Version Sync Script

The `scripts/sync-versions.sh` script:
- ✅ Reads version from the `VERSION` file
- ✅ Validates version format (X.Y.Z)
- ✅ Updates root `package.json`
- ✅ Updates all `apps/*/package.json` files
- ✅ Updates `packages/shared/package.json`
- ✅ Shows clear output of what was updated
- ✅ Skips packages that are already at the correct version
- ✅ Runs automatically via pre-commit hook

## Benefits

1. **Single Source of Truth**: Version is defined in VERSION file only
2. **No CI/CD Modifications**: CI/CD never modifies package.json files
3. **Automatic Syncing**: Pre-commit hook ensures package.json stays in sync
4. **Manual Control**: Developers explicitly control version updates
5. **Consistency**: All packages always have the same version
6. **Simple Updates**: Just edit VERSION file and commit
7. **Clear Audit Trail**: Easy to see what version each package is at
8. **Automatic Tagging**: Every merge to main is tagged for easy reference

## Using Git Tags

The automatic tagging system allows you to easily reference specific versions:

### Pull Latest Code
```bash
# Get the latest stable version
git fetch --tags
git checkout latest

# Or pull a specific version
git checkout v1.3.2
```

### Pull Container Images by Tag
```bash
# Pull the latest version
docker pull ghcr.io/andrewgari/bunkbot:latest

# Pull a specific version
docker pull ghcr.io/andrewgari/bunkbot:v1.3.2
```

### List All Version Tags
```bash
git tag -l "v*"
```

## Files Affected

- `VERSION` - **Source of truth** (single version number)
- `package.json` (root) - Synced from VERSION
- `apps/bunkbot/package.json` - Synced from VERSION
- `apps/covabot/package.json` - Synced from VERSION
- `apps/djcova/package.json` - Synced from VERSION
- `apps/bluebot/package.json` - Synced from VERSION
- `packages/shared/package.json` - Synced from VERSION

## Troubleshooting

### Versions are out of sync
Run the sync script:
```bash
npm run sync-versions
```

### CI/CD failing on version bump
Check that:
1. The VERSION file exists and has the correct version
2. The sync script is executable: `chmod +x scripts/sync-versions.sh`
3. All package.json files are valid JSON

