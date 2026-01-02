# Version Management

This project uses a **single source of truth** for versioning to avoid duplication and sync issues.

## How It Works

### Single Source of Truth
- **Root `package.json`** contains the authoritative version number
- All workspace packages (apps and shared) sync their versions from the root

### Automatic Syncing
The `scripts/sync-versions.sh` script automatically updates all package.json files to match the root version.

### Automatic PR Version Bumps
When you open a PR to `main`, the version is automatically bumped based on your conventional commits!

## Automated Workflow

### 1. When You Open a PR

The `pr-version-bump.yml` workflow automatically:

1. **Analyzes your commits** to determine the bump type:
   - `fix:` → patch bump (1.2.0 → 1.2.1)
   - `feat:` → minor bump (1.2.0 → 1.3.0)
   - `BREAKING CHANGE:` or `!:` → major bump (1.2.0 → 2.0.0)
   - No conventional commits → defaults to patch bump

2. **Bumps the version** in your PR branch:
   - Updates root `package.json`
   - Runs `sync-versions.sh` to update all packages
   - Commits the changes to your PR

3. **Comments on the PR** with the new version

### 2. When You Merge to Main

When a PR is merged to main, multiple automated processes occur:

#### Git Tagging (`publish-main.yml`)

The main branch is **automatically tagged** with:

1. **Version tag** (e.g., `v1.3.2`):
   - Based on the version in `package.json`
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

1. Checks the version in `package.json` (already bumped by the PR workflow)
2. Creates a git tag (e.g., `v1.3.1`)
3. Creates a GitHub release with changelog
4. Triggers container builds

**Note:** This workflow runs in addition to the automatic tagging in `publish-main.yml`. The `publish-main.yml` workflow handles immediate tagging on merge, while `semantic-versioning.yml` creates formal GitHub releases.

## Manual Version Bump

If you need to manually bump the version:

```bash
# 1. Update the root package.json version
npm version patch  # or minor, major
# or
npm version 1.3.2 --no-git-tag-version

# 2. Sync to all packages
npm run sync-versions

# 3. Commit the changes
git add package.json apps/*/package.json packages/shared/package.json
git commit -m "chore(version): bump to vX.Y.Z"
```

## Conventional Commits

Use conventional commit messages to control version bumping:

- `fix: bug description` - Patch release (1.2.0 → 1.2.1)
- `feat: new feature` - Minor release (1.2.0 → 1.3.0)
- `feat!: breaking change` or `BREAKING CHANGE:` - Major release (1.2.0 → 2.0.0)
- `chore:`, `docs:`, `style:`, etc. - Defaults to patch if no other conventional commits

## Version Sync Script

The `scripts/sync-versions.sh` script:
- ✅ Reads version from root `package.json`
- ✅ Updates all `apps/*/package.json` files
- ✅ Updates `packages/shared/package.json`
- ✅ Shows clear output of what was updated
- ✅ Skips packages that are already at the correct version

## Benefits

1. **No Duplication**: Version is defined in one place only
2. **Consistency**: All packages always have the same version
3. **Easy Updates**: One command syncs everything
4. **CI/CD Integration**: Automated in release workflow
5. **Clear Audit Trail**: Easy to see what version each package is at
6. **Automatic Tagging**: Every merge to main is tagged for easy reference

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

- `package.json` (root) - **Source of truth**
- `apps/bunkbot/package.json`
- `apps/covabot/package.json`
- `apps/djcova/package.json`
- `apps/starbunk-dnd/package.json`
- `packages/shared/package.json`

## Troubleshooting

### Versions are out of sync
Run the sync script:
```bash
npm run sync-versions
```

### CI/CD failing on version bump
Check that:
1. The root package.json has the correct version
2. The sync script is executable: `chmod +x scripts/sync-versions.sh`
3. All package.json files are valid JSON

